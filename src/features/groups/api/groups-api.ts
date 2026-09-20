import { requireSupabaseClient } from "@/shared/utils/supabase-client";
import { toAppError } from "@/shared/utils/app-error";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  institution: string;
  ownerId: string;
  timezone: string;
  includeSaturday: boolean;
  includeSunday: boolean;
  memberCount: number;
};

export type GroupMemberView = { id: string; name: string; email: string; role: "OWNER" | "MEMBER" };
export type GroupDetails = GroupSummary & { members: GroupMemberView[] };
export type GroupInvitePreview = { groupId: string; groupName: string; institution: string; memberCount: number };

export async function fetchGroups(): Promise<GroupSummary[]> {
  const { data, error } = await requireSupabaseClient()
    .from("groups")
    .select("id,slug,name,institution,owner_id,timezone,include_saturday,include_sunday,group_members(count)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    institution: group.institution,
    ownerId: group.owner_id,
    timezone: group.timezone,
    includeSaturday: group.include_saturday,
    includeSunday: group.include_sunday,
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
  if (error) throw toAppError(error);
  return fetchGroupLocator(data as string);
}

async function fetchGroupLocator(groupId: string) {
  const { data, error } = await requireSupabaseClient().from("groups").select("id,slug").eq("id", groupId).single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

async function fetchGroupBy(column: "id" | "slug", value: string): Promise<GroupDetails> {
  const client = requireSupabaseClient();
  const { data: group, error: groupError } = await client.from("groups").select("id,slug,name,institution,owner_id,timezone,include_saturday,include_sunday").eq(column, value).single();
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
    includeSaturday: group.include_saturday,
    includeSunday: group.include_sunday,
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

export async function fetchActiveGroupInvite(groupId: string) {
  const { data, error } = await requireSupabaseClient().rpc("get_active_group_invite", { target_group_id: groupId });
  if (error) throw error;
  return data as string | null;
}

export async function revokeGroupInvite(groupId: string) {
  const { error } = await requireSupabaseClient().rpc("revoke_group_invite", { target_group_id: groupId });
  if (error) throw error;
}

export async function regenerateGroupInvite(groupId: string) {
  const { data, error } = await requireSupabaseClient().rpc("regenerate_group_invite", { target_group_id: groupId });
  if (error) throw error;
  return data as string;
}

export async function leaveGroup(groupId: string) {
  const { error } = await requireSupabaseClient().rpc("leave_group", { target_group_id: groupId });
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await requireSupabaseClient().rpc("remove_group_member", { target_group_id: groupId, target_user_id: userId });
  if (error) throw error;
}

export async function transferGroupOwnership(groupId: string, newOwnerId: string) {
  const { error } = await requireSupabaseClient().rpc("transfer_group_ownership", { target_group_id: groupId, new_owner_id: newOwnerId });
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await requireSupabaseClient().rpc("delete_group", { target_group_id: groupId });
  if (error) throw error;
}

export async function updateGroup(groupId: string, input: { name: string; institution: string; timezone: string; includeSaturday: boolean; includeSunday: boolean }) {
  const { error } = await requireSupabaseClient().from("groups").update({
    name: input.name.trim(),
    institution: input.institution.trim(),
    timezone: input.timezone,
    include_saturday: input.includeSaturday,
    include_sunday: input.includeSunday,
  }).eq("id", groupId);
  if (error) throw toAppError(error);
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
