export type ContractorSession = {
  token: string;
  displayName: string;
};

const storageKey = "homefix:contractorSession";

export function getStoredContractorSession(): ContractorSession | null {
  const value = localStorage.getItem(storageKey);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<ContractorSession>;
    return typeof session.token === "string" && typeof session.displayName === "string"
      ? { token: session.token, displayName: session.displayName }
      : null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeContractorSession(session: ContractorSession) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearContractorSession() {
  localStorage.removeItem(storageKey);
}