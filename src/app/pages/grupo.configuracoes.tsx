import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { GroupRouteRedirect } from "@/features/groups/components/group-route-redirect";

export const Route = createFileRoute("/grupo/configuracoes")({ component: () => <RequireAuth><GroupRouteRedirect destination="settings" /></RequireAuth> });
