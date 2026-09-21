import { requireSupabaseClient } from "@/shared/utils/supabase-client";
import { toAppError } from "@/shared/utils/app-error";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  institution: string;
  isOwner: boolean;
  timezone: string;
  includeSaturday: boolean;
  includeSunday: boolean;
  memberCount: number;
};

export type GroupMemberView = {
  id: string; 
  name: string;
  role: "OWNER" | "MEMBER" 
};

export type GroupDetails = GroupSummary & { members: GroupMemberView[] };
export type GroupInvitePreview = { groupName: string };

export async function fetchGroups(): Promise<GroupSummary[]> {
  const client = requireSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required");
  const [{ data, error }, { data: memberships, error: membershipError }] = await Promise.all([
    client
    .from("groups")
    .select("id,slug,name,institution,timezone,include_saturday,include_sunday,group_members(count)")
    .order("created_at"),
    client.from("group_members").select("group_id,role").eq("user_id", userData.user.id),
  ]);
  if (error || membershipError) throw error ?? membershipError;
  const roles = new Map((memberships ?? []).map((membership) => [membership.group_id, membership.role]));
  return (data ?? []).map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    institution: group.institution,
    isOwner: roles.get(group.id) === "OWNER",
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
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Authentication required");
  const { data: group, error: groupError } = await client.from("groups").select("id,slug,name,institution,timezone,include_saturday,include_sunday").eq(column, value).single();
  if (groupError) throw groupError;
  const { data: memberProfiles, error: memberProfilesError } = await client.rpc("get_group_member_profiles", { target_group_id: group.id });
  if (memberProfilesError) throw memberProfilesError;
  const members: GroupMemberView[] = (memberProfiles ?? []).map((member: { id: string; name: string; role: "OWNER" | "MEMBER" }) => ({
    id: member.id,
    name: member.name,
    role: member.role,
  }));

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    institution: group.institution,
    isOwner: members.some((member) => member.id === userData.user.id && member.role === "OWNER"),
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
  return preview ? { groupName: preview.group_name } : null;
}

export async function acceptInvite(code: string) {
  const { data, error } = await requireSupabaseClient().rpc("accept_group_invite", { invite_code: code });
  if (error) throw error;
  return fetchGroupLocator(data as string);
}
