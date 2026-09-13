import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  institution: string;
  ownerId: string;
  timezone: string;
  memberCount: number;
};

export type GroupMemberView = { id: string; name: string; email: string; role: "OWNER" | "MEMBER" };
export type GroupDetails = GroupSummary & { members: GroupMemberView[] };
export type GroupInvitePreview = { groupId: string; groupName: string; institution: string; memberCount: number };

export async function fetchGroups(): Promise<GroupSummary[]> {
  const { data, error } = await requireSupabaseClient()
    .from("groups")
    .select("id,slug,name,institution,owner_id,timezone,group_members(count)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    institution: group.institution,
    ownerId: group.owner_id,
    timezone: group.timezone,
    memberCount: group.group_members?.[0]?.count ?? 0,
  }));
}

export async function createGroup(name: string, institution: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.rpc("create_group", {
    group_name: name,
    group_institution: institution,
    group_timezone: "America/Sao_Paulo",
  });
  if (error) throw error;
  return fetchGroupLocator(data as string);
}

async function fetchGroupLocator(groupId: string) {
  const { data, error } = await requireSupabaseClient().from("groups").select("id,slug").eq("id", groupId).single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

async function fetchGroupBy(column: "id" | "slug", value: string): Promise<GroupDetails> {
  const client = requireSupabaseClient();
  const { data: group, error: groupError } = await client.from("groups").select("id,slug,name,institution,owner_id,timezone").eq(column, value).single();
  if (groupError) throw groupError;
  const { data: memberships, error: membershipError } = await client.from("group_members").select("user_id,role").eq("group_id", group.id).order("joined_at");
  if (membershipError) throw membershipError;

  const ids = (memberships ?? []).map((membership) => membership.user_id);
  const { data: profiles, error: profilesError } = ids.length
    ? await client.from("profiles").select("id,name,email").in("id", ids)
    : { data: [], error: null };
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const members = (memberships ?? []).map((membership) => {
    const profile = profileById.get(membership.user_id);
    return { id: membership.user_id, name: profile?.name ?? "Integrante", email: profile?.email ?? "", role: membership.role as "OWNER" | "MEMBER" };
  });

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    institution: group.institution,
    ownerId: group.owner_id,
    timezone: group.timezone,
    memberCount: members.length,
    members,
  };
}

export function fetchGroup(groupId: string) {
  return fetchGroupBy("id", groupId);
}

export function fetchGroupBySlug(groupSlug: string) {
  return fetchGroupBy("slug", groupSlug);
}

export async function getOrCreateInvite(groupId: string) {
  const client = requireSupabaseClient();
  const { data: existing, error: selectError } = await client
    .from("group_invites")
    .select("code")
    .eq("group_id", groupId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.code;

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error("Authentication required");
  const { data, error } = await client
    .from("group_invites")
    .insert({ group_id: groupId, created_by: userData.user.id })
    .select("code")
    .single();
  if (error) throw error;
  return data.code;
}

export async function fetchInvitePreview(code: string): Promise<GroupInvitePreview | null> {
  const { data, error } = await requireSupabaseClient().rpc("get_group_invite", { invite_code: code });
  if (error) throw error;
  const preview = data?.[0];
  return preview ? { groupId: preview.group_id, groupName: preview.group_name, institution: preview.institution, memberCount: Number(preview.member_count) } : null;
}

export async function acceptInvite(code: string) {
  const { data, error } = await requireSupabaseClient().rpc("accept_group_invite", { invite_code: code });
  if (error) throw error;
  return fetchGroupLocator(data as string);
}
