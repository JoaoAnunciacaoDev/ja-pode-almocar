import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroupBySlug, updateGroup } from "@/features/groups/api/groups-api";
import { fetchMealWindows, saveMealWindows } from "@/features/groups/api/meal-windows-api";
import { defaultMealWindows, type MealWindow } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";
import { inputClassName } from "@/shared/components/form-styles";
import { useGroupRealtime } from "@/shared/hooks/use-group-realtime";

export function GroupSettingsPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  useGroupRealtime(group?.id);
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const [windowsOverride, setWindowsOverride] = useState<MealWindow[] | null>(null);
  const windows = windowsOverride ?? windowsQuery.data ?? defaultMealWindows;
  const saveMutation = useMutation({
    mutationFn: () => saveMealWindows(group!.id, windows),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal-windows", group?.id] }),
  });
  const hasInvalidRange = windows.some((window) => window.openTime >= window.closeTime);
  const detailsMutation = useMutation({
    mutationFn: (values: { name: string; institution: string; timezone: string }) => updateGroup(group!.id, values),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["groups"] }); },
  });

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    detailsMutation.mutate({ name: String(data.get("name")), institution: String(data.get("institution")), timezone: String(data.get("timezone")) });
  }

  function updateWindow(mealType: MealWindow["mealType"], changes: Partial<MealWindow>) {
    saveMutation.reset();
    setWindowsOverride(windows.map((window) => window.mealType === mealType ? { ...window, ...changes } : window));
  }

  if (groupQuery.isLoading || windowsQuery.isLoading) return <AppShell groupSlug={groupSlug}><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Carregando configurações…</div></AppShell>;
  if (!group || groupQuery.error) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Grupo não encontrado</h1><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Ver meus grupos</Link></div></AppShell>;
  if (group.ownerId !== user?.id) return <AppShell groupSlug={group.slug}><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Apenas o proprietário pode configurar</h1><Link to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} className="mt-6 inline-block font-bold text-[var(--tomato)]">Voltar para a agenda</Link></div></AppShell>;

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} className="text-sm font-bold text-[var(--tomato)]">← Voltar para a agenda</Link>
        <div className="mt-6"><div className="flex items-center gap-2"><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">{group.name}</p><span className="rounded-full bg-[var(--lemon)] px-2 py-1 text-[10px] font-extrabold uppercase">Proprietário</span></div><h1 className="mt-2 font-serif text-4xl font-bold">Horários do bandejão</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Defina quando cada refeição é servida. Todos os integrantes verão apenas horários dentro destes limites.</p></div>

        <form onSubmit={saveDetails} className="mt-8 rounded-[24px] border border-black/8 bg-white p-6 shadow-[0_14px_45px_rgba(42,35,28,.06)]">
          <div><h2 className="text-xl font-extrabold">Dados do grupo</h2><p className="mt-1 text-sm text-black/45">O endereço <span className="font-mono">/g/{group.slug}</span> continuará o mesmo após renomear.</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Nome<input name="name" defaultValue={group.name} maxLength={100} required className={inputClassName} /></label><label className="text-sm font-bold">Instituição<input name="institution" defaultValue={group.institution} maxLength={120} required className={inputClassName} /></label></div>
          <label className="mt-4 block text-sm font-bold">Fuso horário<select name="timezone" defaultValue={group.timezone} className={inputClassName}><option value="America/Sao_Paulo">Brasília (São Paulo)</option><option value="America/Manaus">Manaus</option><option value="America/Cuiaba">Cuiabá</option><option value="America/Recife">Recife</option><option value="America/Fortaleza">Fortaleza</option><option value="America/Belem">Belém</option><option value="America/Rio_Branco">Rio Branco</option><option value="America/Noronha">Fernando de Noronha</option></select></label>
          {detailsMutation.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{detailsMutation.error.message}</p>}{detailsMutation.isSuccess && <p role="status" className="mt-4 rounded-xl bg-[var(--sage)] p-3 text-sm font-semibold text-white">✓ Dados do grupo atualizados.</p>}
          <button disabled={detailsMutation.isPending} className="mt-5 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{detailsMutation.isPending ? "Salvando…" : "Salvar dados do grupo"}</button>
        </form>

        <div className="mt-8"><h2 className="mb-4 text-2xl font-extrabold">Horários do bandejão</h2><div className="space-y-4">
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
        </div></div>

        {hasInvalidRange && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">O encerramento precisa ser posterior à abertura.</p>}
        {(windowsQuery.error || saveMutation.error) && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{windowsQuery.error?.message || saveMutation.error?.message}</p>}
        {saveMutation.isSuccess && <p role="status" className="mt-5 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">✓ Limites atualizados para todo o grupo.</p>}
        <button type="button" onClick={() => saveMutation.mutate()} disabled={hasInvalidRange || saveMutation.isPending} className="mt-6 w-full rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">{saveMutation.isPending ? "Salvando…" : "Salvar horários do grupo"}</button>
      </div>
    </AppShell>
  );
}
