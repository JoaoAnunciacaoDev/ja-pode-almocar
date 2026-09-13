import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSentTo(String(data.get("email")));
  }

  return (
    <AuthShell eyebrow="Recuperação" title="Esqueceu a senha?" description="Informe seu e-mail e enviaremos um link para você criar uma nova senha.">
      {sentTo ? (
        <div className="rounded-[24px] bg-white p-6 shadow-sm"><p className="text-3xl">📬</p><h2 className="mt-4 text-xl font-bold">Confira seu e-mail</h2><p className="mt-2 text-sm leading-6 text-black/55">No protótipo, simulamos o envio do link para <strong>{sentTo}</strong>.</p><Link to="/entrar" className="mt-6 block text-sm font-bold text-[var(--tomato)]">← Voltar para entrar</Link></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-bold">E-mail<input className={inputClassName} type="email" name="email" autoComplete="email" required /></label>
          <button className={primaryButtonClassName}>Enviar link de recuperação</button>
          <Link to="/entrar" className="block text-center text-sm font-bold text-[var(--tomato)]">← Voltar para entrar</Link>
        </form>
      )}
    </AuthShell>
  );
}
