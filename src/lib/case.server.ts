import { getCase } from "./homefix-api";

export async function getCaseServer(caseId: string) {
  return getCase(caseId);
}
