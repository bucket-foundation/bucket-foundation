import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT_EMAIL, mailto } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using the Bucket apps and bucket.foundation, including our zero tolerance for objectionable content and abusive users.",
  alternates: { canonical: "/terms" },
};

const LABEL = "small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]";
const H2 = "mt-14 font-display uppercase text-[22px] tracking-[0.04em] text-[color:var(--basalt)]";
const P = "mt-4 text-[17px] leading-[1.75] text-[color:var(--basalt-2)]";
const LI = "border-b border-[color:var(--hairline)] py-3 text-[15px] leading-[1.6] text-[color:var(--basalt-2)]";

const BANNED = [
  "Hate speech, or attacks on a person or group for who they are.",
  "Harassment, bullying, threats, or calls for violence or self-harm.",
  "Sexual content, and any content that sexualizes or endangers a child.",
  "Spam, scams, or pretending to be another person or organization.",
  "Anything illegal, or personal details about someone else shared without their consent.",
];

export default function TermsPage() {
  return (
    <main className="stone-bone relative grain">
      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-14 md:py-32">
        <div className={`${LABEL} mb-5`}>§ Terms</div>
        <h1 className="font-display uppercase text-[clamp(2rem,5vw,3.75rem)] leading-[1.05] chisel tracking-[0.005em] text-[color:var(--basalt)]">
          terms <span className="inlay-gold">of use.</span>
        </h1>
        <p className={P}>Effective November 2, 2026.</p>
        <p className={P}>
          These terms cover the Bucket app for iPhone, iPad and Apple Watch, the Bucket desktop app, Learn and bucket.foundation, all made by Bucket Foundation. Using any of them means you accept these terms. Apple&apos;s{" "}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" className="underline underline-offset-4">Licensed Application End User License Agreement</a>
          {" "}also applies to apps you get from the App Store. The <Link href="/privacy" className="underline underline-offset-4">privacy page</Link> says what we keep and why.
        </p>

        <h2 className={H2}>your account</h2>
        <p className={P}>
          You can use most of Bucket without an account. You sign in with Apple or with a one-time code sent to your email, and the same account works in Bucket, Polingual and bucket.foundation. Keep access to that email secure. Bucket is for learners 13 and over.
        </p>
        <p className={P}>
          You can delete your account in the app at any time: Account, Delete account.
        </p>

        <h2 className={H2}>objectionable content and abuse</h2>
        <p className={P}>
          We have zero tolerance for objectionable content and abusive users. This covers everything you add to Bucket, including group names and display names, and how you treat people in family and friends groups. These are banned:
        </p>
        <ul className="mt-6 border-t border-[color:var(--hairline)]">
          {BANNED.map((b) => (
            <li key={b} className={LI}>{b}</li>
          ))}
        </ul>
        <p className={P}>
          The server rejects profanity in group and display names. In a group you can report a member or the group, and block a person or the group, from the group screen. You can also write to{" "}
          <a href={mailto("Report abuse")} className="underline underline-offset-4 break-words">{CONTACT_EMAIL}</a>.
        </p>
        <p className={P}>
          We review every report within 24 hours. We remove offending content, and we remove users who break these rules from their groups and from Bucket.
        </p>

        <h2 className={H2}>using the service</h2>
        <p className={P}>
          Use Bucket for learning and research. Do not break its security, overload it, or use it to harm someone else. Automated access goes through the published API, under the limits it states.
        </p>

        <h2 className={H2}>content</h2>
        <p className={P}>
          Course deck text is published under CC BY 4.0. Bucket also includes third-party material under its own open licences, such as Wiktionary, Tatoeba and Wikipedia text. Radio streams and YouTube videos belong to their owners, and we do not host them. You keep the rights to what you add, and you give us the right to store and show it so the service works.
        </p>
        <p className={P}>
          Bucket teaches foundations and languages. It gives no medical, legal or financial advice.
        </p>

        <h2 className={H2}>changes and ending</h2>
        <p className={P}>
          We may change these terms and will post the new version here with a new effective date. You can stop using Bucket at any time. We can suspend or close an account that breaks these terms.
        </p>

        <h2 className={H2}>liability</h2>
        <p className={P}>
          Bucket is provided as is. To the extent the law allows, Bucket Foundation is not liable for indirect or consequential damages. These terms follow the laws of the State of New York.
        </p>

        <h2 className={H2}>contact</h2>
        <p className={P}>
          Questions go to{" "}
          <a href={mailto("Terms of use")} className="underline underline-offset-4 break-words">{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
