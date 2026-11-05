import type { Metadata } from "next";
import { KEPT_DATA, consentSecret, verifyParentToken } from "@/lib/research-os/parent-consent";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parent consent", robots: { index: false, follow: false } };

const DONE: Record<string, string> = {
  approved: "Approved. We emailed you a confirmation with a link to revoke at any time.",
  declined: "Declined. We keep no learning progress for this child.",
  revoked: "Consent revoked. We deleted your child's learning data.",
  used: "This link was already used.",
  expired: "This link is invalid or expired. Ask your child to send a new request from the app.",
  error: "Something went wrong. Try the link again in a few minutes.",
  wrong_account: "Sign in with the email address this invitation was sent to, then approve again.",
  self: "A child cannot approve their own request. A parent needs to sign in with their own account.",
  sign_in: "Sign in first, then approve.",
  declare_adult: "Confirm you are 18 or older, then approve.",
  not_adult: "Only an adult account can approve. Sign in with a parent's account.",
};

const RETRY = new Set(["sign_in", "declare_adult", "wrong_account"]);

const P = "mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]";
const BTN = "px-5 py-3 border border-[color:var(--basalt)] text-[15px]";

function tokenFor(t: string) {
  const secret = consentSecret();
  return secret ? verifyParentToken(t, secret) : null;
}

export default function ParentConsentPage({ searchParams }: { searchParams: { t?: string; done?: string } }) {
  const doneKey = searchParams.done ?? "";
  const state = DONE[doneKey] ?? null;
  const token = searchParams.t ? tokenFor(searchParams.t) : null;
  const retry = RETRY.has(doneKey) || !doneKey;
  const here = `/consent/parent?t=${encodeURIComponent(searchParams.t ?? "")}`;
  return (
    <main className="stone-bone relative">
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-14 md:py-24">
        <h1 className="font-display uppercase text-[clamp(1.8rem,4vw,3rem)] leading-[1.05] text-[color:var(--basalt)]">parent consent</h1>
        {state && <p className={P}>{state}</p>}
        {retry && !token && <p className={P}>{DONE.expired}</p>}
        {retry && token && (
          <>
            <p className={P}>
              {token.action === "revoke"
                ? "Revoking consent deletes all of your child's learning data on Bucket and Polingual."
                : "Your child asked to keep their learning progress on Bucket and Polingual. With your approval we keep:"}
            </p>
            {token.action === "decide" && (
              <ul className="mt-4 list-disc pl-6 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]">
                {KEPT_DATA.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            {token.action === "decide" && (
              <p className={P}>
                To approve, <a className="underline underline-offset-4" href={`/sign-in?next=${encodeURIComponent(here)}`}>sign in</a> with the email this invitation was sent to.
              </p>
            )}
            <form method="post" action="/api/research-os/consent/parent" className="mt-8 flex flex-wrap gap-4">
              <input type="hidden" name="t" value={searchParams.t} />
              {token.action === "revoke" ? (
                <button name="decision" value="revoke" className={BTN}>Revoke and delete</button>
              ) : (
                <>
                  {doneKey === "declare_adult" && (
                    <label className="flex items-center gap-2 text-[15px]">
                      <input type="checkbox" name="adult" value="18plus" required /> I am 18 or older. This sets my account age range for good.
                    </label>
                  )}
                  <button name="decision" value="approve" className={BTN}>Approve</button>
                  <button name="decision" value="decline" className={BTN}>Decline</button>
                </>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
