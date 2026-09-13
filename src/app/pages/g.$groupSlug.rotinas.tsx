import { createFileRoute } from "@tanstack/react-router";

import { MealRoutinesPage } from "@/features/agenda/pages/meal-routines-page";

export const Route = createFileRoute("/g/$groupSlug/rotinas")({
  component: function RoutinesRoute() {
    const { groupSlug } = Route.useParams();
    return <MealRoutinesPage groupSlug={groupSlug} />;
  },
});
