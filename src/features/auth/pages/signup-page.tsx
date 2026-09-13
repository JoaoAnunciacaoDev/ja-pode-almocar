import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";

export function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    localStorage.setItem("demo-session", "authenticated");
    await navigate({ to: "/grupos" });
  }

  return (
    <AuthShell eyebrow="Comece agora" title="Criar sua conta" description="Leva menos de um minuto. Depois você poderá criar ou entrar em um grupo.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-bold">Nome<input className={inputClassName} name="name" autoComplete="name" placeholder="Como seus amigos te chamam?" required /></label>
        <label className="block text-sm font-bold">E-mail<input className={inputClassName} type="email" name="email" autoComplete="email" placeholder="voce@universidade.edu.br" required /></label>
        <label className="block text-sm font-bold">Senha<input className={inputClassName} type="password" name="password" autoComplete="new-password" minLength={6} placeholder="Mínimo de 6 caracteres" required /></label>
        <button className={primaryButtonClassName} disabled={loading}>{loading ? "Criando…" : "Criar conta"}</button>
      </form>
      <p className="mt-7 text-center text-sm text-black/50">Já possui uma conta? <Link to="/entrar" className="font-bold text-[var(--tomato)]">Entrar</Link></p>
    </AuthShell>
  );
}
