export type ResidentResource =
  | { type: "case"; id: string }
  | { type: "repair"; id: string };

const caseRoutePatterns = [
  { method: "GET", pattern: /^\/api\/v1\/cases\/([0-9a-f-]+)$/i },
  { method: "GET", pattern: /^\/api\/v1\/cases\/([0-9a-f-]+)\/coverage$/i },
  { method: "POST", pattern: /^\/api\/v1\/cases\/([0-9a-f-]+)\/process$/i },
  { method: "POST", pattern: /^\/api\/v1\/cases\/([0-9a-f-]+)\/documents$/i },
  {
    method: "POST",
    pattern: /^\/api\/v1\/cases\/([0-9a-f-]+)\/inspection\/availability$/i,
  },
] as const;

const repairRoutePatterns = [
  { method: "POST", pattern: /^\/api\/v1\/repairs\/([0-9a-f-]+)\/process$/i },
  { method: "POST", pattern: /^\/api\/v1\/repairs\/([0-9a-f-]+)\/photos$/i },
] as const;

export function residentResourceForRequest(
  pathname: string,
  method: string,
): ResidentResource | null {
  for (const route of caseRoutePatterns) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (match?.[1]) return { type: "case", id: match[1] };
  }

  for (const route of repairRoutePatterns) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (match?.[1]) return { type: "repair", id: match[1] };
  }

  return null;
}