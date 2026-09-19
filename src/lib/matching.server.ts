import { getCoverage } from "./homefix-api";

export async function getCoverageServer(caseId: string) {
  return getCoverage(caseId);
}
