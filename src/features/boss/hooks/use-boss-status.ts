import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { fetchBossStatus } from "@/features/boss/api/boss-api";

export function useBossStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["boss-status", user?.id],
    queryFn: () => (user ? fetchBossStatus(user.id) : Promise.resolve(false)),
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
  });
}
