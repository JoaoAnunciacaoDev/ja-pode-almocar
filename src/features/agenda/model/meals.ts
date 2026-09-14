export const mealTypes = ["BREAKFAST", "LUNCH", "DINNER"] as const;
export const mealStatuses = ["CONFIRMED", "PLANNED", "NOT_GOING"] as const;

export type MealType = (typeof mealTypes)[number];
export type MealStatus = (typeof mealStatuses)[number];
export type MealOccurrence = {
  id: string;
  name: string;
  time: string | null;
  availableUntil?: string | null;
  status: MealStatus;
  waitingFor?: Pick<MealOccurrence, "id" | "name">;
};
export type DailyMeal = { type: MealType; label: string; emoji: string; people: MealOccurrence[]; mine?: MealOccurrence };
export type MealRoutine = { weekday: number; mealType: MealType; time: string; availableUntil?: string | null; startDate: string; endDate: string };
export type MealEntry = { date: string; mealType: MealType; time: string | null; availableUntil?: string | null; status: MealStatus };

export function formatMealAvailability(time: string | null, availableUntil?: string | null) {
  if (!time) return "—";
  return availableUntil ? `${time}–${availableUntil}` : time;
}

export function parseMealAvailability(value: string) {
  if (value === "—") return { time: null, availableUntil: null };
  const [time, availableUntil] = value.split("–");
  return { time, availableUntil: availableUntil ?? null };
}

export function resolveMealForDate(
  date: string,
  mealType: MealType,
  routines: MealRoutine[],
  entries: MealEntry[],
): Pick<MealEntry, "time" | "availableUntil" | "status"> | null {
  const exception = entries.find((entry) => entry.date === date && entry.mealType === mealType);
  if (exception) return { time: exception.time, status: exception.status, ...(exception.availableUntil ? { availableUntil: exception.availableUntil } : {}) };

  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const routine = routines.find(
    (item) => item.mealType === mealType && item.weekday === weekday && item.startDate <= date && item.endDate >= date,
  );
  return routine ? { time: routine.time, status: "PLANNED", ...(routine.availableUntil ? { availableUntil: routine.availableUntil } : {}) } : null;
}

export function waitForPerson(
  meal: DailyMeal,
  currentUser: Pick<MealOccurrence, "id" | "name">,
  target: Pick<MealOccurrence, "id" | "name">,
): DailyMeal {
  if (currentUser.id === target.id) throw new Error("A user cannot wait for themselves");

  const occurrence: MealOccurrence = {
    ...currentUser,
    time: null,
    availableUntil: null,
    status: "PLANNED",
    waitingFor: target,
  };
  const people = [...meal.people.filter((person) => person.id !== currentUser.id), occurrence]
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  return { ...meal, people, mine: occurrence };
}
