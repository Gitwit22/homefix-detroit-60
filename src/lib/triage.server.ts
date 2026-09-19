import { processRepair } from "./homefix-api";

export async function runTriageServer(repairNeedId: string) {
  return processRepair(repairNeedId);
}
