import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { inputClassName, primaryButtonClassName } from "@/shared/components/form-styles";

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    localStorage.setItem("demo-session", "authenticated");
    await navigate({ to: "/grupos" });
  }

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entrar" description="Acesse seus grupos e confira quem vai ao bandejão hoje.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-bold">E-mail<input className={inputClassName} type="email" name="email" autoComplete="email" placeholder="voce@universidade.edu.br" required /></label>
        <div><div className="flex items-center justify-between"><label htmlFor="password" className="text-sm font-bold">Senha</label><Link to="/esqueci-senha" className="text-xs font-bold text-[var(--tomato)]">Esqueci minha senha</Link></div><input id="password" className={inputClassName} type="password" name="password" autoComplete="current-password" minLength={6} required /></div>
        <button className={primaryButtonClassName} disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
      </form>
      <p className="mt-7 text-center text-sm text-black/50">Ainda não tem conta? <Link to="/cadastro" className="font-bold text-[var(--tomato)]">Criar conta</Link></p>
      <p className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-center text-xs text-black/40">Protótipo: qualquer e-mail e senha com 6 caracteres permitem continuar.</p>
    </AuthShell>
  );
}
