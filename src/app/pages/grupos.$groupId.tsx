import { createFileRoute } from "@tanstack/react-router";

import { GroupDetailPage } from "@/features/groups/pages/group-detail-page";

export const Route = createFileRoute("/grupos/$groupId")({
  component: function GroupRoutePage() {
    const { groupId } = Route.useParams();
    return <GroupDetailPage groupId={groupId} />;
  },
});
