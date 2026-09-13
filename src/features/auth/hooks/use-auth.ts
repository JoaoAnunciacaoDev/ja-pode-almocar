import { useContext } from "react";

import { AuthContext } from "@/features/auth/model/auth-context";

export function useAuth() {
  return useContext(AuthContext);
}
