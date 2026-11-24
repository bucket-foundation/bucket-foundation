export const UNLOCK_EVENTS = ["pointerup", "touchend", "click", "keydown"] as const;

type Target = { addEventListener(type: string, fn: () => void, capture: boolean): void; removeEventListener(type: string, fn: () => void, capture: boolean): void };

export function installAudioUnlock(target: Target, unlock: () => Promise<boolean>): () => void {
  let done = false;
  let busy = false;
  const detach = () => {
    done = true;
    for (const e of UNLOCK_EVENTS) target.removeEventListener(e, onGesture, true);
  };
  function onGesture() {
    if (done || busy) return;
    busy = true;
    unlock().then(
      (ok) => {
        busy = false;
        if (ok) detach();
      },
      () => {
        busy = false;
      },
    );
  }
  for (const e of UNLOCK_EVENTS) target.addEventListener(e, onGesture, true);
  return detach;
}
