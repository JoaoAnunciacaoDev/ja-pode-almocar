import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";
import { PasswordInput } from "@/shared/components/password-input";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";
import { getErrorMessage } from "@/shared/utils/app-error";

export function LoginPage({ inviteCode }: { inviteCode?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    const data = new FormData(event.currentTarget);
    const { error } = await requireSupabaseClient().auth.signInWithPassword({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    if (error) {
      setErrorMessage(getErrorMessage(error));
      setLoading(false);
      return;
    }
    if (inviteCode) {
      await navigate({ to: "/convite/$code", params: { code: inviteCode } });
      return;
    }
    await navigate({ to: "/grupos" });
  }

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entrar" description="Acesse seus grupos e confira quem vai ao bandejão hoje.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-bold">E-mail<input className={inputClassName} type="email" name="email" autoComplete="email" placeholder="voce@universidade.edu.br" required /></label>
        <div><div className="flex items-center justify-between"><label htmlFor="password" className="text-sm font-bold">Senha</label><Link to="/esqueci-senha" className="text-xs font-bold text-[var(--tomato)]">Esqueci minha senha</Link></div><PasswordInput id="password" name="password" autoComplete="current-password" minLength={6} required /></div>
        {errorMessage && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}
        <button className={primaryButtonClassName} disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
      </form>
      <p className="mt-7 text-center text-sm text-black/50">Ainda não tem conta? <Link to="/cadastro" search={{ invite: inviteCode }} className="font-bold text-[var(--tomato)]">Criar conta</Link></p>
    </AuthShell>
  );
}
