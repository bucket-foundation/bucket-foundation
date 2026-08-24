"use client";
/**
 * src/app/m/[handle]/CredentialPanel.tsx  (bkt-52p)
 * ----------------------------------------------------------------------------
 * Surfaces the verifiable-credential layer on a public Mastery Profile:
 *
 *   - ALWAYS (every visitor): a "Verify" affordance linking to /verify, the
 *     viral backlink. A recruiter can verify any Bucket credential there.
 *
 *   - PROFILE OWNER ONLY: an "Issue / get verifiable credential" action. We
 *     detect ownership by recovering the Academy's Supabase session from the
 *     SAME-ORIGIN localStorage (storageKey "bucket-academy/auth") and checking
 *     the signed-in handle matches this profile. Issuance POSTs to
 *     /api/academy/credential/issue with the verified bearer token; the server
 *     re-derives identity from the token (never trusts the client), so this is
 *     a convenience surface. The trust boundary lives on the server.
 *
 * Copy stays (bkt-4at): "evidence of demonstrated mastery", never a score.
 * Degrades silently when sign-in is unconfigured or the visitor isn't the owner.
 */
import { useCallback, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface IssueResponse {
  ok?: boolean;
  id?: string;
  url?: string;
  jwt?: string;
  achievements?: number;
  error?: string;
  message?: string;
}

let _client: SupabaseClient | null = null;
function academyClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Same key the static Academy auth uses, so we share the same session.
      storageKey: "bucket-academy/auth",
    },
  });
  return _client;
}

export default function CredentialPanel({ handle }: { handle: string }) {
  const [isOwner, setIsOwner] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Recover the academy session (same-origin) and check ownership by handle.
  useEffect(() => {
    const sb = academyClient();
    if (!sb) return;
    let alive = true;
    sb.auth.getSession().then(async ({ data }) => {
      const sess = data.session;
      if (!alive || !sess?.access_token) return;
      setToken(sess.access_token);
      // Confirm the signed-in user owns THIS profile handle.
      try {
        const res = await fetch("/api/academy/profile?me=1", {
          headers: { Authorization: "Bearer " + sess.access_token },
        });
        if (!res.ok) return;
        const body = (await res.json()) as { profile?: { handle?: string } };
        if (alive && body.profile?.handle === handle) setIsOwner(true);
      } catch {
        /* not owner / offline, stay hidden */
      }
    });
    return () => {
      alive = false;
    };
  }, [handle]);

  const issue = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setIssued(null);
    try {
      const res = await fetch("/api/academy/credential/issue", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "content-type": "application/json" },
        body: "{}",
      });
      const body = (await res.json()) as IssueResponse;
      if (!res.ok || body.error) {
        setError(body.message || body.error || "Could not issue a credential right now.");
      } else {
        setIssued(body);
      }
    } catch {
      setError("Issuance request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }, [token]);

  const copyJwt = useCallback(() => {
    if (!issued?.jwt) return;
    navigator.clipboard?.writeText(issued.jwt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [issued]);

  return (
    <section className="cp-root">
      <Styles />
      <div className="cp-head">
        <span className="cp-ico" aria-hidden>
          ⛉
        </span>
        <div>
          <div className="cp-title">Verifiable credential</div>
          <div className="cp-sub">Open Badges 3.0 / W3C VC · signed with Bucket&apos;s key · no blockchain</div>
        </div>
      </div>

      {/* Owner: issue */}
      {isOwner && !issued && (
        <div className="cp-owner">
          <p className="cp-copy">
            Turn your proven concepts into a signed credential a recruiter can verify.
            Only concepts you&apos;ve demonstrated to <strong>Derive</strong> or{" "}
            <strong>Teach-back</strong>, mastered, with a spaced re-demonstration trail,
            are included. It attests <em>evidence of demonstrated mastery</em> — not a
            score or rating.
          </p>
          <button className="cp-btn" onClick={issue} disabled={busy}>
            {busy ? "Issuing…" : "Issue my verifiable credential"}
          </button>
          {error && <div className="cp-err">{error}</div>}
        </div>
      )}

      {/* Owner: issued result */}
      {isOwner && issued?.ok && (
        <div className="cp-issued">
          <div className="cp-issued-head">
            ✓ Issued — {issued.achievements} concept
            {issued.achievements === 1 ? "" : "s"} attested.
          </div>
          <div className="cp-actions">
            <a className="cp-btn sm" href={issued.url} target="_blank" rel="noreferrer">
              View signed credential
            </a>
            <a className="cp-btn sm ghost" href={`/verify?id=${issued.id}`}>
              Verify it
            </a>
            <button className="cp-btn sm ghost" onClick={copyJwt}>
              {copied ? "Copied" : "Copy token"}
            </button>
          </div>
        </div>
      )}

      {/* Everyone: verify affordance (the viral backlink) */}
      <div className="cp-verify">
        <a className="cp-verify-link" href="/verify">
          Verify a Bucket credential →
        </a>
        <span className="cp-verify-note">
          Cryptographically check any credential against Bucket&apos;s published key.
        </span>
      </div>
    </section>
  );
}

function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.cp-root{--bone:#EFE8D4;--bone-2:#E4DCC4;--card:#F5F0E1;--basalt:#1F1C16;--ink-dim:#4A4238;--ink-faint:#6F6A5E;--aegean:#2E6B6B;--aegean-deep:#1F4F4F;--gold:#B8861E;--gold-deep:#8A641A;--line:rgba(31,28,22,.12);--ok:#2f7d4f;--bad:#a3342b;
  background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:0 0 20px;font-family:"Fraunces",Georgia,serif;color:var(--basalt);}
.cp-head{display:flex;align-items:center;gap:10px;}
.cp-ico{color:var(--gold-deep);font-size:20px;}
.cp-title{font-family:"Cinzel",serif;font-size:16px;}
.cp-sub{font-size:12px;color:var(--ink-faint);}
.cp-owner,.cp-issued{margin-top:12px;}
.cp-copy{font-size:13.5px;line-height:1.55;color:var(--ink-dim);margin:0 0 10px;}
.cp-btn{display:inline-block;background:var(--aegean-deep);color:var(--bone);border:none;text-decoration:none;font-family:"Cinzel",serif;font-size:13px;letter-spacing:.03em;padding:10px 18px;border-radius:999px;cursor:pointer;}
.cp-btn:disabled{opacity:.5;cursor:default;}
.cp-btn.sm{font-size:12px;padding:8px 14px;}
.cp-btn.ghost{background:transparent;color:var(--aegean-deep);border:1px solid var(--line);}
.cp-err{margin-top:10px;color:var(--bad);font-size:13px;}
.cp-issued-head{color:var(--ok);font-family:"Cinzel",serif;font-size:14px;}
.cp-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.cp-verify{margin-top:14px;border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:3px;}
.cp-verify-link{color:var(--aegean-deep);font-family:"Cinzel",serif;font-size:13px;text-decoration:none;}
.cp-verify-link:hover{text-decoration:underline;}
.cp-verify-note{font-size:12px;color:var(--ink-faint);}
`,
      }}
    />
  );
}
