"use client";
/**
 * src/app/verify/VerifyClient.tsx  (bkt-52p)
 * ----------------------------------------------------------------------------
 * Interactive verify island. Posts the pasted credential (JWT or id/URL, or a
 * JSON object) to POST /api/academy/credential/verify and renders the
 * result: signature / issuer / revocation checks, the asserted concepts, and the
 * live-consistency cross-check. Pure fetch, no secrets, works for anyone.
 */
import { useCallback, useEffect, useState } from "react";

interface PerConcept {
  code: string;
  name: string;
  stillHeld: boolean | null;
}
interface VerifyResult {
  valid: boolean;
  signatureValid: boolean;
  issuerTrusted: boolean;
  revoked: boolean | null;
  reasons: string[];
  credential?: {
    id?: string;
    issuanceDate?: string;
    credentialSubject?: {
      id?: string;
      "https://bucket.foundation/ns#handle"?: string;
      achievement?: Array<{
        name?: string;
        "https://bucket.foundation/ns#demonstratedDepth"?: string;
        alignment?: Array<{ targetUrl?: string; targetCode?: string }>;
      }>;
    };
  };
  consistency?: {
    checked: boolean;
    handle: string | null;
    stillConsistent: boolean | null;
    note: string;
    perConcept?: PerConcept[];
  };
}

export default function VerifyClient({ initial }: { initial: string }) {
  const [input, setInput] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      // Decide the body shape: JWT-ish / id-or-URL / JSON object.
      let body: Record<string, unknown>;
      if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
        body = { jwt: value };
      } else if (value.startsWith("{")) {
        try {
          body = { json: JSON.parse(value) };
        } catch {
          setErr("That looks like JSON but did not parse.");
          setBusy(false);
          return;
        }
      } else {
        body = { credential: value };
      }
      const res = await fetch("/api/academy/credential/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 404) {
        setErr("No credential found for that id or URL.");
        setBusy(false);
        return;
      }
      const data = (await res.json()) as VerifyResult & { error?: string };
      if (data.error) {
        setErr(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setErr("Verification request failed. Check the input and try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Auto-run when arriving with ?c=/?id= prefilled.
  useEffect(() => {
    if (initial) run(initial);
  }, [initial, run]);

  const subj = result?.credential?.credentialSubject;
  const handle = subj?.["https://bucket.foundation/ns#handle"] || null;
  const achievements = subj?.achievement || [];
  const consMap = new Map<string, boolean | null>();
  for (const p of result?.consistency?.perConcept || []) consMap.set(p.code, p.stillHeld);

  return (
    <div className="vfy-box">
      <label htmlFor="vfy-in" className="vfy-hint">
        Credential token (VC-JWT), credential id, or hosted URL:
      </label>
      <textarea
        id="vfy-in"
        className="vfy-ta"
        placeholder="eyJhbGciOiJFZERTQS003D...   — or — a credential id / https://www.bucket.foundation/api/academy/credential/<id>"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
      />
      <div className="vfy-actions">
        <button className="vfy-btn" disabled={busy || !input.trim()} onClick={() => run(input)}>
          {busy ? "Verifying…" : "Verify"}
        </button>
        <span className="vfy-hint">Cryptographic check against Bucket&apos;s published key.</span>
      </div>

      {err && (
        <div className="vfy-result bad">
          <div className="vfy-verdict bad">⚠ {err}</div>
        </div>
      )}

      {result && (
        <div className={"vfy-result " + (result.valid ? "ok" : "bad")}>
          <div className={"vfy-verdict " + (result.valid ? "ok" : "bad")}>
            {result.valid ? "✓ Verified" : "✗ Not verified"}
          </div>

          <ul className="vfy-checks">
            <Check ok={result.signatureValid} label="Signature (Ed25519 / EdDSA)" />
            <Check ok={result.issuerTrusted} label="Issuer is Bucket Foundation" />
            <Check
              ok={result.revoked === false}
              warn={result.revoked === null}
              label={
                result.revoked === true
                  ? "Revoked by issuer"
                  : result.revoked === null
                  ? "Revocation status unknown"
                  : "Not revoked"
              }
            />
          </ul>

          {handle && (
            <div className="vfy-subject">
              <div>
                Subject:{" "}
                <a className="vfy-link" href={`/m/${handle}`}>
                  @{handle}
                </a>
                {result.credential?.issuanceDate
                  ? ` · issued ${new Date(result.credential.issuanceDate).toLocaleDateString()}`
                  : ""}
              </div>

              {achievements.length > 0 && (
                <ul className="vfy-ach">
                  {achievements.map((a, i) => {
                    const code = a.alignment?.[0]?.targetCode || "";
                    const still = consMap.has(code) ? consMap.get(code) : undefined;
                    return (
                      <li key={i}>
                        <span>{a.name}</span>
                        <span className="vfy-depth">
                          {a["https://bucket.foundation/ns#demonstratedDepth"] || "depth"}
                        </span>
                        {still === true && <span className="vfy-still held">still held</span>}
                        {still === false && (
                          <span className="vfy-still gone">profile evolved</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {result.consistency && (
                <p className="vfy-reasons" style={{ marginTop: 10 }}>
                  <strong>
                    {result.consistency.stillConsistent === true
                      ? "Consistent with current profile."
                      : result.consistency.stillConsistent === false
                      ? "Point-in-time (profile has evolved)."
                      : "Live consistency not checked."}
                  </strong>{" "}
                  {result.consistency.note}
                </p>
              )}
            </div>
          )}

          {result.reasons.length > 0 && (
            <ul className="vfy-reasons">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Check({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const cls = warn ? "warn" : ok ? "ok" : "bad";
  const mark = warn ? "?" : ok ? "✓" : "✗";
  return (
    <li>
      <span className={"vfy-ck " + cls}>{mark}</span>
      <span>{label}</span>
    </li>
  );
}
