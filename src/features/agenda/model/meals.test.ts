import { describe, expect, test } from "bun:test";
import { resolveMealForDate, type MealEntry, type MealRoutine } from "./meals";

const routines: MealRoutine[] = [
  { weekday: 1, mealType: "LUNCH", time: "12:00", startDate: "2026-08-01", endDate: "2026-12-20" },
];

describe("resolveMealForDate", () => {
  test("uses the weekly routine when there is no exception", () => {
    expect(resolveMealForDate("2026-09-21", "LUNCH", routines, [])).toEqual({ time: "12:00", status: "PLANNED" });
  });
  test("gives a dated entry priority over the routine", () => {
    const entries: MealEntry[] = [{ date: "2026-09-21", mealType: "LUNCH", time: "12:40", status: "CONFIRMED" }];
    expect(resolveMealForDate("2026-09-21", "LUNCH", routines, entries)).toEqual({ time: "12:40", status: "CONFIRMED" });
  });
  test("allows a dated entry to cancel a routine", () => {
    const entries: MealEntry[] = [{ date: "2026-09-21", mealType: "LUNCH", time: null, status: "NOT_GOING" }];
    expect(resolveMealForDate("2026-09-21", "LUNCH", routines, entries)).toEqual({ time: null, status: "NOT_GOING" });
  });
});
