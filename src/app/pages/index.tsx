import { createFileRoute } from "@tanstack/react-router";

import { TodayPage } from "@/features/agenda/pages/today-page";
import { RequireAuth } from "@/features/auth/components/require-auth";

export const Route = createFileRoute("/")({ component: () => <RequireAuth><TodayPage /></RequireAuth> });
