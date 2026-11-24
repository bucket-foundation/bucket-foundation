"use client";

import { useEffect, useState, type FormEvent } from "react";
import SignIn from "@/app/(site)/app/SignIn";
import { appAuth } from "@/lib/app/auth";
import { giftCopy, giftDay, redeemGift, type GiftLang } from "@/lib/gift";
import { Button, ButtonLink, Field, Input, Sheet, Stack } from "@/ui";

type State = { kind: "checking" } | { kind: "signed-out" } | { kind: "ready" } | { kind: "busy" } | { kind: "done"; until: string | null };

export default function Redeem({ lang }: { lang: GiftLang }) {
  const c = giftCopy(lang);
  const [state, setState] = useState<State>({ kind: "checking" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function check() {
    const userId = await appAuth()
      .userId()
      .catch(() => null);
    setState({ kind: userId ? "ready" : "signed-out" });
  }

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get("code") ?? "");
    void check();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: "busy" });
    setError(null);
    const token = await appAuth()
      .mobile.accessToken()
      .catch(() => null);
    const r = await redeemGift(code, token, lang);
    if (r.ok) setState({ kind: "done", until: r.value });
    else {
      setError(r.error);
      setState({ kind: "ready" });
    }
  }

  if (state.kind === "checking") return null;
  if (state.kind === "signed-out") return <SignIn copy={c.signIn} flame={false} onSignedIn={() => void check()} />;
  if (state.kind === "done") {
    return (
      <Stack>
        <p role="status" data-testid="gift-redeemed">{c.done(giftDay(state.until, lang))}</p>
        <ButtonLink href="/app">{c.open}</ButtonLink>
      </Stack>
    );
  }
  return (
    <Sheet as="form" onSubmit={submit} data-testid="gift-redeem-form">
      <Stack>
        <Field label={c.code}>
          <Input name="code" required autoComplete="off" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} data-testid="gift-code" />
        </Field>
        <Button type="submit" disabled={state.kind === "busy"}>{state.kind === "busy" ? c.redeeming : c.redeem}</Button>
        {error ? <p role="alert">{error}</p> : null}
      </Stack>
    </Sheet>
  );
}
