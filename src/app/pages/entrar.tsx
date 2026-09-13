import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/pages/login-page";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({ invite: typeof search.invite === "string" ? search.invite : undefined }),
  component: function LoginRoute() {
    const { invite } = Route.useSearch();
    return <LoginPage inviteCode={invite} />;
  },
});
