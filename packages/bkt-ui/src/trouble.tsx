import { ApiError } from "./api";

export const TROUBLE_GENERIC = "Bucket ran into a problem. Try again.";

export interface Trouble {
  text: string;
  raw: string | null;
}

export function trouble(e: unknown): Trouble {
  if (e instanceof ApiError) return { text: e.message, raw: null };
  if (e instanceof Error) return { text: TROUBLE_GENERIC, raw: e.message || e.name };
  if (typeof e === "string") return { text: e, raw: null };
  return { text: TROUBLE_GENERIC, raw: null };
}

export function RawDetails({ raw }: { raw: string | null | undefined }) {
  if (!raw) return null;
  return (
    <details className="raw">
      <summary>details</summary>
      <pre>{raw}</pre>
    </details>
  );
}

export function TroubleNote({ t, className = "error" }: { t: Trouble; className?: string }) {
  return (
    <div className={className} role="alert">
      <p>{t.text}</p>
      <RawDetails raw={t.raw} />
    </div>
  );
}
