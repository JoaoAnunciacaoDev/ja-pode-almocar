import { Check } from "lucide-react";

import { MealIcon } from "@/features/agenda/components/meal-icon";
import { formatMealAvailability, type DailyMeal, type MealOccurrence, type MealStatus } from "@/features/agenda/model/meals";

const statusLabel: Record<MealStatus, string> = { CONFIRMED: "Confirmado", PLANNED: "Planejado", NOT_GOING: "Não vai" };

type MealCardProps = {
  meal: DailyMeal;
  onEdit: () => void;
  onWaitFor: (person: MealOccurrence) => void;
};

export function MealCard({ meal, onEdit, onWaitFor }: MealCardProps) {
  return (
    <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)] sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--cream)] text-[var(--tomato-dark)]"><MealIcon mealType={meal.type} className="size-6" /></span>
          <div><h2 className="text-xl font-extrabold">{meal.label}</h2><p className="text-xs text-black/45">{meal.people.length} pessoas</p></div>
        </div>
      </div>
      <ul className="space-y-2">
        {meal.people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              disabled={person.id === meal.mine?.id || person.time === null}
              onClick={() => onWaitFor(person)}
              aria-label={person.id === meal.mine?.id ? undefined : `Esperar por ${person.name}`}
              className="group flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition enabled:hover:bg-[var(--cream)] disabled:cursor-default"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--peach)] text-xs font-extrabold text-[var(--tomato-dark)]">{person.name.slice(0, 2).toUpperCase()}</span>
                <span><span className="block text-sm font-bold">{person.name}{person.id === meal.mine?.id ? " (você)" : ""}</span><span className="block text-[11px] text-black/40">{person.waitingFor ? `Aguardando ${person.waitingFor.name}` : `${statusLabel[person.status]}${person.source === "ROUTINE" ? " · rotina" : person.source === "DAILY" ? " · ajuste do dia" : ""}`}</span></span>
              </span>
              <span className="flex items-center gap-2">
                <time className="font-mono text-sm font-bold">{formatMealAvailability(person.time, person.availableUntil)}</time>
                {person.id !== meal.mine?.id && person.time !== null && <span className="rounded-full bg-[var(--blush)] px-2 py-1 text-[10px] font-bold text-[var(--tomato-dark)] opacity-80 transition group-hover:opacity-100">Esperar</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {meal.mine ? (
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--tomato)]/15 bg-[var(--blush)] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tomato-dark)]/60">{meal.mine.waitingFor ? "Estou aguardando" : meal.mine.availableUntil ? "Minha disponibilidade" : "Meu horário"}</p>
            <p className={`mt-0.5 font-extrabold text-[var(--tomato-dark)] ${meal.mine.waitingFor ? "" : "font-mono"}`}>{meal.mine.waitingFor?.name ?? formatMealAvailability(meal.mine.time, meal.mine.availableUntil)}</p>
          </div>
          <button type="button" onClick={onEdit} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--tomato-dark)] shadow-sm transition hover:-translate-y-0.5 hover:shadow">
            {meal.mine.waitingFor ? "Alterar" : <span className="flex items-center gap-1">{meal.mine.status === "CONFIRMED" && <Check aria-hidden="true" className="size-3.5" />}{statusLabel[meal.mine.status]} · Editar</span>}
          </button>
        </div>
      ) : (
        <button type="button" onClick={onEdit} className="mt-5 w-full rounded-2xl border border-dashed border-black/15 py-3 text-sm font-bold text-black/50 hover:border-[var(--tomato)] hover:text-[var(--tomato)]">+ Informar se vou</button>
      )}
    </article>
  );
}
