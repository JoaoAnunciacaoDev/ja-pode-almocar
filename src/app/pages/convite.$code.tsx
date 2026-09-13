import { createFileRoute } from "@tanstack/react-router";

import { InvitePage } from "@/features/groups/pages/invite-page";

export const Route = createFileRoute("/convite/$code")({
  component: function InviteRoutePage() {
    const { code } = Route.useParams();
    return <InvitePage code={code} />;
  },
});
