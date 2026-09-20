import assert from "node:assert/strict";
import test from "node:test";

import {
  HomeFixApiError,
  requestJsonWithOptionalSession,
  requestWithTimeout,
} from "./api-request.js";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("uses a valid session without retrying", async () => {
  const tokens: Array<string | undefined> = [];
  const result = await requestJsonWithOptionalSession<{ caseId: string }>({
    request: async (token) => {
      tokens.push(token);
      return jsonResponse(201, { caseId: "case-1" });
    },
    sessionToken: "valid-session",
    onInvalidSession: () => assert.fail("valid session should not be cleared"),
  });

  assert.deepEqual(tokens, ["valid-session"]);
  assert.equal(result.caseId, "case-1");
});

test("clears a rejected session and retries once anonymously", async () => {
  const tokens: Array<string | undefined> = [];
  let cleared = 0;
  const result = await requestJsonWithOptionalSession<{ caseId: string }>({
    request: async (token) => {
      tokens.push(token);
      return token
        ? jsonResponse(401, { error: "Demo session is invalid" })
        : jsonResponse(201, { caseId: "case-2" });
    },
    sessionToken: "stale-session",
    onInvalidSession: () => {
      cleared += 1;
    },
  });

  assert.deepEqual(tokens, ["stale-session", undefined]);
  assert.equal(cleared, 1);
  assert.equal(result.caseId, "case-2");
});

test("does not retry an anonymous 401", async () => {
  let requests = 0;

  await assert.rejects(
    requestJsonWithOptionalSession({
      request: async () => {
        requests += 1;
        return jsonResponse(401, { error: "Not authorized" });
      },
      onInvalidSession: () => assert.fail("anonymous request has no session to clear"),
    }),
    (error: unknown) =>
      error instanceof HomeFixApiError &&
      error.status === 401 &&
      error.message === "Not authorized",
  );
  assert.equal(requests, 1);
});

test("does not retry non-authentication failures and preserves backend details", async () => {
  let requests = 0;

  await assert.rejects(
    requestJsonWithOptionalSession({
      request: async () => {
        requests += 1;
        return jsonResponse(500, { error: "Unable to save intake submission" });
      },
      sessionToken: "valid-session",
      onInvalidSession: () => assert.fail("server failure should not clear the session"),
    }),
    (error: unknown) =>
      error instanceof HomeFixApiError &&
      error.status === 500 &&
      error.message === "Unable to save intake submission",
  );
  assert.equal(requests, 1);
});

test("falls back to the status when an error response is not JSON", async () => {
  await assert.rejects(
    requestJsonWithOptionalSession({
      request: async () => new Response("bad gateway", { status: 502 }),
      onInvalidSession: () => undefined,
    }),
    (error: unknown) =>
      error instanceof HomeFixApiError &&
      error.status === 502 &&
      error.message === "HomeFix API returned 502",
  );
});

test("aborts a request that exceeds its deadline", async () => {
  await assert.rejects(
    requestWithTimeout(
      (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
      5,
    ),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  );
});
