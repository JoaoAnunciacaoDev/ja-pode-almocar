import { createClient } from "@supabase/supabase-js";
import { sendNotification, type VapidDetails } from "web-push-neo";
import {
  buildNotificationEmail,
  parseSender,
  type MealPerson,
  type NotificationType,
} from "../_shared/notification-email.ts";

type Delivery = {
  id: string;
  user_id: string;
  group_id: string;
  notification_type: NotificationType;
  local_date: string;
  attempt_count: number;
  recipient_name: string;
  recipient_email: string;
  group_name: string;
  group_slug: string;
  group_timezone: string;
  email_enabled?: boolean;
  push_enabled?: boolean;
};

type MealEntryRow = {
  user_id: string;
  time: string | null;
  available_until: string | null;
  status: "CONFIRMED" | "PLANNED" | "NOT_GOING";
  waiting_for_user_id: string | null;
};

type MealRoutineRow = {
  user_id: string;
  time: string;
  available_until: string | null;
};

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required notification environment variable: ${name}`);
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = requireEnv("BREVO_API_KEY");
const emailFrom = requireEnv("EMAIL_FROM");
const appUrl = requireEnv("APP_URL");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function tokensMatch(supplied: string, expected: string) {
  const encoder = new TextEncoder();
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(suppliedDigest);
  const right = new Uint8Array(expectedDigest);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function weekdayForDate(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function trimTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}

async function loadMealPeople(delivery: Delivery): Promise<MealPerson[]> {
  const mealType = delivery.notification_type === "DAILY_BREAKFAST_SUMMARY"
    ? "BREAKFAST"
    : delivery.notification_type === "DINNER_SUMMARY" ? "DINNER" : "LUNCH";
  const weekday = weekdayForDate(delivery.local_date);
  const [membersResult, entriesResult, routinesResult] = await Promise.all([
    supabase.from("group_members").select("user_id").eq("group_id", delivery.group_id),
    supabase.from("meal_entries")
      .select("user_id,time,available_until,status,waiting_for_user_id")
      .eq("group_id", delivery.group_id)
      .eq("date", delivery.local_date)
      .eq("meal_type", mealType),
    supabase.from("meal_routines")
      .select("user_id,time,available_until")
      .eq("group_id", delivery.group_id)
      .eq("weekday", weekday)
      .eq("meal_type", mealType)
      .lte("start_date", delivery.local_date)
      .gte("end_date", delivery.local_date),
  ]);

  const queryError = membersResult.error ?? entriesResult.error ?? routinesResult.error;
  if (queryError) throw queryError;

  const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
  if (!memberIds.length) return [];

  const profilesResult = await supabase.from("profiles").select("id,name").in("id", memberIds);
  if (profilesResult.error) throw profilesResult.error;

  const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.name]));
  const entries = new Map((entriesResult.data as MealEntryRow[] ?? []).map((entry) => [entry.user_id, entry]));
  const routines = new Map((routinesResult.data as MealRoutineRow[] ?? []).map((routine) => [routine.user_id, routine]));

  return memberIds.flatMap((userId) => {
    const entry = entries.get(userId);
    if (entry?.status === "NOT_GOING") return [];
    const routine = routines.get(userId);
    if (!entry && !routine) return [];

    return [{
      name: names.get(userId) ?? "Integrante",
      time: trimTime(entry ? entry.time : routine!.time),
      availableUntil: trimTime(entry ? entry.available_until : routine!.available_until),
      status: entry?.status === "CONFIRMED" ? "CONFIRMED" as const : "PLANNED" as const,
      waitingForName: entry?.waiting_for_user_id ? names.get(entry.waiting_for_user_id) ?? "outro integrante" : null,
    }];
  }).sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.name.localeCompare(b.name, "pt-BR"));
}

async function sendWithBrevo(delivery: Delivery) {
  const people = delivery.notification_type === "DAILY_BREAKFAST_SUMMARY" || delivery.notification_type === "DAILY_LUNCH_SUMMARY" || delivery.notification_type === "DINNER_SUMMARY"
    ? await loadMealPeople(delivery)
    : undefined;
  const email = buildNotificationEmail({
    type: delivery.notification_type,
    recipientName: delivery.recipient_name,
    groupName: delivery.group_name,
    localDate: delivery.local_date,
    appUrl,
    groupSlug: delivery.group_slug,
    people,
  });
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(emailFrom),
      to: [{ email: delivery.recipient_email, name: delivery.recipient_name }],
      subject: email.subject,
      htmlContent: email.html,
      tags: ["ja-pode-almocar", delivery.notification_type.toLowerCase()],
    }),
  });

  const responseBody = await response.json().catch(() => ({})) as { messageId?: string; message?: string; code?: string };
  if (!response.ok) throw new Error(responseBody.message ?? responseBody.code ?? `Brevo returned HTTP ${response.status}`);
  return responseBody.messageId ?? null;
}

function buildPushPayload(delivery: Delivery) {
  const todayUrl = `/g/${encodeURIComponent(delivery.group_slug)}/hoje`;
  const agendaUrl = `/g/${encodeURIComponent(delivery.group_slug)}/agenda`;

  if (delivery.notification_type === "WEEKLY_REVIEW") {
    return {
      title: "Já pode almoçar? 🗓️",
      body: `Revise sua semana em ${delivery.group_name} e combine seus horários.`,
      url: agendaUrl,
      tag: "weekly-review",
    };
  }

  if (delivery.notification_type === "PARTICIPATION_REMINDER") {
    return {
      title: "Já pode almoçar? 🍽️",
      body: `Confirme se o seu almoço de hoje em ${delivery.group_name} continua valendo.`,
      url: todayUrl,
      tag: "participation-reminder",
    };
  }

  const mealName = delivery.notification_type === "DAILY_BREAKFAST_SUMMARY"
    ? "desjejum"
    : delivery.notification_type === "DINNER_SUMMARY"
    ? "jantar"
    : "almoço";

  return {
    title: `Resumo do ${mealName} · ${delivery.group_name}`,
    body: `Confira quem estará disponível para o ${mealName} hoje.`,
    url: todayUrl,
    tag: delivery.notification_type.toLowerCase(),
  };
}

async function sendPushToSubscriptions(
  userId: string,
  payload: { title: string; body: string; url: string; tag?: string },
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  let vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@example.com";
  if (vapidSubject && !vapidSubject.startsWith("mailto:") && !vapidSubject.startsWith("https://") && !vapidSubject.startsWith("http://")) {
    vapidSubject = `mailto:${vapidSubject}`;
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("VAPID keys missing in environment variables!");
    return { error: "Chaves VAPID não configuradas no servidor." };
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,user_agent")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching push subscriptions", error);
    return { error: error.message };
  }

  if (!subscriptions?.length) {
    return { count: 0, message: "Nenhum dispositivo cadastrado para este usuário." };
  }

  const pushPayload = JSON.stringify(payload);
  const vapidDetails: VapidDetails = {
    subject: vapidSubject,
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey,
  };

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const response = await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload,
          { vapidDetails, TTL: 3600, urgency: "high" },
        );

        return {
          id: sub.id,
          endpoint: sub.endpoint.slice(0, 50) + "...",
          status: response.statusCode,
          success: true,
        };
      } catch (pushError: unknown) {
        console.error("Push delivery failed for subscription", sub.id, pushError);
        const err = pushError as { statusCode?: number; status?: number; message?: string; body?: string };
        const statusCode = err?.statusCode ?? err?.status;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        return {
          id: sub.id,
          endpoint: sub.endpoint.slice(0, 50) + "...",
          statusCode,
          error: err?.message ?? String(pushError),
          body: err?.body,
          success: false,
        };
      }
    }),
  );

  return { count: subscriptions.length, results };
}

async function sendPushNotifications(delivery: Delivery) {
  const payload = buildPushPayload(delivery);
  await sendPushToSubscriptions(delivery.user_id, payload);
}

async function markSent(delivery: Delivery, providerMessageId: string | null) {
  const { error } = await supabase.from("notification_deliveries").update({
    status: "SENT",
    provider_message_id: providerMessageId,
    sent_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", delivery.id);
  if (error) throw error;
}

async function markFailed(delivery: Delivery, error: unknown) {
  const retryMinutes = Math.min(60, 5 * (2 ** Math.max(0, delivery.attempt_count - 1)));
  const nextAttemptAt = new Date(Date.now() + retryMinutes * 60_000).toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const { error: updateError } = await supabase.from("notification_deliveries").update({
    status: "FAILED",
    last_error: message.slice(0, 1000),
    next_attempt_at: nextAttemptAt,
  }).eq("id", delivery.id);
  if (updateError) console.error("Could not record notification failure", delivery.id, updateError.message);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const suppliedCronToken = request.headers.get("x-cron-token");
  const authHeader = request.headers.get("Authorization");
  let callerUserId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: userData } = await supabase.auth.getUser(token);
    if (userData?.user) {
      callerUserId = userData.user.id;
    }
  }

  const { data: config } = await supabase
    .from("notification_dispatch_config")
    .select("cron_token")
    .eq("singleton", true)
    .single();

  const isCronAuthorized = Boolean(
    suppliedCronToken &&
    config?.cron_token &&
    (await tokensMatch(suppliedCronToken, config.cron_token))
  );

  // Endpoint para teste direto de push pelo frontend ou cron/admin
  if (body.action === "test_push") {
    const targetUserId = (isCronAuthorized && typeof body.user_id === "string" ? body.user_id : callerUserId);
    if (!targetUserId) {
      return Response.json({ error: "Não autorizado para enviar push de teste." }, { status: 401, headers: corsHeaders });
    }

    const testPayload = {
      title: "Já pode almoçar? 🔔",
      body: "Notificação de teste recebida com sucesso no seu dispositivo!",
      url: "/",
      tag: "test-push",
    };

    const pushResult = await sendPushToSubscriptions(targetUserId, testPayload);
    return Response.json({ success: true, ...pushResult }, { headers: corsHeaders });
  }

  if (!isCronAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const { data, error } = await supabase.rpc("claim_due_notification_deliveries", { batch_size: 50 });
  if (error) {
    console.error("Could not claim notification deliveries", error.message);
    return Response.json({ error: "Could not claim notifications" }, { status: 500, headers: corsHeaders });
  }

  const deliveries = (data ?? []) as Delivery[];
  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    try {
      let providerMessageId: string | null = null;

      if (delivery.email_enabled ?? true) {
        providerMessageId = await sendWithBrevo(delivery);
      }

      if (delivery.push_enabled) {
        await sendPushNotifications(delivery);
      }

      await markSent(delivery, providerMessageId);
      sent += 1;
    } catch (deliveryError) {
      console.error("Notification delivery failed", delivery.id, deliveryError);
      await markFailed(delivery, deliveryError);
      failed += 1;
    }
  }

  return Response.json({ claimed: deliveries.length, sent, failed }, { headers: corsHeaders });
});