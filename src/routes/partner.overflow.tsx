import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/partner/overflow")({ component: OverflowLayout });
function OverflowLayout() { return <Outlet />; }
