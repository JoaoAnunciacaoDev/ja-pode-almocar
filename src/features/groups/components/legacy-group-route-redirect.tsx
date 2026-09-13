import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";

import { fetchGroup } from "@/features/groups/api/groups-api";
import { AppShell } from "@/shared/components/app-shell";

type GroupDestination = "details" | "today" | "agenda" | "settings";

export function LegacyGroupRouteRedirect({ groupId, destination }: { groupId: string; destination: GroupDestination }) {
  const groupQuery = useQuery({ queryKey: ["groups", groupId], queryFn: () => fetchGroup(groupId) });
  const group = groupQuery.data;

  if (groupQuery.isLoading) return <AppShell><div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-black/45">Atualizando endereço do grupo…</div></AppShell>;
  if (!group || groupQuery.error) return <Navigate to="/grupos" replace />;

  if (destination === "today") return <Navigate to="/g/$groupSlug/hoje" params={{ groupSlug: group.slug }} replace />;
  if (destination === "agenda") return <Navigate to="/g/$groupSlug/agenda" params={{ groupSlug: group.slug }} replace />;
  if (destination === "settings") return <Navigate to="/g/$groupSlug/configuracoes" params={{ groupSlug: group.slug }} replace />;
  return <Navigate to="/g/$groupSlug" params={{ groupSlug: group.slug }} replace />;
}
