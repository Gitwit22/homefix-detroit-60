import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/programs/$programId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/programs/$programId"!</div>;
}
