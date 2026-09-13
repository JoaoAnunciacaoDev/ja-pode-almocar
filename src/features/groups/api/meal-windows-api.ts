import { defaultMealWindows, type MealWindow } from "@/features/groups/model/meal-windows";
import type { MealType } from "@/features/agenda/model/meals";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

const labels = { BREAKFAST: "Desjejum", LUNCH: "Almoço", DINNER: "Jantar" } as const;

export async function fetchMealWindows(groupId: string): Promise<MealWindow[]> {
  const { data, error } = await requireSupabaseClient()
    .from("group_meal_windows")
    .select("meal_type,open_time,close_time,interval_minutes")
    .eq("group_id", groupId);
  if (error) throw error;
  if (!data?.length) return defaultMealWindows;
  return data.map((window) => ({
    mealType: window.meal_type as MealType,
    label: labels[window.meal_type as MealType],
    openTime: window.open_time.slice(0, 5),
    closeTime: window.close_time.slice(0, 5),
    intervalMinutes: window.interval_minutes,
  })).sort((a, b) => Object.keys(labels).indexOf(a.mealType) - Object.keys(labels).indexOf(b.mealType));
}

export async function saveMealWindows(groupId: string, windows: MealWindow[]) {
  const { error } = await requireSupabaseClient().from("group_meal_windows").upsert(
    windows.map((window) => ({
      group_id: groupId,
      meal_type: window.mealType,
      open_time: window.openTime,
      close_time: window.closeTime,
      interval_minutes: window.intervalMinutes,
    })),
    { onConflict: "group_id,meal_type" },
  );
  if (error) throw error;
}
