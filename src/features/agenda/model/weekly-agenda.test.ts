import { describe, expect, test } from "bun:test";

import { cycleWeeklyTime, defaultWeeklyAgenda, getWeeklyTime } from "./weekly-agenda";
import { defaultMealWindows } from "@/features/groups/model/meal-windows";

describe("weekly agenda interactions", () => {
  test("cycles a meal using only its group window", () => {
    const updated = cycleWeeklyTime(defaultWeeklyAgenda, "BREAKFAST", 0, defaultMealWindows);
    expect(getWeeklyTime(updated, "BREAKFAST", 0)).toBe("06:30");
  });

  test("keeps other meals and days unchanged", () => {
    const updated = cycleWeeklyTime(defaultWeeklyAgenda, "LUNCH", 0, defaultMealWindows);
    expect(getWeeklyTime(updated, "LUNCH", 1)).toBe("11:30");
    expect(getWeeklyTime(updated, "DINNER", 0)).toBe("—");
  });
});
