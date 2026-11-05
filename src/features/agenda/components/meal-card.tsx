import { Check, CheckCheck, Utensils } from "lucide-react";

import { MealIcon } from "@/features/agenda/components/meal-icon";
import { formatMealAvailability, type DailyMeal, type MealOccurrence, type MealStatus, type MealType } from "@/features/agenda/model/meals";

function getMealAteLabel(mealType: MealType, isMine = false) {
  if (mealType === "BREAKFAST") return isMine ? "Já tomei desjejum" : "Já tomou desjejum";
  if (mealType === "DINNER") return isMine ? "Já jantei" : "Já jantou";
  return isMine ? "Já almocei" : "Já almoçou";
}

function getStatusLabel(status: MealStatus, mealType: MealType, isMine = false) {
  if (status === "ALREADY_ATE") return getMealAteLabel(mealType, isMine);
  if (status === "CONFIRMED") return "Confirmado";
  if (status === "PLANNED") return "Planejado";
  return "Não vai";
}

type MealCardProps = {
  meal: DailyMeal;
  onEdit: () => void;
  onWaitFor: (person: MealOccurrence) => void;
  onAlreadyAte?: () => void;
  isAlreadyAteLoading?: boolean;
};

export function MealCard({ meal, onEdit, onWaitFor, onAlreadyAte, isAlreadyAteLoading }: MealCardProps) {
  const hasAte = meal.mine?.status === "ALREADY_ATE";

  return (
    <article className="flex flex-col justify-between rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_18px_60px_rgba(42,35,28,.07)] sm:p-6">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--cream)] text-[var(--tomato-dark)]">
              <MealIcon mealType={meal.type} className="size-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">{meal.label}</h2>
              <p className="text-xs text-black/45">{meal.people.length} {meal.people.length === 1 ? "pessoa" : "pessoas"}</p>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {meal.people.map((person) => {
            const isPersonAte = person.status === "ALREADY_ATE";

            return (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={person.id === meal.mine?.id || person.time === null || isPersonAte}
                  onClick={() => onWaitFor(person)}
                  aria-label={person.id === meal.mine?.id || isPersonAte ? undefined : `Esperar por ${person.name}`}
                  className={`group flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition ${
                    isPersonAte ? "bg-emerald-50/60" : "enabled:hover:bg-[var(--cream)]"
                  } disabled:cursor-default`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid size-9 place-items-center rounded-full text-xs font-extrabold ${
                        isPersonAte
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[var(--peach)] text-[var(--tomato-dark)]"
                      }`}
                    >
                      {isPersonAte ? (
                        <CheckCheck className="size-4" aria-hidden="true" />
                      ) : (
                        person.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">
                        {person.name}{person.id === meal.mine?.id ? " (você)" : ""}
                      </span>
                      <span className={`block text-[11px] ${isPersonAte ? "font-semibold text-emerald-700" : "text-black/40"}`}>
                        {person.waitingFor
                          ? `Aguardando ${person.waitingFor.name}`
                          : `${getStatusLabel(person.status, meal.type, person.id === meal.mine?.id)}${
                              person.source === "ROUTINE" && !isPersonAte
                                ? " · rotina"
                                : person.source === "DAILY" && !isPersonAte
                                ? " · ajuste do dia"
                                : ""
                            }`}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {person.time && (
                      <time className={`font-mono text-sm font-bold ${isPersonAte ? "text-emerald-800" : ""}`}>
                        {formatMealAvailability(person.time, person.availableUntil)}
                      </time>
                    )}
                    {person.id !== meal.mine?.id && person.time !== null && !isPersonAte && (
                      <span className="rounded-full bg-[var(--blush)] px-2 py-1 text-[10px] font-bold text-[var(--tomato-dark)] opacity-80 transition group-hover:opacity-100">
                        Esperar
                      </span>
                    )}
                    {isPersonAte && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        <CheckCheck className="size-3" aria-hidden="true" /> Concluído
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5">
        {meal.mine ? (
          hasAte ? (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Refeição realizada</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-emerald-950">
                  <CheckCheck className="size-4 text-emerald-600" aria-hidden="true" />
                  {getMealAteLabel(meal.type, true)} hoje!
                </p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100/60"
              >
                Alterar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-[var(--tomato)]/15 bg-[var(--blush)] px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tomato-dark)]/60">
                    {meal.mine.waitingFor ? "Estou aguardando" : meal.mine.availableUntil ? "Minha disponibilidade" : "Meu horário"}
                  </p>
                  <p className={`mt-0.5 font-extrabold text-[var(--tomato-dark)] ${meal.mine.waitingFor ? "" : "font-mono"}`}>
                    {meal.mine.waitingFor?.name ?? formatMealAvailability(meal.mine.time, meal.mine.availableUntil)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--tomato-dark)] shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                >
                  {meal.mine.waitingFor ? "Alterar" : (
                    <span className="flex items-center gap-1">
                      {meal.mine.status === "CONFIRMED" && <Check aria-hidden="true" className="size-3.5" />}
                      {getStatusLabel(meal.mine.status, meal.type, true)} · Editar
                    </span>
                  )}
                </button>
              </div>

              {onAlreadyAte && (
                <button
                  type="button"
                  onClick={onAlreadyAte}
                  disabled={isAlreadyAteLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Utensils className="size-4" aria-hidden="true" />
                  {isAlreadyAteLoading ? "Marcando e notificando…" : getMealAteLabel(meal.type, true)}
                </button>
              )}
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-2xl border border-dashed border-black/15 py-3 text-sm font-bold text-black/50 hover:border-[var(--tomato)] hover:text-[var(--tomato)]"
          >
            + Informar se vou
          </button>
        )}
      </div>
    </article>
  );
}
