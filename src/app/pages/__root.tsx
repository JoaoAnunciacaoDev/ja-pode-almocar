import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AppProviders } from "@/app/providers/app-providers";

export const Route = createRootRoute({
  component: () => (
    <AppProviders>
      <Outlet />
    </AppProviders>
  ),
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-[var(--sand)] px-6 text-center">
      <div>
        <p className="text-5xl">🍽️</p>
        <h1 className="mt-5 font-serif text-4xl font-bold">Página não encontrada</h1>
      </div>
    </main>
  ),
});
