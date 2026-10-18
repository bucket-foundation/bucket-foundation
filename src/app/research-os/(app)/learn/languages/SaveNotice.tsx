import type { SaveResult } from "@/lib/academy/lang-client";

export default function SaveNotice({ state }: { state: SaveResult | "idle" | "saving" }) {
  if (state !== "failed" && state !== "local-only") return null;
  return (
    <p role="alert" data-testid="save-notice" className="text-[12px] text-[color:var(--basalt-2)]">
      {state === "failed" ? "Your language systems did not reach the server after three tries. They are saved on this device; the next change retries the sync." : "Saved on this device. Sign in to sync your language systems."}
    </p>
  );
}
