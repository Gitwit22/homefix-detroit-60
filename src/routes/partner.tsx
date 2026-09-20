import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/partner")({ component: PartnerLayout });

function PartnerLayout() {
	return (
		<>
			<div className="border-b border-foreground bg-warning/25 px-4 py-2 text-center text-xs font-bold sm:px-6">
				Partner Intelligence uses synthetic planning data for demonstration.
			</div>
			<Outlet />
		</>
	);
}
