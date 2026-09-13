import { createFileRoute } from "@tanstack/react-router";

import { TodayPage } from "@/features/agenda/pages/today-page";

export const Route = createFileRoute("/")({ component: TodayPage });
