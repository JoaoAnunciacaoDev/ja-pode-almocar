import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";
import { PasswordInput } from "@/shared/components/password-input";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export function SignupPage({ inviteCode }: { inviteCode?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    const data = new FormData(event.currentTarget);
    const { data: authData, error } = await requireSupabaseClient().auth.signUp({
      email: String(data.get("email")),
      password: String(data.get("password")),
      options: {
        data: { name: String(data.get("name")) },
        emailRedirectTo: inviteCode ? `${window.location.origin}/convite/${inviteCode}` : `${window.location.origin}/entrar`,
      },
    });
    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }
    if (authData.session) {
      if (inviteCode) {
        await navigate({ to: "/convite/$code", params: { code: inviteCode } });
      } else {
        await navigate({ to: "/grupos" });
      }
      return;
    }
    setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro.");
    setLoading(false);
  }

  return (
    <AuthShell eyebrow="Comece agora" title="Criar sua conta" description="Leva menos de um minuto. Depois você poderá criar ou entrar em um grupo.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-bold">Nome<input className={inputClassName} name="name" autoComplete="name" placeholder="Como seus amigos te chamam?" required /></label>
        <label className="block text-sm font-bold">E-mail<input className={inputClassName} type="email" name="email" autoComplete="email" placeholder="voce@universidade.edu.br" required /></label>
        <label className="block text-sm font-bold">Senha<PasswordInput name="password" autoComplete="new-password" minLength={6} placeholder="Mínimo de 6 caracteres" required /></label>
        {errorMessage && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}
        {message && <p role="status" className="rounded-2xl bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-white">{message}</p>}
        <button className={primaryButtonClassName} disabled={loading || Boolean(message)}>{loading ? "Criando…" : "Criar conta"}</button>
      </form>
      <p className="mt-7 text-center text-sm text-black/50">Já possui uma conta? <Link to="/entrar" search={{ invite: inviteCode }} className="font-bold text-[var(--tomato)]">Entrar</Link></p>
    </AuthShell>
  );
}
