import type { GroupSummary } from "@/features/groups/api/groups-api";

const activeGroupKey = "active-group-id";

export function getActiveGroup(groups: GroupSummary[]) {
  const activeId = localStorage.getItem(activeGroupKey);
  return groups.find((group) => group.id === activeId) ?? groups[0] ?? null;
}
