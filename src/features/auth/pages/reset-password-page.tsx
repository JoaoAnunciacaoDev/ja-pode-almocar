import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { primaryButtonClassName } from "@/shared/components/form-styles";
import { PasswordInput } from "@/shared/components/password-input";
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
      {done ? <div className="rounded-2xl bg-[var(--sage)] p-5 text-white"><p className="flex items-center gap-2 font-bold"><Check aria-hidden="true" className="size-4" />Senha atualizada</p><Link to="/entrar" search={{ invite: undefined }} className="mt-4 inline-block text-sm font-bold underline">Entrar novamente</Link></div> : <form onSubmit={handleSubmit} className="space-y-5"><label className="block text-sm font-bold">Nova senha<PasswordInput name="password" minLength={6} autoComplete="new-password" required /></label><label className="block text-sm font-bold">Confirmar senha<PasswordInput name="confirmation" minLength={6} autoComplete="new-password" required /></label>{errorMessage && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}<button className={primaryButtonClassName}>Salvar nova senha</button></form>}
    </AuthShell>
  );
}
