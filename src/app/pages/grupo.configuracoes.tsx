import { createFileRoute } from "@tanstack/react-router";

import { GroupSettingsPage } from "@/features/groups/pages/group-settings-page";

export const Route = createFileRoute("/grupo/configuracoes")({ component: GroupSettingsPage });
