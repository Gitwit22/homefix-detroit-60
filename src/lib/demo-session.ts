export type DemoSession = {
  token: string;
  displayName: string;
};

const storageKey = "homefix:demoSession";

export function getStoredDemoSession(): DemoSession | null {
  const value = sessionStorage.getItem(storageKey);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<DemoSession>;
    return typeof session.token === "string" && typeof session.displayName === "string"
      ? { token: session.token, displayName: session.displayName }
      : null;
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function storeDemoSession(session: DemoSession) {
  sessionStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearDemoSession() {
  sessionStorage.removeItem(storageKey);
}
