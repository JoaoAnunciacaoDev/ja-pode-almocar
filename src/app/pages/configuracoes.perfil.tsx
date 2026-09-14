import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { ProfileSettingsPage } from "@/features/profile/pages/profile-settings-page";

export const Route = createFileRoute("/configuracoes/perfil")({
  component: () => <RequireAuth><ProfileSettingsPage /></RequireAuth>,
});

