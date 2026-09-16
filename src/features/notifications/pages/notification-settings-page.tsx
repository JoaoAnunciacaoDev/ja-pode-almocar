import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  defaultNotificationPreferences,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/features/notifications/api/notification-preferences-api";
import { AppShell } from "@/shared/components/app-shell";

const options: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
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
  const preferences = override ?? preferencesQuery.data ?? defaultNotificationPreferences;
  const saveMutation = useMutation({
    mutationFn: () => saveNotificationPreferences(user!.id, preferences),
    onSuccess: async () => {
      setOverride(null);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  function toggle(key: keyof NotificationPreferences) {
    saveMutation.reset();
    setOverride({ ...preferences, [key]: !preferences[key] });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/grupos" className="text-sm font-bold text-[var(--tomato)]">← Voltar para meus grupos</Link>
        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Sua conta</p>
          <h1 className="mt-2 font-serif text-4xl font-bold">Notificações</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Escolha os e-mails que deseja receber. Os horários seguem o fuso configurado em cada grupo do qual você participa.</p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_60px_rgba(42,35,28,.07)]">
          {options.map((option) => (
            <label key={option.key} className="flex cursor-pointer items-center justify-between gap-5 border-b border-black/7 p-5 last:border-b-0 sm:p-6">
              <span><span className="block font-extrabold">{option.title}</span><span className="mt-1 block text-sm leading-5 text-black/45">{option.description}</span></span>
              <input type="checkbox" checked={preferences[option.key]} onChange={() => toggle(option.key)} className="size-5 shrink-0 accent-[var(--tomato)]" />
            </label>
          ))}
        </div>

        {preferencesQuery.isLoading && <p className="mt-5 text-sm text-black/45">Carregando preferências…</p>}
        {(preferencesQuery.error || saveMutation.error) && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{preferencesQuery.error?.message || saveMutation.error?.message}</p>}
        {saveMutation.isSuccess && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white"><Check aria-hidden="true" className="size-4" />Preferências salvas.</p>}
        <button type="button" disabled={!override || saveMutation.isPending} onClick={() => saveMutation.mutate()} className="mt-6 w-full rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{saveMutation.isPending ? "Salvando…" : "Salvar preferências"}</button>
      </div>
    </AppShell>
  );
}
