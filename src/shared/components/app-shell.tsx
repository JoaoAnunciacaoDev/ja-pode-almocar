import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--sand)] text-[var(--ink)]">
      <header className="border-b border-black/8 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--tomato)] text-xl shadow-[0_8px_24px_rgba(220,80,52,.22)]">🍽️</span>
            <span>Já pode almoçar?</span>
          </Link>
          <div className="flex items-center gap-3">
            <label className="hidden sm:block">
              <span className="sr-only">Grupo atual</span>
              <select className="rounded-full border-0 bg-transparent px-4 py-2 text-sm font-semibold text-black/60 outline-none transition hover:bg-black/5">
                <option>República do Bloco B</option>
              </select>
            </label>
            <div className="grid size-10 place-items-center rounded-full bg-[var(--ink)] text-sm font-bold text-white">MA</div>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
