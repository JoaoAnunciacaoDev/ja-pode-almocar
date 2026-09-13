import { createFileRoute } from "@tanstack/react-router";

import { GroupDetailPage } from "@/features/groups/pages/group-detail-page";

export const Route = createFileRoute("/g/$groupSlug/")({
  component: function GroupRoute() {
    const { groupSlug } = Route.useParams();
    return <GroupDetailPage groupSlug={groupSlug} />;
  },
});
