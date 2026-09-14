import { formatMealAvailability, parseMealAvailability, resolveMealForDate, type MealEntry, type MealRoutine, type MealType } from "@/features/agenda/model/meals";
import type { WeeklyAgendaRow } from "@/features/agenda/model/weekly-agenda";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

const mealLabels: Record<MealType, string> = { BREAKFAST: "☕ Desjejum", LUNCH: "🍛 Almoço", DINNER: "🌙 Jantar" };

export function getWorkWeekDates(referenceDate?: string) {
  const today = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
  today.setHours(12, 0, 0, 0);
  const offset = today.getDay() === 0 ? 1 : 1 - today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + offset);
  return Array.from({ length: 5 }, (_, index) => {
    const value = new Date(monday);
    value.setDate(monday.getDate() + index);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  });
}

export async function fetchWeeklyAgenda(groupId: string, userId: string, dates: string[]): Promise<WeeklyAgendaRow[]> {
  const client = requireSupabaseClient();
  const [routinesResult, entriesResult] = await Promise.all([
    client.from("meal_routines").select("weekday,meal_type,time,available_until,start_date,end_date").eq("group_id", groupId).eq("user_id", userId).lte("start_date", dates.at(-1)!).gte("end_date", dates[0]),
    client.from("meal_entries").select("date,meal_type,time,available_until,status").eq("group_id", groupId).eq("user_id", userId).gte("date", dates[0]).lte("date", dates.at(-1)!),
  ]);
  if (routinesResult.error) throw routinesResult.error;
  if (entriesResult.error) throw entriesResult.error;
  const routines: MealRoutine[] = (routinesResult.data ?? []).map((item) => ({ weekday: item.weekday, mealType: item.meal_type, time: item.time.slice(0, 5), availableUntil: item.available_until?.slice(0, 5) ?? null, startDate: item.start_date, endDate: item.end_date }));
  const entries: MealEntry[] = (entriesResult.data ?? []).map((item) => ({ date: item.date, mealType: item.meal_type, time: item.time?.slice(0, 5) ?? null, availableUntil: item.available_until?.slice(0, 5) ?? null, status: item.status }));
  return (Object.keys(mealLabels) as MealType[]).map((mealType) => ({
    mealType,
    meal: mealLabels[mealType],
    values: dates.map((date) => {
      const availability = resolveMealForDate(date, mealType, routines, entries);
      return availability ? formatMealAvailability(availability.time, availability.availableUntil) : "—";
    }),
  }));
}

export async function saveWeeklyAgenda(groupId: string, userId: string, dates: string[], rows: WeeklyAgendaRow[]) {
  const values = rows.flatMap((row) => row.values.map((value, index) => {
    const availability = parseMealAvailability(value);
    return {
      group_id: groupId,
      user_id: userId,
      date: dates[index],
      meal_type: row.mealType,
      time: availability.time,
      available_until: availability.availableUntil,
      status: availability.time === null ? "NOT_GOING" as const : "PLANNED" as const,
      waiting_for_user_id: null,
    };
  }));
  const { error } = await requireSupabaseClient().from("meal_entries").upsert(values, { onConflict: "group_id,user_id,date,meal_type" });
  if (error) throw error;
}
