import { submitIntake } from "./homefix-api";

type SubmitPayload = Parameters<typeof submitIntake>[0];

export async function submitIntakeServer(payload: SubmitPayload) {
  return submitIntake(payload);
}
