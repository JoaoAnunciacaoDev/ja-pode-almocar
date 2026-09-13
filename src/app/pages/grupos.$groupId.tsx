import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/grupos/$groupId")({ component: Outlet });
