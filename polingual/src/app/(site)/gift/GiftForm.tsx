"use client";

import { useEffect, useState, type FormEvent } from "react";
import { GIFT_CLOSED, giftCopy, loadGiftStatus, NAME_MAX, NOTE_MAX, startGiftCheckout, type GiftLang, type GiftStatus } from "@/lib/gift";
import { Button, Field, Input, Sheet, Stack } from "@/ui";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function GiftForm({ lang }: { lang: GiftLang }) {
  const c = giftCopy(lang);
  const [status, setStatus] = useState<GiftStatus>(GIFT_CLOSED);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPaid(new URLSearchParams(window.location.search).get("paid") === "1");
    void loadGiftStatus().then(setStatus);
  }, []);

  async function submit(e: FormEvent<HTMLElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await startGiftCheckout(Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)), lang);
    if (r.ok) window.location.assign(r.value);
    else {
      setError(r.error);
      setBusy(false);
    }
  }

  if (paid) return <p role="status" data-testid="gift-paid">{c.paid}</p>;
  return (
    <Sheet as="form" onSubmit={submit} data-testid="gift-form">
      <Stack>
        {status.price ? <p data-testid="gift-price">{c.price(status.price)}</p> : null}
        <Field label={c.buyerEmail} hint={c.buyerHint}>
          <Input name="buyerEmail" type="email" autoComplete="email" required />
        </Field>
        <Field label={c.recipientName}>
          <Input name="recipientName" required maxLength={NAME_MAX} />
        </Field>
        <Field label={c.recipientEmail}>
          <Input name="recipientEmail" type="email" required />
        </Field>
        <Field label={c.note} hint={c.noteHint}>
          <Input name="note" maxLength={NOTE_MAX} />
        </Field>
        <Field label={c.deliverOn} hint={c.deliverHint}>
          <Input name="deliverOn" type="date" min={today()} defaultValue={today()} required />
        </Field>
        <Button type="submit" variant="accent" size="md" disabled={!status.open || busy} data-testid="gift-buy">
          {!status.open ? c.soon : busy ? c.sending : c.buy}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
      </Stack>
    </Sheet>
  );
}
