import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export type AuthState = { user: User | null; loading: boolean };
export const AuthContext = createContext<AuthState>({ user: null, loading: true });
