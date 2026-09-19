type IntakePayload = {
  resident: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  property: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    occupancyType: "owner" | "renter";
    primaryResidence: boolean;
    yearsAtProperty?: number;
  };
  household: {
    householdSize?: number;
    incomeRange?: string;
    applicantAge?: number;
    seniorHousehold: boolean;
    childrenInHousehold: boolean;
    accessibilityNeeds: boolean;
  };
  repair: {
    category: string;
    description: string;
    startedWhen?: string;
    gettingWorse: boolean;
    safeToOccupy: boolean;
    urgency: string;
  };
};

type IntakeResponse = {
  success: true;
  caseId: string;
  caseNumber: string;
};

const apiUrl = import.meta.env.VITE_HOMEFIX_API_URL?.replace(/\/$/, "");

export async function submitIntake(payload: IntakePayload): Promise<IntakeResponse> {
  if (!apiUrl) {
    throw new Error("VITE_HOMEFIX_API_URL is not configured");
  }

  const response = await fetch(`${apiUrl}/api/v1/intakes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HomeFix API returned ${response.status}`);
  }

  return response.json() as Promise<IntakeResponse>;
}