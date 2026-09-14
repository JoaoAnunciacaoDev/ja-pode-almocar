import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { fetchWeeklyAgenda, getWorkWeekDates, saveWeeklyAgenda } from "@/features/agenda/api/weekly-agenda-api";
import { cycleWeeklyTime, emptyWeeklyAgenda, type WeeklyAgendaRow } from "@/features/agenda/model/weekly-agenda";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroupBySlug } from "@/features/groups/api/groups-api";
import { fetchMealWindows } from "@/features/groups/api/meal-windows-api";
import { defaultMealWindows } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";
import { useGroupRealtime } from "@/shared/hooks/use-group-realtime";

const dayNames = ["SEG", "TER", "QUA", "QUI", "SEX"];

export function WeeklyAgendaPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dates = useMemo(() => getWorkWeekDates(), []);
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  useGroupRealtime(group?.id);
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const weekQuery = useQuery({ queryKey: ["weekly-agenda", group?.id, dates[0]], queryFn: () => fetchWeeklyAgenda(group!.id, user!.id, dates), enabled: Boolean(group && user) });
  const [rowsOverride, setRowsOverride] = useState<WeeklyAgendaRow[] | null>(null);
  const rows = rowsOverride ?? weekQuery.data ?? emptyWeeklyAgenda;
  const windows = windowsQuery.data ?? defaultMealWindows;
  const saveMutation = useMutation({
    mutationFn: () => saveWeeklyAgenda(group!.id, user!.id, dates, rows),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly-agenda", group?.id] }),
        queryClient.invalidateQueries({ queryKey: ["daily-agenda", group?.id] }),
      ]);
    },
  });

  function cycleTime(rowIndex: number, columnIndex: number) {
    saveMutation.reset();
    setRowsOverride(cycleWeeklyTime(rows, rows[rowIndex].mealType, columnIndex, windows));
  }

  if (groupQuery.isLoading || weekQuery.isLoading) return <AppShell groupSlug={groupSlug}><div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-black/45">Carregando sua semana…</div></AppShell>;
  if (!group || groupQuery.error) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-serif text-3xl font-bold">Grupo não encontrado</h1><Link to="/grupos" className="mt-6 inline-block font-bold text-[var(--tomato)]">Ver meus grupos</Link></div></AppShell>;

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <Link to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} className="text-sm font-bold text-[var(--tomato)]">← Voltar para hoje</Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">{group.name}</p><h1 className="mt-2 font-serif text-4xl font-bold">Minha semana</h1></div>
          <div className="flex flex-wrap gap-2"><Link to="/g/$groupSlug/rotinas" params={{ groupSlug: group.slug }} className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-bold">Editar rotinas</Link><button disabled={saveMutation.isPending} type="button" onClick={() => saveMutation.mutate()} className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">{saveMutation.isPending ? "Salvando…" : "Salvar alterações"}</button></div>
        </div>
        {saveMutation.isSuccess && <p role="status" className="mt-5 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">✓ Alterações salvas no grupo.</p>}
        {(weekQuery.error || saveMutation.error) && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{weekQuery.error?.message || saveMutation.error?.message}</p>}
        <p className="mt-5 text-sm text-black/50">Clique em um horário para alterá-lo. As opções respeitam os limites definidos pelo proprietário; “—” indica que você não irá.</p>
        <div className="mt-8 overflow-x-auto rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
          <div className="grid min-w-[680px] grid-cols-[160px_repeat(5,1fr)] gap-2">
            <div />
            {dates.map((date, index) => <div key={date} className="rounded-xl bg-[var(--cream)] px-3 py-3 text-center text-xs font-extrabold">{dayNames[index]} {date.slice(-2)}</div>)}
            {rows.flatMap((row, rowIndex) => [
              <div key={`${row.meal}-label`} className="flex items-center font-bold">{row.meal}</div>,
              ...row.values.map((value, index) => <button type="button" onClick={() => cycleTime(rowIndex, index)} key={`${row.meal}-${index}`} aria-label={`${row.meal}, alterar horário de ${value}`} className="rounded-xl border border-black/8 px-3 py-4 font-mono text-sm font-bold hover:border-[var(--tomato)] hover:bg-[var(--blush)]">{value}</button>),
            ])}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
