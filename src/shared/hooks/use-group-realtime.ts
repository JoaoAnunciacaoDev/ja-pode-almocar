import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { requireSupabaseClient } from "@/shared/utils/supabase-client";

const groupTables = ["groups", "group_members", "group_invites", "group_meal_windows", "meal_routines", "meal_entries"] as const;

export function useGroupRealtime(groupId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    const client = requireSupabaseClient();
    let channel = client.channel(`group:${groupId}`);

    for (const table of groupTables) {
      const filter = table === "groups" ? `id=eq.${groupId}` : `group_id=eq.${groupId}`;
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        () => {
          void queryClient.invalidateQueries({
            predicate: ({ queryKey }) => queryKey.includes(groupId) || queryKey[0] === "groups",
          });
        },
      );
    }

    channel.subscribe();
    return () => { void client.removeChannel(channel); };
  }, [groupId, queryClient]);
}

