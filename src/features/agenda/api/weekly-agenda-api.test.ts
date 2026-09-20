import { describe, expect, test } from "bun:test";

import { getWorkWeekDates } from "./weekly-agenda-api";

describe("getWorkWeekDates", () => {
  test("returns Monday through Friday by default", () => {
    expect(getWorkWeekDates("2026-09-20")).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25",
    ]);
  });

  test("adds only the weekend days enabled by the group", () => {
    expect(getWorkWeekDates("2026-09-23", { includeSaturday: true })).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26",
    ]);
    expect(getWorkWeekDates("2026-09-23", { includeSunday: true })).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-27",
    ]);
  });

  test("adds both Saturday and Sunday when both are enabled", () => {
    expect(getWorkWeekDates("2026-09-23", { includeSaturday: true, includeSunday: true })).toHaveLength(7);
  });
});
