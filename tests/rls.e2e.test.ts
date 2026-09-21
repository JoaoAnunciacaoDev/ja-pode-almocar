import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey);

const password = "Rls-test-2026!";
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const emails = {
  owner: `rls-owner-${suffix}@example.com`,
  member: `rls-member-${suffix}@example.com`,
  outsider: `rls-outsider-${suffix}@example.com`,
};

describe.skipIf(!enabled)("Supabase RLS with owner, member and outsider", () => {
  let admin: SupabaseClient;
  const clients = {} as Record<keyof typeof emails, SupabaseClient>;
  const userIds: string[] = [];
  let groupId: string | undefined;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    for (const [role, email] of Object.entries(emails) as Array<[keyof typeof emails, string]>) {
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: role } });
      if (created.error || !created.data.user) throw created.error ?? new Error("Test user was not created");
      userIds.push(created.data.user.id);
      const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
      const signedIn = await client.auth.signInWithPassword({ email, password });
      if (signedIn.error) throw signedIn.error;
      clients[role] = client;
    }
  }, 30_000);

  afterAll(async () => {
    if (groupId) await clients.owner?.rpc("delete_group", { target_group_id: groupId });
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }, 30_000);

  test("enforces the expected permissions across the complete membership flow", async () => {
    const created = await clients.owner.rpc("create_group", { group_name: "RLS test", group_institution: "Codex", group_timezone: "America/Sao_Paulo" });
    expect(created.error).toBeNull();
    groupId = created.data as string;

    const invite = await clients.owner.rpc("regenerate_group_invite", { target_group_id: groupId });
    expect(invite.error).toBeNull();
    expect(invite.data).toMatch(/^[A-F0-9]{32}$/);

    const anonymous = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const anonymousPreview = await anonymous.rpc("get_group_invite", { invite_code: invite.data });
    expect(anonymousPreview.data ?? []).toHaveLength(0);

    const accepted = await clients.member.rpc("accept_group_invite", { invite_code: invite.data });
    expect(accepted.error).toBeNull();

    const peerProfile = await clients.member.from("profiles").select("id,email").eq("id", userIds[0]);
    expect(peerProfile.error).toBeNull();
    expect(peerProfile.data).toHaveLength(0);
    const memberDirectory = await clients.member.rpc("get_group_member_profiles", { target_group_id: groupId });
    expect(memberDirectory.error).toBeNull();
    expect(memberDirectory.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: userIds[0], name: "owner", role: "OWNER" }),
      expect.objectContaining({ id: userIds[1], name: "member", role: "MEMBER" }),
    ]));
    const outsiderDirectory = await clients.outsider.rpc("get_group_member_profiles", { target_group_id: groupId });
    expect(outsiderDirectory.error).not.toBeNull();

    const authenticatedPreview = await clients.member.rpc("get_group_invite", { invite_code: invite.data });
    expect(authenticatedPreview.error).toBeNull();
    expect(authenticatedPreview.data).toEqual([{ group_name: "RLS test" }]);

    const memberRead = await clients.member.from("groups").select("id").eq("id", groupId);
    expect(memberRead.data).toHaveLength(1);
    const outsiderRead = await clients.outsider.from("groups").select("id").eq("id", groupId);
    expect(outsiderRead.data).toHaveLength(0);

    const memberEntry = await clients.member.from("meal_entries").insert({ group_id: groupId, user_id: userIds[1], date: "2030-01-02", meal_type: "LUNCH", time: "12:00", status: "PLANNED" });
    expect(memberEntry.error).toBeNull();
    const impersonation = await clients.member.from("meal_entries").insert({ group_id: groupId, user_id: userIds[0], date: "2030-01-03", meal_type: "LUNCH", time: "12:00", status: "PLANNED" });
    expect(impersonation.error).not.toBeNull();
    const outsiderEntry = await clients.outsider.from("meal_entries").insert({ group_id: groupId, user_id: userIds[2], date: "2030-01-02", meal_type: "LUNCH", time: "12:00", status: "PLANNED" });
    expect(outsiderEntry.error).not.toBeNull();

    const deliveryAudit = await clients.owner.from("notification_deliveries").select("id");
    expect(deliveryAudit.error).not.toBeNull();
    const dispatchConfig = await clients.owner.from("notification_dispatch_config").select("cron_token");
    expect(dispatchConfig.error).not.toBeNull();
    const serviceDispatchConfig = await admin.from("notification_dispatch_config").select("cron_token").single();
    expect(serviceDispatchConfig.error).toBeNull();
    expect(serviceDispatchConfig.data?.cron_token).toMatch(/^[a-f0-9]{64}$/);

    const memberUpdate = await clients.member.from("groups").update({ name: "Not allowed" }).eq("id", groupId).select();
    expect(memberUpdate.data).toHaveLength(0);
    const ownerUpdate = await clients.owner.from("groups").update({ name: "Owner updated" }).eq("id", groupId).select("name").single();
    expect(ownerUpdate.data?.name).toBe("Owner updated");
  }, 30_000);
});
