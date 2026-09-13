import { createFileRoute } from "@tanstack/react-router";

import { WeeklyAgendaPage } from "@/features/agenda/pages/weekly-agenda-page";

export const Route = createFileRoute("/g/$groupSlug/agenda")({
  component: function AgendaRoute() {
    const { groupSlug } = Route.useParams();
    return <WeeklyAgendaPage groupSlug={groupSlug} />;
  },
});
