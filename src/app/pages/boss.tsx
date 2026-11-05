import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { BossDashboardPage } from "@/features/boss/pages/boss-dashboard-page";

export const Route = createFileRoute("/boss")({
  component: () => (
    <RequireAuth>
      <BossDashboardPage />
    </RequireAuth>
  ),
});
