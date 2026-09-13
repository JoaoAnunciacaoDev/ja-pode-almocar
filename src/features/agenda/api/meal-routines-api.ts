import type { MealType } from "@/features/agenda/model/meals";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export type MealRoutineRecord = {
  id: string;
  weekday: number;
  mealType: MealType;
  time: string;
  startDate: string;
  endDate: string;
};

export type MealRoutineInput = Omit<MealRoutineRecord, "id"> & { id?: string };

export async function fetchMealRoutines(groupId: string, userId: string): Promise<MealRoutineRecord[]> {
  const { data, error } = await requireSupabaseClient()
    .from("meal_routines")
    .select("id,weekday,meal_type,time,start_date,end_date")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .order("weekday")
    .order("meal_type");
  if (error) throw error;
  return (data ?? []).map((routine) => ({
    id: routine.id,
    weekday: routine.weekday,
    mealType: routine.meal_type,
    time: routine.time.slice(0, 5),
    startDate: routine.start_date,
    endDate: routine.end_date,
  }));
}

export async function saveMealRoutine(groupId: string, userId: string, routine: MealRoutineInput) {
  const values = {
    group_id: groupId,
    user_id: userId,
    weekday: routine.weekday,
    meal_type: routine.mealType,
    time: routine.time,
    start_date: routine.startDate,
    end_date: routine.endDate,
  };
  const query = routine.id
    ? requireSupabaseClient().from("meal_routines").update(values).eq("id", routine.id)
    : requireSupabaseClient().from("meal_routines").insert(values);
  const { error } = await query;
  if (error?.code === "23505") throw new Error("Já existe uma rotina para esta refeição, dia e data inicial.");
  if (error?.message.includes("outside the group meal window")) throw new Error("O horário está fora do período configurado para esta refeição.");
  if (error) throw error;
}

export async function deleteMealRoutine(routineId: string) {
  const { error } = await requireSupabaseClient().from("meal_routines").delete().eq("id", routineId);
  if (error) throw error;
}
