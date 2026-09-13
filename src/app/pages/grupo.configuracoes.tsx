import { createFileRoute } from "@tanstack/react-router";

import { GroupSettingsPage } from "@/features/groups/pages/group-settings-page";
import { RequireAuth } from "@/features/auth/components/require-auth";

export const Route = createFileRoute("/grupo/configuracoes")({ component: () => <RequireAuth><GroupSettingsPage /></RequireAuth> });
