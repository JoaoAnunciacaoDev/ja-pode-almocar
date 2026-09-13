import { createFileRoute } from "@tanstack/react-router";

import { WeeklyAgendaPage } from "@/features/agenda/pages/weekly-agenda-page";

export const Route = createFileRoute("/agenda")({ component: WeeklyAgendaPage });
