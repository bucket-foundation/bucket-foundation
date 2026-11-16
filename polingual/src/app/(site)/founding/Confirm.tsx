"use client";

import { useState } from "react";
import { Button } from "@/ui";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done"; left: number | null } | { kind: "error"; message: string };

async function confirm(token: string): Promise<State> {
  try {
    const r = await fetch("/api/founding/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; left?: number };
    if (!r.ok) return { kind: "error", message: j.error || "Your spot was not confirmed. Try again in a minute." };
    return { kind: "done", left: typeof j.left === "number" ? j.left : null };
  } catch {
    return { kind: "error", message: "Could not reach the signup service." };
  }
}

export default function Confirm({ total }: { total: number }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit() {
    setState({ kind: "sending" });
    setState(await confirm(new URLSearchParams(window.location.search).get("token") ?? ""));
  }

  if (state.kind === "done") {
    return <p data-testid="founding-confirmed">Your spot is confirmed. Check your email for the details.{state.left === null ? "" : ` ${state.left} of ${total} left.`}</p>;
  }
  return (
    <>
      <Button variant="accent" size="md" onClick={submit} disabled={state.kind === "sending"} data-testid="founding-confirm">
        {state.kind === "sending" ? "Confirming" : "Confirm my spot"}
      </Button>
      {state.kind === "error" ? <p role="alert">{state.message}</p> : null}
    </>
  );
}
