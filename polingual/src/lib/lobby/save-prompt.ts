export const SAVE_PROMPT_KEY = "polingual-web/save-score-prompt/v1";

type Store = Pick<Storage, "getItem" | "setItem">;

export function savePromptDue(store: Store | null, guest: boolean): boolean {
  if (!guest || !store) return false;
  try {
    return store.getItem(SAVE_PROMPT_KEY) === null;
  } catch {
    return false;
  }
}

export function markSavePrompt(store: Store | null): void {
  try {
    store?.setItem(SAVE_PROMPT_KEY, "seen");
  } catch {
    return;
  }
}
