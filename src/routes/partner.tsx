import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/partner")({ component: PartnerLayout });

function PartnerLayout() { return <Outlet />; }
