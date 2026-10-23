import type { Metadata } from "next";
import Legal from "../legal";

export const metadata: Metadata = { title: "Polingual Privacy Policy", description: "How Polingual handles your data.", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <Legal>
      <h1>Polingual Privacy Policy</h1>
      <p>Effective at launch.</p>
      <p>Polingual is published by AGFarms LLC and runs on the same account system as Bucket at bucket.foundation.</p>
      <h2>What we collect</h2>
      <ul>
      <li>Email address, when you sign in. We use it to send your one-time sign-in code and, if you agree, emails about your trial and subscription.</li>
      <li>Learning progress, when you sign in: your language systems, placement results and review history. We store it so it syncs across your devices, the Bucket app and bucket.foundation.</li>
      <li>Email address, when you join the beta. We store it with Resend, our email provider, to send your TestFlight invite and beta updates. We keep it until the beta ends or you ask us to delete it.</li>
      <li>A user id that ties your progress to your account.</li>
      </ul>
      <p>Without sign-in or a beta signup, your progress stays on your device and we receive none of it.</p>
      <h2>What we do not collect</h2>
      <p>We do not track you across apps or websites. Polingual has no advertising or analytics SDK. We do not sell or share personal data.</p>
      <h2>Speech</h2>
      <p>When you tap Speak, your audio goes to Apple&rsquo;s speech recognition to check your pronunciation, under Apple&rsquo;s privacy policy. Polingual does not store or receive the audio.</p>
      <h2>Payments</h2>
      <p>Apple processes every purchase. We receive the subscription status and a transaction id from Apple, linked to your account when you are signed in. We never see your payment details.</p>
      <h2>Where data lives</h2>
      <p>Account and progress data is stored with our database host in the United States. Beta signup emails are stored with Resend in the United States. Both are sent over HTTPS.</p>
      <h2>Your choices</h2>
      <p>To leave the beta list, email privacy@polingual.com and we remove your address from Resend. Delete your account and all progress in the app: Account, Delete account. You can also email <a href="mailto:privacy@polingual.com">privacy@polingual.com</a> from the address on the account. Unsubscribe from email with the link in any message.</p>
      <h2>Children</h2>
      <p>Polingual is rated 4+ and collects no data from anyone who does not sign in or join the beta. We do not knowingly collect data from children under 13 without a parent&rsquo;s consent.</p>
      <p>Contact: <a href="mailto:privacy@polingual.com">privacy@polingual.com</a></p>
    </Legal>
  );
}
