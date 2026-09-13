import { fetchGroup } from "@/features/groups/api/groups-api";
import type { DailyMeal, MealStatus, MealType } from "@/features/agenda/model/meals";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

const mealMeta: Record<MealType, { label: string; emoji: string }> = {
  BREAKFAST: { label: "Desjejum", emoji: "☕" },
  LUNCH: { label: "Almoço", emoji: "🍛" },
  DINNER: { label: "Jantar", emoji: "🌙" },
};

export async function fetchDailyAgenda(groupId: string, date: string, currentUserId: string): Promise<DailyMeal[]> {
  const client = requireSupabaseClient();
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [group, routinesResult, entriesResult] = await Promise.all([
    fetchGroup(groupId),
    client.from("meal_routines").select("user_id,meal_type,time").eq("group_id", groupId).eq("weekday", weekday).lte("start_date", date).gte("end_date", date),
    client.from("meal_entries").select("user_id,meal_type,time,status,waiting_for_user_id").eq("group_id", groupId).eq("date", date),
  ]);
  if (routinesResult.error) throw routinesResult.error;
  if (entriesResult.error) throw entriesResult.error;

  const members = new Map(group.members.map((member) => [member.id, member]));
  const routines = routinesResult.data ?? [];
  const entries = entriesResult.data ?? [];
  return (Object.keys(mealMeta) as MealType[]).map((mealType) => {
    const people = group.members.flatMap((member) => {
      const entry = entries.find((item) => item.user_id === member.id && item.meal_type === mealType);
      const routine = routines.find((item) => item.user_id === member.id && item.meal_type === mealType);
      if (!entry && !routine) return [];
      const status = (entry?.status ?? "PLANNED") as MealStatus;
      const waitingFor = entry?.waiting_for_user_id ? members.get(entry.waiting_for_user_id) : undefined;
      const occurrence = {
        id: member.id,
        name: member.name,
        time: entry ? entry.time?.slice(0, 5) ?? null : routine!.time.slice(0, 5),
        status,
        ...(waitingFor ? { waitingFor: { id: waitingFor.id, name: waitingFor.name } } : {}),
      };
      return [occurrence];
    });
    const mine = people.find((person) => person.id === currentUserId);
    return {
      type: mealType,
      ...mealMeta[mealType],
      people: people.filter((person) => person.status !== "NOT_GOING").sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99")),
      ...(mine ? { mine } : {}),
    };
  });
}

export async function saveDailyEntry(input: { groupId: string; date: string; mealType: MealType; time: string | null; status: MealStatus; waitingForUserId?: string | null }) {
  const client = requireSupabaseClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error("Autenticação necessária.");
  const { error } = await client.from("meal_entries").upsert({
    group_id: input.groupId,
    user_id: userData.user.id,
    date: input.date,
    meal_type: input.mealType,
    time: input.time,
    status: input.status,
    waiting_for_user_id: input.waitingForUserId ?? null,
  }, { onConflict: "group_id,user_id,date,meal_type" });
  if (error) throw error;
}
