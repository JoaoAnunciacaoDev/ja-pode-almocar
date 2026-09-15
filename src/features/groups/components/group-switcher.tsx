import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { fetchGroups } from "@/features/groups/api/groups-api";

export function GroupSwitcher({ groupSlug }: { groupSlug: string }) {
  const navigate = useNavigate();
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const groups = groupsQuery.data ?? [];

  if (groups.length < 2) return null;

  return (
    <select
      aria-label="Trocar grupo"
      title="Trocar grupo"
      value={groupSlug}
      onChange={(event) => navigate({ to: "/g/$groupSlug/hoje", params: { groupSlug: event.target.value } })}
      className="w-full rounded-xl border border-black/8 bg-[var(--cream)] px-3 py-2.5 text-xs font-bold outline-none focus:border-[var(--tomato)] md:w-auto md:max-w-48 md:px-2 md:py-2"
    >
      {groups.map((group) => <option key={group.id} value={group.slug}>{group.name}</option>)}
    </select>
  );
}
