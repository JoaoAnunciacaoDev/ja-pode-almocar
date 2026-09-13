import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { GroupRouteRedirect } from "@/features/groups/components/group-route-redirect";

export const Route = createFileRoute("/agenda")({ component: () => <RequireAuth><GroupRouteRedirect destination="agenda" /></RequireAuth> });
