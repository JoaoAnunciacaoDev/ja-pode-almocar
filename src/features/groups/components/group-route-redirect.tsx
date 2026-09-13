import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";

import { fetchGroups } from "@/features/groups/api/groups-api";
import { getActiveGroup } from "@/features/groups/model/active-group";
import { AppShell } from "@/shared/components/app-shell";

type GroupDestination = "today" | "agenda" | "settings";

export function GroupRouteRedirect({ destination }: { destination: GroupDestination }) {
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });

  if (groupsQuery.isLoading) {
    return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Localizando seu grupo…</div></AppShell>;
  }

  const group = getActiveGroup(groupsQuery.data ?? []);
  if (!group) return <Navigate to="/grupos/novo" replace />;

  if (destination === "agenda") return <Navigate to="/g/$groupSlug/agenda" params={{ groupSlug: group.slug }} replace />;
  if (destination === "settings") return <Navigate to="/g/$groupSlug/configuracoes" params={{ groupSlug: group.slug }} replace />;
  return <Navigate to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} replace />;
}
