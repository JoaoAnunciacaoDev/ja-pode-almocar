import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";

export const Route = createFileRoute("/g")({ component: () => <RequireAuth><Outlet /></RequireAuth> });
