import type { MealType } from "@/features/agenda/model/meals";

export type MealWindow = {
  mealType: MealType;
  label: string;
  openTime: string;
  closeTime: string;
  intervalMinutes: number;
};

export const defaultMealWindows: MealWindow[] = [
  { mealType: "BREAKFAST", label: "Desjejum", openTime: "06:30", closeTime: "09:30", intervalMinutes: 10 },
  { mealType: "LUNCH", label: "Almoço", openTime: "11:00", closeTime: "14:00", intervalMinutes: 10 },
  { mealType: "DINNER", label: "Jantar", openTime: "17:00", closeTime: "20:00", intervalMinutes: 10 },
];

export function isTimeWithinWindow(time: string, window: MealWindow) {
  return time >= window.openTime && time <= window.closeTime;
}

export function buildTimeOptions(window: MealWindow) {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const format = (totalMinutes: number) =>
    `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;

  const options: string[] = [];
  for (let value = toMinutes(window.openTime); value <= toMinutes(window.closeTime); value += window.intervalMinutes) {
    options.push(format(value));
  }
  return options;
}
