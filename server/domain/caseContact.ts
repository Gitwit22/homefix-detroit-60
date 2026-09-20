export type ResidentContact = {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

export type AssistantCaseContact = {
  contactType: "assistant";
  name: string;
  phone: string;
  relationship: string | null;
  isPrimaryContact: boolean;
};

export type PrimaryCaseContact = {
  contactType: "resident" | "assistant";
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  assistingWithApplication: boolean;
};

export function resolvePrimaryCaseContact(
  resident: ResidentContact,
  assistant?: AssistantCaseContact | null,
): PrimaryCaseContact {
  if (assistant?.isPrimaryContact) {
    return {
      contactType: "assistant",
      name: assistant.name,
      phone: assistant.phone,
      email: null,
      relationship: assistant.relationship,
      assistingWithApplication: true,
    };
  }

  return {
    contactType: "resident",
    name: `${resident.firstName} ${resident.lastName}`.trim(),
    phone: resident.phone,
    email: resident.email,
    relationship: null,
    assistingWithApplication: false,
  };
}