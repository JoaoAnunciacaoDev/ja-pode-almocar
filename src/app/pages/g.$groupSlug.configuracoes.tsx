import { createFileRoute } from "@tanstack/react-router";

import { GroupSettingsPage } from "@/features/groups/pages/group-settings-page";

export const Route = createFileRoute("/g/$groupSlug/configuracoes")({
  component: function SettingsRoute() {
    const { groupSlug } = Route.useParams();
    return <GroupSettingsPage groupSlug={groupSlug} />;
  },
});
