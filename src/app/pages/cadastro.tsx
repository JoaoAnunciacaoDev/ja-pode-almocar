import { createFileRoute } from "@tanstack/react-router";

import { SignupPage } from "@/features/auth/pages/signup-page";

export const Route = createFileRoute("/cadastro")({ component: SignupPage });
