import { describe, expect, test } from "bun:test";

import { clearWeeklyTime, cycleWeeklyTime, getWeeklyAgendaChanges, getWeeklyTime, type WeeklyAgendaRow } from "./weekly-agenda";

const weeklyAgendaFixture: WeeklyAgendaRow[] = [
  { mealType: "BREAKFAST", meal: "Desjejum", values: ["—", "08:00", "—", "08:10", "—"] },
  { mealType: "LUNCH", meal: "Almoço", values: ["12:00", "11:30", "12:30", "—", "12:00"] },
  { mealType: "DINNER", meal: "Jantar", values: ["—", "18:00", "17:30", "18:00", "—"] },
];
import { defaultMealWindows } from "@/features/groups/model/meal-windows";

describe("weekly agenda interactions", () => {
  test("cycles a meal using only its group window", () => {
    const updated = cycleWeeklyTime(weeklyAgendaFixture, "BREAKFAST", 0, defaultMealWindows);
    expect(getWeeklyTime(updated, "BREAKFAST", 0)).toBe("06:30");
  });

  test("keeps other meals and days unchanged", () => {
    const updated = cycleWeeklyTime(weeklyAgendaFixture, "LUNCH", 0, defaultMealWindows);
    expect(getWeeklyTime(updated, "LUNCH", 1)).toBe("11:30");
    expect(getWeeklyTime(updated, "DINNER", 0)).toBe("—");
  });

  test("moves an availability range without changing its duration", () => {
    const rows = weeklyAgendaFixture.map((row) => row.mealType === "LUNCH" ? { ...row, values: ["12:30–13:00", ...row.values.slice(1)] } : row);
    const updated = cycleWeeklyTime(rows, "LUNCH", 0, defaultMealWindows);
    expect(getWeeklyTime(updated, "LUNCH", 0)).toBe("12:40–13:10");
  });

  test("clears one meal without cycling through the available times", () => {
    const updated = clearWeeklyTime(weeklyAgendaFixture, "LUNCH", 2);
    expect(getWeeklyTime(updated, "LUNCH", 2)).toBe("—");
    expect(getWeeklyTime(updated, "LUNCH", 1)).toBe("11:30");
    expect(getWeeklyTime(updated, "DINNER", 2)).toBe("17:30");
  });

  test("returns only cells changed from the loaded week", () => {
    const updated = cycleWeeklyTime(weeklyAgendaFixture, "LUNCH", 0, defaultMealWindows);
    expect(getWeeklyAgendaChanges(updated, weeklyAgendaFixture)).toEqual([
      { mealType: "LUNCH", columnIndex: 0, value: "12:10" },
    ]);
  });
});
