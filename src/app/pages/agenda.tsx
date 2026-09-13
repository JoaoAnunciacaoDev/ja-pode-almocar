import { createFileRoute } from "@tanstack/react-router";

import { WeeklyAgendaPage } from "@/features/agenda/pages/weekly-agenda-page";
import { RequireAuth } from "@/features/auth/components/require-auth";

export const Route = createFileRoute("/agenda")({ component: () => <RequireAuth><WeeklyAgendaPage /></RequireAuth> });
