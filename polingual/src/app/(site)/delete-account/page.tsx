import type { Metadata } from "next";
import Legal from "@/app/legal";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/delete-account", title: "Delete your Polingual account", description: "How to delete your Polingual account and data, in the app or by email." });

export default function Page() {
  return (
    <Legal>
      <h1>Delete your Polingual account</h1>
      <h2>In the app</h2>
      <p>On iPhone or Android, open Account and tap Delete account. Your account and all of it goes at once.</p>
      <h2>Without the app</h2>
      <p>Email <a href="mailto:privacy@polingual.com?subject=Delete%20my%20account">privacy@polingual.com</a> from the address you sign in with and ask us to delete your account. We confirm by reply and finish within 30 days.</p>
      <h2>What we delete</h2>
      <ul>
        <li>Your account, email address and user id.</li>
        <li>Your learning progress, language systems, review history and app activity.</li>
        <li>Your nickname, groups and anything you posted in live rooms.</li>
      </ul>
      <h2>What we keep</h2>
      <p>Records of purchases and gift payments, kept for our accounts as the law requires. Apple and Google keep their own subscription records; cancel a subscription in your App Store or Google Play settings.</p>
      <p>Details: <a href="/privacy">Privacy Policy</a>.</p>
    </Legal>
  );
}
