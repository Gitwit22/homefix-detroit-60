import { z } from "zod";

const assistantSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(40),
    relationship: z.string().trim().max(80).optional(),
    primaryContact: z.boolean(),
    permissionAcknowledged: z.boolean(),
  })
  .superRefine((assistant, context) => {
    if (assistant.primaryContact && !assistant.permissionAcknowledged) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["permissionAcknowledged"],
        message: "Permission acknowledgment is required for a primary assistant",
      });
    }
  });

export const intakeAssistanceSchema = z.discriminatedUnion("fillingOutForSomeoneElse", [
  z.object({
    fillingOutForSomeoneElse: z.literal(false),
    assistant: z.never().optional(),
  }),
  z.object({
    fillingOutForSomeoneElse: z.literal(true),
    assistant: assistantSchema,
  }),
]);