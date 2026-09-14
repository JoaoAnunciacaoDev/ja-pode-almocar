import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { deleteOwnAccount, updateEmail, updatePassword, updateProfile } from "@/features/profile/api/profile-api";
import { AppShell } from "@/shared/components/app-shell";
import { inputClassName } from "@/shared/components/form-styles";
import { getErrorMessage } from "@/shared/utils/app-error";

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusy(key); setError(null); setFeedback(null);
    try { await action(); setFeedback(success); } catch (value) { setError(getErrorMessage(value)); } finally { setBusy(null); }
  }

  function field(event: FormEvent<HTMLFormElement>, name: string) {
    return String(new FormData(event.currentTarget).get(name));
  }

  return <AppShell><div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12">
    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--tomato)]">Minha conta</p><h1 className="mt-2 font-serif text-4xl font-bold">Configurações do perfil</h1>
    {feedback && <p role="status" className="mt-5 rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">✓ {feedback}</p>}
    {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    <div className="mt-8 space-y-5">
      <form onSubmit={(event) => { event.preventDefault(); void run("name", () => updateProfile(field(event, "name")), "Nome atualizado."); }} className="rounded-[24px] bg-white p-6"><h2 className="text-xl font-bold">Nome</h2><label className="mt-4 block text-sm font-bold">Nome exibido<input name="name" defaultValue={String(user?.user_metadata.name ?? "")} maxLength={100} required className={inputClassName} /></label><button disabled={busy !== null} className="mt-4 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Salvar nome</button></form>
      <form onSubmit={(event) => { event.preventDefault(); void run("email", () => updateEmail(field(event, "email")), "Solicitação enviada. Confirme o novo e-mail."); }} className="rounded-[24px] bg-white p-6"><h2 className="text-xl font-bold">E-mail</h2><label className="mt-4 block text-sm font-bold">Novo e-mail<input name="email" type="email" defaultValue={user?.email} required className={inputClassName} /></label><button disabled={busy !== null} className="mt-4 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Alterar e-mail</button></form>
      <form onSubmit={(event) => { event.preventDefault(); const password = field(event, "password"); const confirmation = field(event, "confirmation"); if (password !== confirmation) { setError("As senhas não coincidem."); return; } void run("password", () => updatePassword(password), "Senha atualizada."); }} className="rounded-[24px] bg-white p-6"><h2 className="text-xl font-bold">Senha</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Nova senha<input name="password" type="password" minLength={8} required className={inputClassName} /></label><label className="text-sm font-bold">Confirmar senha<input name="confirmation" type="password" minLength={8} required className={inputClassName} /></label></div><button disabled={busy !== null} className="mt-4 rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Alterar senha</button></form>
      <section className="rounded-[24px] border border-red-200 bg-red-50 p-6"><h2 className="text-xl font-bold text-red-800">Excluir conta</h2><p className="mt-2 text-sm text-red-700">A exclusão é permanente. Antes, transfira ou exclua os grupos dos quais você é proprietário.</p><label className="mt-4 block text-sm font-bold text-red-800">Digite EXCLUIR para confirmar<input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} className={inputClassName} /></label><button type="button" disabled={deleteText !== "EXCLUIR" || busy !== null} onClick={() => void run("delete", async () => { await deleteOwnAccount(); await navigate({ to: "/entrar", search: { invite: undefined } }); }, "Conta excluída.")} className="mt-4 rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Excluir minha conta</button></section>
    </div>
  </div></AppShell>;
}

