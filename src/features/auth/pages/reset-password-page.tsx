import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";
import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirmation = String(data.get("confirmation"));
    if (password !== confirmation) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }
    const { error } = await requireSupabaseClient().auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <AuthShell eyebrow="Nova senha" title="Redefinir senha" description="Escolha uma nova senha para sua conta.">
      {done ? <div className="rounded-2xl bg-[var(--sage)] p-5 text-white"><p className="font-bold">✓ Senha atualizada</p><Link to="/entrar" className="mt-4 inline-block text-sm font-bold underline">Entrar novamente</Link></div> : <form onSubmit={handleSubmit} className="space-y-5"><label className="block text-sm font-bold">Nova senha<input className={inputClassName} name="password" type="password" minLength={6} required /></label><label className="block text-sm font-bold">Confirmar senha<input className={inputClassName} name="confirmation" type="password" minLength={6} required /></label>{errorMessage && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}<button className={primaryButtonClassName}>Salvar nova senha</button></form>}
    </AuthShell>
  );
}
