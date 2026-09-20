export const opportunityTypes = ["inspection", "repair", "training"] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const opportunityStatuses = [
  "open",
  "responses_received",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const opportunityResponseTypes = [
  "inspection_interest",
  "repair_interest",
  "bid",
  "training_interest",
] as const;
export type OpportunityResponseType = (typeof opportunityResponseTypes)[number];

export const opportunityResponseStatuses = [
  "submitted",
  "shortlisted",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export type OpportunityResponseStatus = (typeof opportunityResponseStatuses)[number];

export const opportunityAssignmentStatuses = ["active", "completed", "revoked"] as const;
export type OpportunityAssignmentStatus = (typeof opportunityAssignmentStatuses)[number];

const opportunityTransitions: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  open: ["responses_received", "assigned", "cancelled"],
  responses_received: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const responseTransitions: Record<OpportunityResponseStatus, readonly OpportunityResponseStatus[]> =
  {
    submitted: ["shortlisted", "accepted", "declined", "withdrawn"],
    shortlisted: ["accepted", "declined", "withdrawn"],
    accepted: [],
    declined: [],
    withdrawn: [],
  };

const assignmentTransitions: Record<
  OpportunityAssignmentStatus,
  readonly OpportunityAssignmentStatus[]
> = {
  active: ["completed", "revoked"],
  completed: [],
  revoked: [],
};

function assertTransition<TStatus extends string>(
  entity: string,
  from: TStatus,
  to: TStatus,
  transitions: Record<TStatus, readonly TStatus[]>,
) {
  if (!transitions[from].includes(to)) {
    throw new Error(`Invalid ${entity} status transition: ${from} -> ${to}`);
  }
}

export function assertOpportunityTransition(from: OpportunityStatus, to: OpportunityStatus) {
  assertTransition("opportunity", from, to, opportunityTransitions);
}

export function assertOpportunityResponseTransition(
  from: OpportunityResponseStatus,
  to: OpportunityResponseStatus,
) {
  assertTransition("opportunity response", from, to, responseTransitions);
}

export function assertOpportunityAssignmentTransition(
  from: OpportunityAssignmentStatus,
  to: OpportunityAssignmentStatus,
) {
  assertTransition("opportunity assignment", from, to, assignmentTransitions);
}

export function responseTypesForOpportunity(
  type: OpportunityType,
): readonly OpportunityResponseType[] {
  if (type === "inspection") return ["inspection_interest"];
  if (type === "repair") return ["repair_interest", "bid"];
  return ["training_interest"];
}
