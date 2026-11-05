import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export type BossGroupSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  membersCount: number;
};

export type BossUserSummary = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isBoss: boolean;
  groupsCount: number;
  lastSignInAt: string | null;
};

export type BossDashboardData = {
  groups: BossGroupSummary[];
  users: BossUserSummary[];
};

type RawDashboardData = {
  groups: Array<{
    id: string;
    name: string;
    slug: string;
    timezone: string;
    created_at: string;
    owner_id: string;
    owner_name: string | null;
    owner_email: string | null;
    members_count: number;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    is_boss: boolean;
    groups_count: number;
    last_sign_in_at: string | null;
  }>;
};

export async function fetchBossStatus(userId: string): Promise<boolean> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("is_boss")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar status de Boss:", error);
    return false;
  }

  return Boolean(data?.is_boss);
}

export async function fetchBossDashboardData(): Promise<BossDashboardData> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc("get_boss_dashboard_data");
  if (error) throw error;

  const raw = data as RawDashboardData;

  return {
    groups: (raw?.groups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      timezone: group.timezone,
      createdAt: group.created_at,
      ownerId: group.owner_id,
      ownerName: group.owner_name || "Desconhecido",
      ownerEmail: group.owner_email || "—",
      membersCount: group.members_count,
    })),
    users: (raw?.users ?? []).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
      isBoss: Boolean(user.is_boss),
      groupsCount: user.groups_count,
      lastSignInAt: user.last_sign_in_at,
    })),
  };
}

export async function setUserBossStatus(targetUserId: string, makeBoss: boolean): Promise<boolean> {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc("set_user_boss_status", {
    target_user_id: targetUserId,
    make_boss: makeBoss,
  });
  if (error) throw error;
  return Boolean(data);
}
