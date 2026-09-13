import { createFileRoute } from "@tanstack/react-router";

import { CreateGroupPage } from "@/features/groups/pages/create-group-page";

export const Route = createFileRoute("/grupos/novo")({ component: CreateGroupPage });
