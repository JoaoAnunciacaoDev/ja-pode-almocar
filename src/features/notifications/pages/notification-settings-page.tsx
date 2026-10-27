import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Bell, Check, Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  defaultNotificationPreferences,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/features/notifications/api/notification-preferences-api";
import {
  deletePushSubscription,
  savePushSubscription,
} from "@/features/notifications/api/push-subscriptions-api";
import {
  getCurrentPushSubscription,
  getPushPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/features/notifications/utils/push-manager";
import { AppShell } from "@/shared/components/app-shell";

const mealOptions: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
  { key: "weeklyReviewEnabled", title: "Revisão semanal", description: "Domingos, às 17h30: confira os horários da próxima semana." },
  { key: "dailyBreakfastSummaryEnabled", title: "Resumo do desjejum", description: "Todos os dias, às 6h30: participantes e horários combinados." },
  { key: "dailyLunchSummaryEnabled", title: "Resumo do almoço", description: "Todos os dias, às 10h30: participantes e horários combinados." },
  { key: "participationReminderEnabled", title: "Confirmação de participação", description: "Às 8h30: confirme planejamentos de almoço que ainda não foram confirmados." },
  { key: "dinnerSummaryEnabled", title: "Resumo do jantar", description: "Todos os dias, às 16h30: participantes e horários combinados." },
];

export function NotificationSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: Boolean(user),
  });

  const [override, setOverride] = useState<NotificationPreferences | null>(null);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean | null>(null);

  const preferences = override ?? preferencesQuery.data ?? defaultNotificationPreferences;
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!pushSupported) return;
    getCurrentPushSubscription().then((sub) => {
      setDeviceSubscribed(Boolean(sub));
    });
  }, [pushSupported]);

  const saveMutation = useMutation({
    mutationFn: (newPreferences: NotificationPreferences) => saveNotificationPreferences(user!.id, newPreferences),
    onSuccess: async () => {
      setOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  function toggleTopic(key: keyof NotificationPreferences) {
    saveMutation.reset();
    setPushStatusMessage(null);
    setOverride({ ...preferences, [key]: !preferences[key] });
  }

  function toggleEmail() {
    saveMutation.reset();
    setPushStatusMessage(null);
    setOverride({ ...preferences, emailEnabled: !preferences.emailEnabled });
  }

  async function handleTogglePush() {
    saveMutation.reset();
    setPushStatusMessage(null);

    if (!pushSupported) {
      setPushStatusMessage("Este navegador não suporta notificações push nativas.");
      return;
    }

    const currentPermission = getPushPermission();
    if (currentPermission === "denied") {
      setPushStatusMessage("As notificações estão bloqueadas nas permissões do seu navegador. Habilite-as nas configurações do site.");
      return;
    }

    const willEnable = !preferences.pushEnabled;
    setIsPushLoading(true);

    try {
      if (willEnable) {
        if (!vapidPublicKey) {
          throw new Error("Chave VAPID não configurada no ambiente (VITE_VAPID_PUBLIC_KEY).");
        }
        const subscription = await subscribeToPush(vapidPublicKey);
        await savePushSubscription(user!.id, subscription.toJSON());
        setDeviceSubscribed(true);
        setPushStatusMessage("Este dispositivo foi registrado para receber notificações push.");
        setOverride({ ...preferences, pushEnabled: true });
      } else {
        const sub = await getCurrentPushSubscription();
        if (sub) {
          await deletePushSubscription(sub.endpoint).catch(() => {});
          await unsubscribeFromPush().catch(() => {});
        }
        setDeviceSubscribed(false);
        setPushStatusMessage("Notificações push desativadas neste dispositivo.");
        setOverride({ ...preferences, pushEnabled: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao configurar notificações push.";
      setPushStatusMessage(message);
    } finally {
      setIsPushLoading(false);
    }
  }

  const noChannelActive = !preferences.emailEnabled && !preferences.pushEnabled;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Voltar para meus grupos</Link>
        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Sua conta</p>
          <h1 className="mt-2 font-serif text-4xl font-bold">Notificações</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
            Escolha como e quando deseja receber os avisos. Os horários seguem o fuso configurado em cada grupo do qual você participa.
          </p>
        </div>

        {/* Seção 1: Canais de Notificação */}
        <div className="mt-8">
          <h2 className="text-base font-bold text-black/80">Canais de entrega</h2>
          <p className="mt-1 text-sm text-black/50">Por onde você quer ser avisado.</p>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            {/* Canal E-mail */}
            <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-black/7 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--sand)] text-black/70">
                  <Mail className="size-5" />
                </div>
                <div>
                  <span className="block font-extrabold">E-mail</span>
                  <span className="mt-1 block text-sm leading-5 text-black/45">
                    Receba resumos e confirmações no seu e-mail cadastrado.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={toggleEmail}
                className="size-5 shrink-0 accent-[var(--tomato)]"
              />
            </label>

            {/* Canal Push */}
            <label className="flex cursor-pointer items-center justify-between gap-5 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--sand)] text-black/70">
                  <Bell className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="block font-extrabold">Notificações Push</span>
                    {deviceSubscribed && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Dispositivo ativo
                      </span>
                    )}
                  </div>
                  <span className="mt-1 block text-sm leading-5 text-black/45">
                    Alertas instantâneos no navegador ou celular (mesmo com a aba fechada).
                  </span>
                  {!pushSupported && (
                    <span className="mt-2 block text-xs font-medium text-amber-700">
                      Navegador sem suporte a Web Push nativo.
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                disabled={isPushLoading || !pushSupported}
                onChange={handleTogglePush}
                className="size-5 shrink-0 accent-[var(--tomato)] disabled:opacity-40"
              />
            </label>
          </div>

          {pushStatusMessage && (
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-black/70">
              <AlertCircle className="size-4 shrink-0 text-[var(--tomato)]" />
              {pushStatusMessage}
            </p>
          )}

          {noChannelActive && (
            <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Atenção: com ambos os canais desativados, você não receberá nenhuma notificação.
            </p>
          )}
        </div>

        {/* Seção 2: Tipos de Refeição e Avisos */}
        <div className="mt-10">
          <h2 className="text-base font-bold text-black/80">Tipos de avisos</h2>
          <p className="mt-1 text-sm text-black/50">Quais momentos você quer acompanhar.</p>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            {mealOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center justify-between gap-5 border-b border-black/7 p-5 last:border-b-0 sm:p-6"
              >
                <span>
                  <span className="block font-extrabold">{option.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-black/45">{option.description}</span>
                </span>
                <input
                  type="checkbox"
                  checked={preferences[option.key]}
                  onChange={() => toggleTopic(option.key)}
                  className="size-5 shrink-0 accent-[var(--tomato)]"
                />
              </label>
            ))}
          </div>
        </div>

        {preferencesQuery.isLoading && <p className="mt-5 text-sm text-black/45">Carregando preferências…</p>}
        {(preferencesQuery.error || saveMutation.error) && (
          <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {preferencesQuery.error?.message || saveMutation.error?.message}
          </p>
        )}
        {saveMutation.isSuccess && (
          <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">
            <Check aria-hidden="true" className="size-4" />
            Preferências salvas com sucesso.
          </p>
        )}

        <button
          type="button"
          disabled={!override || saveMutation.isPending}
          onClick={() => saveMutation.mutate(preferences)}
          className="mt-6 w-full rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {saveMutation.isPending ? "Salvando…" : "Salvar preferências"}
        </button>
      </div>
    </AppShell>
  );
}
