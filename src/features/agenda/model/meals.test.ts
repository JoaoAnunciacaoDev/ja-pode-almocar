import { describe, expect, test } from "bun:test";
import { resolveMealForDate, waitForPerson, type DailyMeal, type MealEntry, type MealRoutine } from "./meals";

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

describe("waitForPerson", () => {
  test("removes the current user's time and records who they are waiting for", () => {
    const meal: DailyMeal = {
      type: "LUNCH",
      label: "Almoço",
      emoji: "🍛",
      people: [
        { id: "maria", name: "Maria", time: "12:00", status: "CONFIRMED" },
        { id: "joao", name: "João", time: "12:30", status: "CONFIRMED" },
      ],
      mine: { id: "maria", name: "Maria", time: "12:00", status: "CONFIRMED" },
    };

    const result = waitForPerson(meal, { id: "maria", name: "Maria" }, { id: "joao", name: "João" });

    expect(result.mine).toEqual({
      id: "maria",
      name: "Maria",
      time: null,
      status: "PLANNED",
      waitingFor: { id: "joao", name: "João" },
    });
    expect(result.people.find((person) => person.id === "maria")?.time).toBeNull();
  });

  test("does not allow a user to wait for themselves", () => {
    const meal: DailyMeal = { type: "LUNCH", label: "Almoço", emoji: "🍛", people: [] };
    expect(() => waitForPerson(meal, { id: "maria", name: "Maria" }, { id: "maria", name: "Maria" })).toThrow();
  });
});
