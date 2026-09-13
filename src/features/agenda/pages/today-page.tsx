import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { MealCard } from "@/features/agenda/components/meal-card";
import { MealEntryDialog, type MealDraft } from "@/features/agenda/components/meal-entry-dialog";
import { WaitPersonDialog } from "@/features/agenda/components/wait-person-dialog";
import { waitForPerson, type DailyMeal, type MealOccurrence, type MealType } from "@/features/agenda/model/meals";
import { cycleWeeklyTime, getWeeklyTime, loadWeeklyAgenda, saveWeeklyAgenda } from "@/features/agenda/model/weekly-agenda";
import { isTimeWithinWindow, loadMealWindows } from "@/features/groups/model/meal-windows";
import { AppShell } from "@/shared/components/app-shell";

const initialMeals: DailyMeal[] = [
  { type: "BREAKFAST", label: "Desjejum", emoji: "☕", people: [] },
  {
    type: "LUNCH", label: "Almoço", emoji: "🍛",
    people: [
      { id: "1", name: "João", time: "11:50", status: "CONFIRMED" },
      { id: "2", name: "Maria", time: "12:00", status: "CONFIRMED" },
      { id: "3", name: "Pedro", time: "12:00", status: "PLANNED" },
      { id: "4", name: "Lucas", time: "12:30", status: "PLANNED" },
    ],
    mine: { id: "2", name: "Maria", time: "12:00", status: "CONFIRMED" },
  },
  {
    type: "DINNER", label: "Jantar", emoji: "🌙",
    people: [
      { id: "5", name: "Ana", time: "18:00", status: "CONFIRMED" },
      { id: "3", name: "Pedro", time: "18:20", status: "PLANNED" },
    ],
  },
];

const currentUser = { id: "2", name: "Maria" };
const defaultTimes: Record<MealType, string> = { BREAKFAST: "08:00", LUNCH: "12:00", DINNER: "18:00" };

const weekDays = [
  { day: "Seg", date: "14" },
  { day: "Ter", date: "15" },
  { day: "Qua", date: "16" },
  { day: "Qui", date: "17" },
  { day: "Sex", date: "18" },
];

export function TodayPage() {
  const [meals, setMeals] = useState<DailyMeal[]>(() => {
    try {
      const stored = localStorage.getItem("meal-agenda-demo");
      return stored ? (JSON.parse(stored) as DailyMeal[]) : initialMeals;
    } catch {
      return initialMeals;
    }
  });
  const [draft, setDraft] = useState<MealDraft>({ mealType: "LUNCH", status: "CONFIRMED", time: "12:00" });
  const [mealWindows] = useState(loadMealWindows);
  const [weeklyRows, setWeeklyRows] = useState(loadWeeklyAgenda);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [waitTarget, setWaitTarget] = useState<{ mealType: MealType; person: MealOccurrence } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  function saveEntry() {
    const occurrence = {
      ...currentUser,
      status: draft.status,
      time: draft.status === "NOT_GOING" ? null : draft.time,
    };

    setMeals((currentMeals) => {
      const nextMeals = currentMeals.map((meal) => {
        if (meal.type !== draft.mealType) return meal;
        const otherPeople = meal.people.filter((person) => person.id !== currentUser.id);
        const people = draft.status === "NOT_GOING" ? otherPeople : [...otherPeople, occurrence]
          .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
        return { ...meal, people, mine: occurrence };
      });
      localStorage.setItem("meal-agenda-demo", JSON.stringify(nextMeals));
      return nextMeals;
    });

    setIsDialogOpen(false);
    setNotice("Seu horário foi atualizado neste protótipo.");
  }

  function confirmWaiting() {
    if (!waitTarget) return;

    setMeals((currentMeals) => {
      const nextMeals = currentMeals.map((meal) =>
        meal.type === waitTarget.mealType
          ? waitForPerson(meal, currentUser, waitTarget.person)
          : meal,
      );
      localStorage.setItem("meal-agenda-demo", JSON.stringify(nextMeals));
      return nextMeals;
    });
    setNotice(`Agora você está aguardando ${waitTarget.person.name}.`);
    setWaitTarget(null);
  }

  function changeQuickWeekTime(mealType: MealType, dayIndex: number) {
    setWeeklyRows((currentRows) => {
      const nextRows = cycleWeeklyTime(currentRows, mealType, dayIndex, mealWindows);
      saveWeeklyAgenda(nextRows);
      return nextRows;
    });
    setNotice("Horário semanal atualizado.");
  }

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
              {weekDays.map((item, index) => (
                <div key={item.day} className="text-center">
                  <div className={`rounded-2xl py-2 ${index === 0 ? "bg-[var(--lemon)]" : "bg-[var(--cream)]"}`}>
                    <span className="block text-[10px] font-bold uppercase text-black/45">{item.day}</span><span className="text-lg font-extrabold">{item.date}</span>
                  </div>
                  <button type="button" onClick={() => changeQuickWeekTime("LUNCH", index)} aria-label={`Alterar almoço de ${item.day}`} className="mt-3 block w-full rounded-lg py-1 font-mono text-xs font-bold hover:bg-[var(--blush)] hover:text-[var(--tomato-dark)]">{getWeeklyTime(weeklyRows, "LUNCH", index)}</button>
                  <button type="button" onClick={() => changeQuickWeekTime("DINNER", index)} aria-label={`Alterar jantar de ${item.day}`} className="mt-1 block w-full rounded-lg py-1 font-mono text-xs text-black/40 hover:bg-[var(--blush)] hover:text-[var(--tomato-dark)]">{getWeeklyTime(weeklyRows, "DINNER", index)}</button>
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
