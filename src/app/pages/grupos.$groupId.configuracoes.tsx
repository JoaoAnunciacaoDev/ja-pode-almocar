import { createFileRoute } from "@tanstack/react-router";

import { LegacyGroupRouteRedirect } from "@/features/groups/components/legacy-group-route-redirect";

export const Route = createFileRoute("/grupos/$groupId/configuracoes")({
  component: function SettingsRoute() {
    const { groupId } = Route.useParams();
    return <LegacyGroupRouteRedirect groupId={groupId} destination="settings" />;
  },
});
