import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page";

export const Route = createFileRoute("/redefinir-senha")({ component: ResetPasswordPage });
