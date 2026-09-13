import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { fetchDailyAgenda, saveDailyEntry } from "@/features/agenda/api/agenda-api";
import { fetchWeeklyAgenda, getWorkWeekDates, saveWeeklyAgenda as saveWeeklyAgendaRemote } from "@/features/agenda/api/weekly-agenda-api";
import { MealCard } from "@/features/agenda/components/meal-card";
import { MealEntryDialog, type MealDraft } from "@/features/agenda/components/meal-entry-dialog";
import { WaitPersonDialog } from "@/features/agenda/components/wait-person-dialog";
import { type MealOccurrence, type MealType } from "@/features/agenda/model/meals";
import { cycleWeeklyTime, defaultWeeklyAgenda, getWeeklyTime } from "@/features/agenda/model/weekly-agenda";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroups } from "@/features/groups/api/groups-api";
import { fetchMealWindows } from "@/features/groups/api/meal-windows-api";
import { getActiveGroup } from "@/features/groups/model/active-group";
import { defaultMealWindows, isTimeWithinWindow } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";

const defaultTimes: Record<MealType, string> = { BREAKFAST: "08:00", LUNCH: "12:00", DINNER: "18:00" };

const weekDayNames = ["Seg", "Ter", "Qua", "Qui", "Sex"];

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function TodayPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const group = getActiveGroup(groupsQuery.data ?? []);
  const weekDates = useMemo(() => getWorkWeekDates(), []);
  const date = dateInTimezone(group?.timezone ?? "America/Sao_Paulo");
  const agendaQuery = useQuery({ queryKey: ["daily-agenda", group?.id, date], queryFn: () => fetchDailyAgenda(group!.id, date, user!.id), enabled: Boolean(group && user) });
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const weeklyQuery = useQuery({ queryKey: ["weekly-agenda", group?.id, weekDates[0]], queryFn: () => fetchWeeklyAgenda(group!.id, user!.id, weekDates), enabled: Boolean(group && user) });
  const meals = agendaQuery.data ?? [];
  const [draft, setDraft] = useState<MealDraft>({ mealType: "LUNCH", status: "CONFIRMED", time: "12:00" });
  const mealWindows = windowsQuery.data ?? defaultMealWindows;
  const [weeklyRowsOverride, setWeeklyRowsOverride] = useState<typeof defaultWeeklyAgenda | null>(null);
  const weeklyRows = weeklyRowsOverride ?? weeklyQuery.data ?? defaultWeeklyAgenda;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [waitTarget, setWaitTarget] = useState<{ mealType: MealType; person: MealOccurrence } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const entryMutation = useMutation({
    mutationFn: saveDailyEntry,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["daily-agenda", group?.id, date] }); },
  });

  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo",
  }).format(new Date());

  function openEditor(mealType: MealType = "LUNCH") {
    const existing = meals.find((meal) => meal.type === mealType)?.mine;
    const window = mealWindows.find((item) => item.mealType === mealType) ?? mealWindows[0];
    const time = existing?.time && isTimeWithinWindow(existing.time, window) ? existing.time : window.openTime;
    setDraft({
      mealType,
      status: existing?.status ?? "PLANNED",
      time: time ?? defaultTimes[mealType],
    });
    setIsDialogOpen(true);
    setNotice(null);
  }

  function changeDraft(next: MealDraft) {
    if (next.mealType !== draft.mealType) {
      const existing = meals.find((meal) => meal.type === next.mealType)?.mine;
      const window = mealWindows.find((item) => item.mealType === next.mealType) ?? mealWindows[0];
      const time = existing?.time && isTimeWithinWindow(existing.time, window) ? existing.time : window.openTime;
      setDraft({
        mealType: next.mealType,
        status: existing?.status ?? "PLANNED",
        time: time ?? defaultTimes[next.mealType],
      });
      return;
    }
    setDraft(next);
  }

  async function saveEntry() {
    if (!group) return;
    await entryMutation.mutateAsync({ groupId: group.id, date, mealType: draft.mealType, status: draft.status, time: draft.status === "NOT_GOING" ? null : draft.time });
    setIsDialogOpen(false);
    setNotice("Seu horário foi atualizado.");
  }

  async function confirmWaiting() {
    if (!waitTarget || !group) return;
    await entryMutation.mutateAsync({ groupId: group.id, date, mealType: waitTarget.mealType, status: "PLANNED", time: null, waitingForUserId: waitTarget.person.id });
    setNotice(`Agora você está aguardando ${waitTarget.person.name}.`);
    setWaitTarget(null);
  }

  async function changeQuickWeekTime(mealType: MealType, dayIndex: number) {
    if (!group || !user) return;
    const nextRows = cycleWeeklyTime(weeklyRows, mealType, dayIndex, mealWindows);
    setWeeklyRowsOverride(nextRows);
    await saveWeeklyAgendaRemote(group.id, user.id, weekDates, nextRows);
    await queryClient.invalidateQueries({ queryKey: ["weekly-agenda", group.id] });
    setNotice("Horário semanal atualizado.");
  }

  if (groupsQuery.isLoading || agendaQuery.isLoading) return <AppShell><div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-black/45">Carregando agenda…</div></AppShell>;
  if (!group) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><p className="text-4xl">👥</p><h1 className="mt-5 font-serif text-3xl font-bold">Crie seu primeiro grupo</h1><p className="mt-3 text-sm text-black/45">Você precisa de um grupo para compartilhar horários.</p><Link to="/grupos/novo" className="mt-6 inline-block rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">Criar grupo</Link></div></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_340px] lg:py-12">
        <section>
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Agenda do grupo</p>
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">Hoje</h1>
              <p className="mt-2 capitalize text-black/55">{today}</p>
            </div>
            <button type="button" onClick={() => openEditor()} className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-black">+ Informar horário</button>
          </div>
          {notice && (
            <button type="button" onClick={() => setNotice(null)} className="mb-5 flex w-full items-center justify-between rounded-2xl bg-[var(--sage)] px-4 py-3 text-left text-sm font-semibold text-white">
              <span>✓ {notice}</span><span aria-hidden="true">×</span>
            </button>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {meals.map((meal) => (
              <MealCard
                key={meal.type}
                meal={meal}
                onEdit={() => openEditor(meal.type)}
                onWaitFor={(person) => setWaitTarget({ mealType: meal.type, person })}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)]">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Visão rápida</p><h2 className="mt-1 text-xl font-bold">Minha semana</h2></div>
              <Link to="/agenda" className="text-sm font-bold text-[var(--tomato)]">Editar</Link>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {weekDates.map((weekDate, index) => (
                <div key={weekDate} className="text-center">
                  <div className={`rounded-2xl py-2 ${index === 0 ? "bg-[var(--lemon)]" : "bg-[var(--cream)]"}`}>
                    <span className="block text-[10px] font-bold uppercase text-black/45">{weekDayNames[index]}</span><span className="text-lg font-extrabold">{weekDate.slice(-2)}</span>
                  </div>
                  <button type="button" onClick={() => changeQuickWeekTime("LUNCH", index)} aria-label={`Alterar almoço de ${weekDayNames[index]}`} className="mt-3 block w-full rounded-lg py-1 font-mono text-xs font-bold hover:bg-[var(--blush)] hover:text-[var(--tomato-dark)]">{getWeeklyTime(weeklyRows, "LUNCH", index)}</button>
                  <button type="button" onClick={() => changeQuickWeekTime("DINNER", index)} aria-label={`Alterar jantar de ${weekDayNames[index]}`} className="mt-1 block w-full rounded-lg py-1 font-mono text-xs text-black/40 hover:bg-[var(--blush)] hover:text-[var(--tomato-dark)]">{getWeeklyTime(weeklyRows, "DINNER", index)}</button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-5 border-t border-black/7 pt-4 text-xs text-black/45"><span>🍛 almoço</span><span>🌙 jantar</span></div>
            <p className="mt-3 text-[11px] text-black/35">Clique em um horário para avançar um intervalo.</p>
          </section>
          <section className="rounded-[28px] bg-[var(--sage)] p-5 text-white shadow-[0_18px_50px_rgba(49,91,72,.18)]">
            <p className="text-3xl">👋</p><h2 className="mt-3 text-xl font-bold">Faltam 2 confirmações</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">Avise o grupo se seus horários desta semana continuam valendo.</p>
            <Link to="/agenda" className="mt-5 block w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[var(--sage)]">Revisar minha semana</Link>
          </section>
        </aside>
      </div>
      {isDialogOpen && (
        <MealEntryDialog
          draft={draft}
          mealWindow={mealWindows.find((window) => window.mealType === draft.mealType) ?? mealWindows[0]}
          onChange={changeDraft}
          onClose={() => setIsDialogOpen(false)}
          onSave={saveEntry}
        />
      )}
      {waitTarget && (
        <WaitPersonDialog
          person={waitTarget.person}
          currentTime={meals.find((meal) => meal.type === waitTarget.mealType)?.mine?.time ?? null}
          onCancel={() => setWaitTarget(null)}
          onConfirm={confirmWaiting}
        />
      )}
    </AppShell>
  );
}
