import assert from "node:assert/strict";
import test from "node:test";

import { resolvePrimaryCaseContact } from "./caseContact.js";

const resident = {
  firstName: "Denise",
  lastName: "Carter",
  phone: "3135550100",
  email: "denise@example.com",
};

const assistant = {
  contactType: "assistant" as const,
  name: "Angela Carter",
  phone: "3135550123",
  relationship: "Daughter",
  isPrimaryContact: false,
};

test("resident is primary when the case has no assistant", () => {
  assert.deepEqual(resolvePrimaryCaseContact(resident), {
    contactType: "resident",
    name: "Denise Carter",
    phone: "3135550100",
    email: "denise@example.com",
    relationship: null,
    assistingWithApplication: false,
  });
});

test("resident remains primary when an assistant is not primary", () => {
  assert.equal(resolvePrimaryCaseContact(resident, assistant).contactType, "resident");
});

test("primary assistant receives communications without replacing the resident", () => {
  assert.deepEqual(resolvePrimaryCaseContact(resident, { ...assistant, isPrimaryContact: true }), {
    contactType: "assistant",
    name: "Angela Carter",
    phone: "3135550123",
    email: null,
    relationship: "Daughter",
    assistingWithApplication: true,
  });
});