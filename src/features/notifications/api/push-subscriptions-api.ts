import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
};

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionJSON,
  userAgent: string = navigator.userAgent,
) {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Assinatura de push incompleta.");
  }

  const { error } = await requireSupabaseClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
      },
      { onConflict: "endpoint" },
    );

  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string) {
  const { error } = await requireSupabaseClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw error;
}

export async function fetchUserPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await requireSupabaseClient()
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,user_agent,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
