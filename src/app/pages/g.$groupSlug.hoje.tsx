import { createFileRoute } from "@tanstack/react-router";

import { TodayPage } from "@/features/agenda/pages/today-page";

export const Route = createFileRoute("/g/$groupSlug/hoje")({
  component: function TodayRoute() {
    const { groupSlug } = Route.useParams();
    return <TodayPage groupSlug={groupSlug} />;
  },
});
