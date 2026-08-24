/**
 * src/app/verify/page.tsx (bkt-52p)
 * ----------------------------------------------------------------------------
 * The PUBLIC verify flow, bucket.foundation/verify. The viral backlink: a
 * recruiter pastes a credential (VC-JWT or credential id/URL) and gets a
 * cryptographic yes/no, explained.
 *
 * Trust model, stated plainly on the page:
 * - We verify an EdDSA (Ed25519) signature against Bucket's PUBLISHED public
 * key (/api/academy/issuer). No blockchain, no account, no trust in us
 * beyond "did the Bucket key sign this exact credential".
 * - We check the credential is not revoked (live status lookup).
 * - We tell you plainly that a credential attests EVIDENCE-BACKED
 * DEMONSTRATED mastery to a depth. It is never a certified score or rating.
 * - Bonus: we cross-check the asserted concepts against the learner's live
 * profile and label it "consistent with current profile" vs "point-in-time".
 *
 * Server shell renders the trust copy (SEO + screenshot-native); a client island
 * does the interactive verify against POST /api/academy/credential/verify.
 */
import type { Metadata } from "next";
import VerifyClient from "./VerifyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a credential · Bucket Academy",
  description:
    "Cryptographically verify a Bucket Academy credential — Open Badges 3.0 / " +
    "W3C Verifiable Credential, signed with Bucket's Ed25519 key. No blockchain. " +
    "build the past. build history.",
  alternates: { canonical: "/verify" },
  openGraph: {
    title: "Verify a credential · Bucket Academy",
    description:
      "Paste a credential to cryptographically verify it against Bucket's published key.",
    url: "https://www.bucket.foundation/verify",
    type: "website",
  },
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { c?: string; id?: string };
}) {
  const initial = searchParams.c || searchParams.id || "";
  return (
    <main className="vfy-root">
      <Styles />
      <header className="vfy-head">
        <div className="vfy-kicker">Bucket Academy · Verifiable Credential</div>
        <h1 className="vfy-title">Verify a credential</h1>
        <p className="vfy-sub">
          Paste a Bucket Academy credential — the signed token (VC-JWT) or its
          credential id / URL — and verify it cryptographically against Bucket&apos;s
          published key. No blockchain. No account. No trust in us beyond the math.
        </p>
      </header>

      <VerifyClient initial={initial} />

      <section className="vfy-trust">
        <h2>How this works</h2>
        <ol>
          <li>
            <strong>Signature.</strong> Every credential is an Open Badges 3.0 /
            W3C Verifiable Credential signed with Bucket&apos;s{" "}
            <strong>Ed25519 (EdDSA)</strong> key. We check the signature against
            Bucket&apos;s <a href="/api/academy/issuer">published public key</a> —
            anyone can fetch that key and verify offline. Change one byte and the
            signature fails.
          </li>
          <li>
            <strong>Issuer.</strong> We confirm the signer is Bucket Foundation,
            not someone impersonating it.
          </li>
          <li>
            <strong>Revocation.</strong> We check the credential&apos;s live status
            — a revoked credential reads as invalid even though its signature is
            still mathematically valid.
          </li>
          <li>
            <strong>Consistency (bonus).</strong> We cross-check the asserted
            concepts against the learner&apos;s live public profile and label the
            result &ldquo;consistent with current profile&rdquo; vs
            &ldquo;point-in-time.&rdquo; A credential stays valid when signed +
            unrevoked even if the live profile later evolves.
          </li>
        </ol>
        <div className="vfy-honest">
          <strong>What a credential claims.</strong> A Bucket credential
          attests <em>evidence-backed demonstrated mastery</em> of specific canon
          concepts, each reached to a named depth (Recall → Apply → Derive →
          Teach-back) through spaced retrieval-with-feedback, with canon alignment.
          It is <strong>not</strong> a certified test score and carries{" "}
          <strong>no numeric rating</strong>. Its trust comes from being signed and
          mechanically tied to doing the real retrieval work — not from a synthesized
          number.
        </div>
      </section>

      <footer className="vfy-foot">
        <a className="vfy-cta" href="/academy">
          Build your own → Bucket Academy
        </a>
        <div className="vfy-slogan">build the past. build history.</div>
      </footer>
    </main>
  );
}

