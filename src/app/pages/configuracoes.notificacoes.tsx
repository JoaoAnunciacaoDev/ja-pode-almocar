import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/require-auth";
import { NotificationSettingsPage } from "@/features/notifications/pages/notification-settings-page";

export const Route = createFileRoute("/configuracoes/notificacoes")({
  component: () => <RequireAuth><NotificationSettingsPage /></RequireAuth>,
});
