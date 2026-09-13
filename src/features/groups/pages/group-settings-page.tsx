import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroups } from "@/features/groups/api/groups-api";
import { fetchMealWindows, saveMealWindows } from "@/features/groups/api/meal-windows-api";
import { getActiveGroup } from "@/features/groups/model/active-group";
import { defaultMealWindows, type MealWindow } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";

export function GroupSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const group = getActiveGroup(groupsQuery.data ?? []);
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const [windowsOverride, setWindowsOverride] = useState<MealWindow[] | null>(null);
  const windows = windowsOverride ?? windowsQuery.data ?? defaultMealWindows;
  const saveMutation = useMutation({
    mutationFn: () => saveMealWindows(group!.id, windows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal-windows", group?.id] }),
  });
  const hasInvalidRange = windows.some((window) => window.openTime >= window.closeTime);

  function updateWindow(mealType: MealWindow["mealType"], changes: Partial<MealWindow>) {
    saveMutation.reset();
    setWindowsOverride(windows.map((window) => window.mealType === mealType ? { ...window, ...changes } : window));
  }

  if (groupsQuery.isLoading || windowsQuery.isLoading) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Carregando configurações…</div></AppShell>;
  if (!group) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Crie um grupo primeiro</h1><Link to="/grupos/novo" className="mt-6 inline-block font-bold text-[var(--tomato)]">Criar grupo</Link></div></AppShell>;
  if (group.ownerId !== user?.id) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Apenas o proprietário pode configurar</h1><Link to="/" className="mt-6 inline-block font-bold text-[var(--tomato)]">Voltar para a agenda</Link></div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/" className="text-sm font-bold text-[var(--tomato)]">← Voltar para a agenda</Link>
        <div className="mt-6"><div className="flex items-center gap-2"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">{group.name}</p><span className="rounded-full bg-[var(--lemon)] px-2 py-1 text-[10px] font-extrabold uppercase">Proprietário</span></div><h1 className="mt-2 font-serif text-4xl font-bold">Horários do bandejão</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Defina quando cada refeição é servida. Todos os integrantes verão apenas horários dentro destes limites.</p></div>

        <div className="mt-8 space-y-4">
          {windows.map((window) => (
            <section key={window.mealType} className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_14px_45px_rgba(42,35,28,.06)]">
              <div className="grid gap-4 sm:grid-cols-[1fr_140px_140px_120px] sm:items-end">
                <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-black/40">Refeição</p><h2 className="mt-2 text-lg font-extrabold">{window.label}</h2></div>
                <label className="text-xs font-bold text-black/60">Abertura<input type="time" value={window.openTime} onChange={(event) => updateWindow(window.mealType, { openTime: event.target.value })} className="mt-2 block w-full rounded-xl border border-black/10 px-3 py-2 font-mono text-sm outline-none focus:border-[var(--tomato)]" /></label>
                <label className="text-xs font-bold text-black/60">Encerramento<input type="time" value={window.closeTime} onChange={(event) => updateWindow(window.mealType, { closeTime: event.target.value })} className="mt-2 block w-full rounded-xl border border-black/10 px-3 py-2 font-mono text-sm outline-none focus:border-[var(--tomato)]" /></label>
                <label className="text-xs font-bold text-black/60">Intervalo<select value={window.intervalMinutes} onChange={(event) => updateWindow(window.mealType, { intervalMinutes: Number(event.target.value) })} className="mt-2 block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--tomato)]">{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label>
              </div>
            </section>
          ))}
        </div>

        {hasInvalidRange && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">O encerramento precisa ser posterior à abertura.</p>}
        {(windowsQuery.error || saveMutation.error) && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{windowsQuery.error?.message || saveMutation.error?.message}</p>}
        {saveMutation.isSuccess && <p role="status" className="mt-5 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">✓ Limites atualizados para todo o grupo.</p>}
        <button type="button" onClick={() => saveMutation.mutate()} disabled={hasInvalidRange || saveMutation.isPending} className="mt-6 w-full rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{saveMutation.isPending ? "Salvando…" : "Salvar horários do grupo"}</button>
      </div>
    </AppShell>
  );
}
