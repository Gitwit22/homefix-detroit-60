import assert from "node:assert/strict";
import test from "node:test";

import { intakeAssistanceSchema } from "./intakeAssistance.js";

test("self-completed intake does not accept assistant data", () => {
  assert.equal(
    intakeAssistanceSchema.safeParse({
      fillingOutForSomeoneElse: false,
      assistant: {
        name: "Angela Carter",
        phone: "3135550123",
        primaryContact: false,
        permissionAcknowledged: false,
      },
    }).success,
    false,
  );
});

test("assistant may be authorized without becoming primary", () => {
  assert.equal(
    intakeAssistanceSchema.safeParse({
      fillingOutForSomeoneElse: true,
      assistant: {
        name: "Angela Carter",
        phone: "3135550123",
        relationship: "Daughter",
        primaryContact: false,
        permissionAcknowledged: false,
      },
    }).success,
    true,
  );
});

test("primary assistant requires permission acknowledgment", () => {
  const withoutPermission = intakeAssistanceSchema.safeParse({
    fillingOutForSomeoneElse: true,
    assistant: {
      name: "Angela Carter",
      phone: "3135550123",
      primaryContact: true,
      permissionAcknowledged: false,
    },
  });
  const withPermission = intakeAssistanceSchema.safeParse({
    fillingOutForSomeoneElse: true,
    assistant: {
      name: "Angela Carter",
      phone: "3135550123",
      primaryContact: true,
      permissionAcknowledged: true,
    },
  });

  assert.equal(withoutPermission.success, false);
  assert.equal(withPermission.success, true);
});