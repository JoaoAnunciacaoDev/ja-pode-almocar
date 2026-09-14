import { requireSupabaseClient } from "@/shared/utils/supabase-client";
import { toAppError } from "@/shared/utils/app-error";

export async function updateProfile(name: string) {
  const client = requireSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw toAppError(userError, "Autenticação necessária.");
  const trimmedName = name.trim();
  const { error: profileError } = await client.from("profiles").update({ name: trimmedName }).eq("id", userData.user.id);
  if (profileError) throw toAppError(profileError);
  const { error: metadataError } = await client.auth.updateUser({ data: { name: trimmedName } });
  if (metadataError) throw toAppError(metadataError);
}

export async function updateEmail(email: string) {
  const { error } = await requireSupabaseClient().auth.updateUser({ email: email.trim() });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string) {
  const { error } = await requireSupabaseClient().auth.updateUser({ password });
  if (error) throw toAppError(error);
}

export async function deleteOwnAccount() {
  const { error } = await requireSupabaseClient().rpc("delete_own_account");
  if (error) throw toAppError(error);
}

