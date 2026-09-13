import { createFileRoute } from "@tanstack/react-router";

import { SignupPage } from "@/features/auth/pages/signup-page";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({ invite: typeof search.invite === "string" ? search.invite : undefined }),
  component: function SignupRoute() {
    const { invite } = Route.useSearch();
    return <SignupPage inviteCode={invite} />;
  },
});
