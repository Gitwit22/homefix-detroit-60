import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/partner/inspections')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/partner/inspections"!</div>
}
