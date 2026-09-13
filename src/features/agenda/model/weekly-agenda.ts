import type { MealType } from "@/features/agenda/model/meals";
import { buildTimeOptions, type MealWindow } from "@/features/groups/model/meal-windows";

export type WeeklyAgendaRow = { mealType: MealType; meal: string; values: string[] };

export const defaultWeeklyAgenda: WeeklyAgendaRow[] = [
  { mealType: "BREAKFAST", meal: "☕ Desjejum", values: ["—", "08:00", "—", "08:10", "—"] },
  { mealType: "LUNCH", meal: "🍛 Almoço", values: ["12:00", "11:30", "12:30", "—", "12:00"] },
  { mealType: "DINNER", meal: "🌙 Jantar", values: ["—", "18:00", "17:30", "18:00", "—"] },
];

export function loadWeeklyAgenda(): WeeklyAgendaRow[] {
  try {
    const stored = localStorage.getItem("weekly-agenda-demo");
    return stored ? (JSON.parse(stored) as WeeklyAgendaRow[]) : defaultWeeklyAgenda;
  } catch {
    return defaultWeeklyAgenda;
  }
}

export function saveWeeklyAgenda(rows: WeeklyAgendaRow[]) {
  localStorage.setItem("weekly-agenda-demo", JSON.stringify(rows));
}

export function cycleWeeklyTime(
  rows: WeeklyAgendaRow[],
  mealType: MealType,
  columnIndex: number,
  mealWindows: MealWindow[],
) {
  return rows.map((row) => {
    if (row.mealType !== mealType) return row;
    const window = mealWindows.find((item) => item.mealType === mealType);
    if (!window) return row;

    const options = ["—", ...buildTimeOptions(window)];
    const currentIndex = options.indexOf(row.values[columnIndex]);
    const nextValue = options[(currentIndex + 1) % options.length];
    return {
      ...row,
      values: row.values.map((value, index) => index === columnIndex ? nextValue : value),
    };
  });
}

export function getWeeklyTime(rows: WeeklyAgendaRow[], mealType: MealType, columnIndex: number) {
  return rows.find((row) => row.mealType === mealType)?.values[columnIndex] ?? "—";
}
