export class HomeFixApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HomeFixApiError";
  }
}

export async function homeFixApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  const message =
    typeof payload?.error === "string" && payload.error.trim()
      ? payload.error
      : `HomeFix API returned ${response.status}`;
  return new HomeFixApiError(response.status, message);
}

export async function requestWithTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await request(controller.signal);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function requestJsonWithOptionalSession<T>({
  request,
  sessionToken,
  onInvalidSession,
}: {
  request: (sessionToken?: string) => Promise<Response>;
  sessionToken?: string;
  onInvalidSession: () => void;
}): Promise<T> {
  let response = await request(sessionToken);
  if (response.status === 401 && sessionToken) {
    onInvalidSession();
    response = await request();
  }

  if (!response.ok) throw await homeFixApiError(response);
  return response.json() as Promise<T>;
}
