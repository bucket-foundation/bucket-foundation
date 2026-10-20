export function outboxStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