function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.vfy-root{--bone:#EFE8D4;--bone-2:#E4DCC4;--card:#F5F0E1;--basalt:#1F1C16;--ink-dim:#4A4238;--ink-faint:#6F6A5E;--aegean:#2E6B6B;--aegean-deep:#1F4F4F;--gold:#B8861E;--gold-deep:#8A641A;--laurel:#5A7A3A;--line:rgba(31,28,22,.12);--ok:#2f7d4f;--bad:#a3342b;
  max-width:760px;margin:0 auto;padding:28px 18px 80px;color:var(--basalt);font-family:"Fraunces",Georgia,serif;}
.vfy-head{text-align:center;padding:14px 0 6px;}
.vfy-kicker{font-family:"Cinzel",serif;text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--gold-deep);}
.vfy-title{font-family:"Cinzel",serif;font-weight:700;font-size:34px;line-height:1.1;margin:10px 0 2px;}
.vfy-sub{max-width:560px;margin:12px auto 0;font-size:16px;line-height:1.5;color:var(--ink-dim);}
.vfy-trust{margin-top:36px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;}
.vfy-trust h2{font-family:"Cinzel",serif;font-size:18px;margin:0 0 10px;}
.vfy-trust ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px;font-size:14.5px;line-height:1.55;color:var(--ink-dim);}
.vfy-trust a{color:var(--aegean-deep);}
.vfy-honest{margin-top:16px;background:rgba(184,134,30,.08);border:1px solid rgba(184,134,30,.28);border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;color:var(--ink-dim);}
.vfy-foot{text-align:center;margin-top:34px;}
.vfy-cta{display:inline-block;background:var(--basalt);color:var(--bone);text-decoration:none;font-family:"Cinzel",serif;font-size:14px;letter-spacing:.04em;padding:13px 24px;border-radius:999px;}
.vfy-cta:hover{background:var(--aegean-deep);}
.vfy-slogan{margin-top:16px;font-style:italic;color:var(--ink-faint);font-size:14px;}
/* client island */
.vfy-box{margin-top:22px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;}
.vfy-ta{width:100%;box-sizing:border-box;min-height:120px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;line-height:1.5;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--bone);color:var(--basalt);resize:vertical;}
.vfy-actions{display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap;}
.vfy-btn{background:var(--aegean-deep);color:var(--bone);border:none;font-family:"Cinzel",serif;font-size:14px;letter-spacing:.03em;padding:11px 22px;border-radius:999px;cursor:pointer;}
.vfy-btn:disabled{opacity:.5;cursor:default;}
.vfy-hint{font-size:12px;color:var(--ink-faint);}
.vfy-result{margin-top:18px;border-radius:14px;padding:16px;border:1px solid var(--line);}
.vfy-result.ok{background:rgba(47,125,79,.08);border-color:rgba(47,125,79,.4);}
.vfy-result.bad{background:rgba(163,52,43,.07);border-color:rgba(163,52,43,.4);}
.vfy-verdict{font-family:"Cinzel",serif;font-size:20px;display:flex;align-items:center;gap:10px;}
.vfy-verdict.ok{color:var(--ok);}
.vfy-verdict.bad{color:var(--bad);}
.vfy-checks{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:14px;}
.vfy-checks li{display:flex;gap:8px;align-items:flex-start;}
.vfy-ck{font-weight:700;min-width:18px;}
.vfy-ck.ok{color:var(--ok);}
.vfy-ck.bad{color:var(--bad);}
.vfy-ck.warn{color:var(--gold-deep);}
.vfy-reasons{margin-top:12px;font-size:13px;color:var(--ink-dim);line-height:1.5;}
.vfy-reasons li{margin-bottom:4px;}
.vfy-subject{margin-top:14px;border-top:1px solid var(--line);padding-top:12px;font-size:14px;}
.vfy-ach{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;}
.vfy-ach li{font-size:13.5px;display:flex;gap:8px;align-items:baseline;}
.vfy-depth{font-size:11px;text-transform:uppercase;letter-spacing:.06em;background:var(--bone-2);padding:2px 8px;border-radius:999px;color:var(--aegean-deep);}
.vfy-still{margin-left:auto;font-size:11px;}
.vfy-still.held{color:var(--ok);}
.vfy-still.gone{color:var(--gold-deep);}
.vfy-link{color:var(--aegean-deep);font-size:13px;}
`,
      }}
    />
  );
}
