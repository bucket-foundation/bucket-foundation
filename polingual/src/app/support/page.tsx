import type { Metadata } from "next";
import Legal from "../legal";

export const metadata: Metadata = { title: "Polingual Support", description: "Help with Polingual.", alternates: { canonical: "/support" } };

export default function Page() {
  return (
    <Legal>
      <h1>Polingual Support</h1>
      <p className="lede">Email <a href="mailto:support@polingual.com">support@polingual.com</a>. We answer within two business days.</p>
      <h2>Common questions</h2>
      <ul>
      <li>Start or cancel the free trial: Settings on your iPhone, your name, Subscriptions, Polingual.</li>
      <li>Restore a purchase on a new device: open Polingual, tap Restore Purchases on the subscription screen.</li>
      <li>Sync with Bucket: sign in with the same email in both apps.</li>
      <li>Speaking does not work: allow Microphone and Speech Recognition for Polingual in Settings, Privacy and Security.</li>
      <li>Refunds: <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>.</li>
      <li>Delete your account: in the app, Account, Delete account. Or email <a href="mailto:privacy@polingual.com">privacy@polingual.com</a> from the address on the account.</li>
      </ul>
    </Legal>
  );
}
