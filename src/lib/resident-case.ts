export const lastCaseStorageKey = "homefix:lastCaseId";

export function resolveResidentCaseId(searchCaseId: string) {
  if (searchCaseId) return searchCaseId;
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(lastCaseStorageKey) ?? "";
}