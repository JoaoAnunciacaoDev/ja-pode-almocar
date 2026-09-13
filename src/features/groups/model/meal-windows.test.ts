import { describe, expect, test } from "bun:test";

import { buildTimeOptions, isTimeWithinWindow, type MealWindow } from "./meal-windows";

const breakfast: MealWindow = {
  mealType: "BREAKFAST",
  label: "Desjejum",
  openTime: "06:30",
  closeTime: "09:30",
  intervalMinutes: 30,
};

describe("group meal windows", () => {
  test("accepts only times inside the configured window", () => {
    expect(isTimeWithinWindow("06:20", breakfast)).toBe(false);
    expect(isTimeWithinWindow("06:30", breakfast)).toBe(true);
    expect(isTimeWithinWindow("09:30", breakfast)).toBe(true);
    expect(isTimeWithinWindow("09:40", breakfast)).toBe(false);
  });

  test("builds selectable times using the configured interval", () => {
    expect(buildTimeOptions(breakfast)).toEqual(["06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30"]);
  });
});
