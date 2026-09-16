import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Hand, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { fetchDailyAgenda, saveDailyEntry } from "@/features/agenda/api/agenda-api";
import { fetchWeeklyAgenda, getWorkWeekDates } from "@/features/agenda/api/weekly-agenda-api";
import { MealCard } from "@/features/agenda/components/meal-card";
import { MealEntryDialog, type MealDraft } from "@/features/agenda/components/meal-entry-dialog";
import { MealIcon } from "@/features/agenda/components/meal-icon";
import { WaitPersonDialog } from "@/features/agenda/components/wait-person-dialog";
import { formatMealAvailability, type DailyMeal, type MealOccurrence, type MealType } from "@/features/agenda/model/meals";
import { emptyWeeklyAgenda, getWeeklyTime } from "@/features/agenda/model/weekly-agenda";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchGroupBySlug } from "@/features/groups/api/groups-api";
import { fetchMealWindows } from "@/features/groups/api/meal-windows-api";
import { defaultMealWindows, isTimeWithinWindow } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";
import { useGroupRealtime } from "@/shared/hooks/use-group-realtime";

const defaultTimes: Record<MealType, string> = { BREAKFAST: "08:00", LUNCH: "12:00", DINNER: "18:00" };

const weekDayNames = ["Seg", "Ter", "Qua", "Qui", "Sex"];

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function TodayPage({ groupSlug }: { groupSlug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const groupQuery = useQuery({ queryKey: ["groups", "slug", groupSlug], queryFn: () => fetchGroupBySlug(groupSlug) });
  const group = groupQuery.data;
  useGroupRealtime(group?.id);
  const currentDate = dateInTimezone(group?.timezone ?? "America/Sao_Paulo");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate ?? currentDate;
  const weekDates = useMemo(() => getWorkWeekDates(date), [date]);
  const agendaQuery = useQuery({ queryKey: ["daily-agenda", group?.id, date], queryFn: () => fetchDailyAgenda(group!.id, date, user!.id), enabled: Boolean(group && user) });
  const windowsQuery = useQuery({ queryKey: ["meal-windows", group?.id], queryFn: () => fetchMealWindows(group!.id), enabled: Boolean(group) });
  const weeklyQuery = useQuery({ queryKey: ["weekly-agenda", group?.id, weekDates[0]], queryFn: () => fetchWeeklyAgenda(group!.id, user!.id, weekDates), enabled: Boolean(group && user) });
  const meals = agendaQuery.data ?? [];
  const [draft, setDraft] = useState<MealDraft>({ mealType: "LUNCH", status: "CONFIRMED", time: "12:00", availableUntil: null });
  const mealWindows = windowsQuery.data ?? defaultMealWindows;
  const weeklyRows = weeklyQuery.data ?? emptyWeeklyAgenda;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [waitTarget, setWaitTarget] = useState<{ mealType: MealType; person: MealOccurrence } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const entryMutation = useMutation({
    mutationFn: saveDailyEntry,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["daily-agenda", group?.id, date] }); },
  });
  const pendingMeals = meals.filter((meal) => meal.mine?.status === "PLANNED");

  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", timeZone: group?.timezone ?? "America/Sao_Paulo",
  }).format(new Date(`${date}T12:00:00Z`));

  function moveDate(days: number) {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    setSelectedDate(next.toISOString().slice(0, 10));
  }

  function selectDate(nextDate: string) {
    setSelectedDate(nextDate === currentDate ? null : nextDate);
  }

  function openEditor(mealType: MealType = "LUNCH") {
    const existing = meals.find((meal) => meal.type === mealType)?.mine;
    const window = mealWindows.find((item) => item.mealType === mealType) ?? mealWindows[0];
    const time = existing?.time && isTimeWithinWindow(existing.time, window) ? existing.time : window.openTime;
    setDraft({
      mealType,
      status: existing?.status ?? "PLANNED",
      time: time ?? defaultTimes[mealType],
      availableUntil: existing?.availableUntil ?? null,
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
        availableUntil: existing?.availableUntil ?? null,
      });
      return;
    }
    setDraft(next);
  }

  async function saveEntry() {
    if (!group) return;
    await entryMutation.mutateAsync({ groupId: group.id, date, mealType: draft.mealType, status: draft.status, time: draft.status === "NOT_GOING" ? null : draft.time, availableUntil: draft.status === "NOT_GOING" ? null : draft.availableUntil });
    setIsDialogOpen(false);
    setNotice("Seu horário foi atualizado.");
  }

  async function confirmPlannedMeal(meal: DailyMeal) {
    if (!group || !meal.mine?.time) {
      openEditor(meal.type);
      return;
    }
    await entryMutation.mutateAsync({
      groupId: group.id,
      date,
      mealType: meal.type,
      status: "CONFIRMED",
      time: meal.mine.time,
      availableUntil: meal.mine.availableUntil ?? null,
    });
    setNotice(`${meal.label} confirmado para ${formatMealAvailability(meal.mine.time, meal.mine.availableUntil)}.`);
  }

  async function confirmWaiting() {
    if (!waitTarget || !group) return;
    await entryMutation.mutateAsync({ groupId: group.id, date, mealType: waitTarget.mealType, status: "PLANNED", time: null, availableUntil: null, waitingForUserId: waitTarget.person.id });
    setNotice(`Agora você está aguardando ${waitTarget.person.name}.`);
    setWaitTarget(null);
  }

  if (groupQuery.isLoading || agendaQuery.isLoading) return <AppShell groupSlug={groupSlug}><div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-black/45">Carregando agenda…</div></AppShell>;
  if (!group || groupQuery.error) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center"><Search aria-hidden="true" className="mx-auto size-10 text-[var(--tomato)]" /><h1 className="mt-5 font-serif text-3xl font-bold">Grupo não encontrado</h1><p className="mt-3 text-sm text-black/45">Você pode não fazer mais parte deste grupo.</p><Link to="/grupos" className="mt-6 inline-block rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">Ver meus grupos</Link></div></AppShell>;

  return (
    <AppShell groupSlug={group.slug}>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_340px] lg:py-12">
        <section>
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Agenda do grupo</p>
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{date === currentDate ? "Hoje" : "Agenda do dia"}</h1>
              <p className="mt-2 capitalize text-black/55">{selectedDateLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => moveDate(-1)} aria-label="Ver dia anterior" className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">←</button>{date !== currentDate && <button type="button" onClick={() => setSelectedDate(null)} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">Hoje</button>}<button type="button" onClick={() => moveDate(1)} aria-label="Ver próximo dia" className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold">→</button><button type="button" onClick={() => openEditor()} className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-black">+ Informar horário</button></div>
          </div>
          {notice && (
            <button type="button" onClick={() => setNotice(null)} className="mb-5 flex w-full items-center justify-between rounded-2xl bg-[var(--sage)] px-4 py-3 text-left text-sm font-semibold text-white">
              <span className="flex items-center gap-2"><Check aria-hidden="true" className="size-4" />{notice}</span><span aria-hidden="true">×</span>
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
              <Link to="/g/$groupSlug/agenda" params={{ groupSlug: group.slug }} className="text-sm font-bold text-[var(--tomato)]">Editar</Link>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {weekDates.map((weekDate, index) => (
                <div key={weekDate} className="text-center">
                  <button type="button" onClick={() => selectDate(weekDate)} aria-label={`Ver agenda de ${weekDayNames[index]}, dia ${weekDate.slice(-2)}`} aria-current={weekDate === date ? "date" : undefined} className={`w-full rounded-2xl py-2 transition hover:bg-[var(--peach)] ${weekDate === date ? "bg-[var(--lemon)] ring-2 ring-[var(--tomato)]/20" : "bg-[var(--cream)]"}`}>
                    <span className="block text-[10px] font-bold uppercase text-black/45">{weekDayNames[index]}</span><span className="text-lg font-extrabold">{weekDate.slice(-2)}</span>
                  </button>
                  <span className="mt-3 block w-full py-1 font-mono text-xs text-black/40">{getWeeklyTime(weeklyRows, "BREAKFAST", index)}</span>
                  <span className="mt-1 block w-full py-1 font-mono text-xs font-bold">{getWeeklyTime(weeklyRows, "LUNCH", index)}</span>
                  <span className="mt-1 block w-full py-1 font-mono text-xs text-black/40">{getWeeklyTime(weeklyRows, "DINNER", index)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-black/7 pt-4 text-xs text-black/45"><span className="flex items-center gap-1.5"><MealIcon mealType="BREAKFAST" className="size-3.5" />desjejum</span><span className="flex items-center gap-1.5"><MealIcon mealType="LUNCH" className="size-3.5" />almoço</span><span className="flex items-center gap-1.5"><MealIcon mealType="DINNER" className="size-3.5" />jantar</span></div>
            <p className="mt-3 text-[11px] text-black/35">Clique em um dia para abrir a agenda correspondente. Use “Editar” para alterar os horários da semana.</p>
          </section>
          <section className="rounded-[28px] bg-[var(--sage)] p-5 text-white shadow-[0_18px_50px_rgba(49,91,72,.18)]">
            {pendingMeals.length ? <Hand aria-hidden="true" className="size-8" /> : <Check aria-hidden="true" className="size-8" />}<h2 className="mt-3 text-xl font-bold">{pendingMeals.length ? `${pendingMeals.length} ${pendingMeals.length === 1 ? "horário para confirmar" : "horários para confirmar"}` : date === currentDate ? "Tudo confirmado por hoje" : "Tudo confirmado neste dia"}</h2>
            {pendingMeals.length ? (
              <div className="mt-4 space-y-2">
                {pendingMeals.map((meal) => (
                  <div key={meal.type} className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-bold"><MealIcon mealType={meal.type} className="size-4" />{meal.label}</p>
                        <p className="mt-0.5 font-mono text-sm text-white/80">{formatMealAvailability(meal.mine!.time, meal.mine!.availableUntil)}</p>
                        <p className="mt-1 text-xs text-white/60">{meal.mine!.waitingFor ? `Aguardando ${meal.mine!.waitingFor.name}` : meal.mine!.source === "ROUTINE" ? "Planejado pela sua rotina semanal" : "Planejamento deste dia"}</p>
                      </div>
                      <button type="button" onClick={() => confirmPlannedMeal(meal)} disabled={entryMutation.isPending} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[var(--sage)] disabled:opacity-50">{meal.mine!.time ? "Confirmar" : "Revisar"}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-2 text-sm leading-6 text-white/70">Não há horários planejados aguardando sua confirmação.</p>}
            <Link to="/g/$groupSlug/agenda" params={{ groupSlug: group.slug }} className="mt-5 block w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[var(--sage)]">Revisar minha semana</Link>
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
