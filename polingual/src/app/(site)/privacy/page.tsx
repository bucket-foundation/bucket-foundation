import type { Metadata } from "next";
import Legal from "@/app/legal";
import { pageMeta } from "@/lib/meta";

export const metadata: Metadata = pageMeta({ path: "/privacy", title: "Polingual Privacy Policy", description: "How Polingual handles your data: what we collect, why, and how to delete it." });

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
      <li>Email address, when you ask for the download link or joined the beta. We store it with Resend, our email provider, to send your App Store link and updates. We keep it until the beta ends or you ask us to delete it.</li>
      <li>Email address, when you claim a founding spot. We store it in our database with the time you claimed it and whether you confirmed it, so each address holds one spot, and send your confirmation link with Resend. We keep it until the offer ends or you ask us to delete it.</li>
      <li>Gift purchases: your email, the name and email of the person you buy for, your note and the delivery date. Stripe takes the payment and we never see the card. We use the recipient address to send one gift email with Resend. We delete the recipient name, email and your note 30 days after the code is redeemed, expires or is refunded, and keep the payment record with your email for our accounts. To have it removed sooner, email privacy@polingual.com.</li>
      <li>A hash of your IP address when you claim a founding spot, kept for one day to limit claims from one network.</li>
      <li>A user id that ties your progress to your account.</li>
      <li>App activity, when you sign in: when you open the app, start and finish a session, and see or answer a card. We store it with your user id in our database to measure retention and improve lessons and games.</li>
      <li>Website visits on polingual.com: a random visitor id kept in your browser, the page, the campaign tag in the link you followed, the site that sent you, your country from the network, and whether you opened the signup form, joined, or tapped the App Store link. We store it in our own database to see which posts bring people. It holds no IP address, name or email. Vercel, our web host, also counts page views without cookies.</li>
      </ul>
      <p>Without sign-in or a beta signup, your progress stays on your device and we receive none of it.</p>
      <h2>Ads</h2>
      <p>Games and live rooms are free and show ads from Google AdMob to people without a subscription. Subscribers see no ads. Before any ad loads, the app asks for your consent where the law requires it, and on iPhone it asks Apple&rsquo;s permission to track. If you allow tracking, Google receives your device advertising identifier, approximate location from your network, ad interactions and app diagnostics to choose and measure ads, under <a href="https://policies.google.com/technologies/partner-sites">Google&rsquo;s policy</a>. If you decline, ads still show without that identifier. Change your choice any time in Settings, Privacy, Tracking, or with Ad privacy choices in the app.</p>
      <h2>What we do not do</h2>
      <p>We do not sell personal data. We share data with Google only for the ads above, and only as you allow.</p>
      <h2>Speech</h2>
      <p>When you tap Speak, your audio goes to Apple&rsquo;s speech recognition to check your pronunciation, under Apple&rsquo;s privacy policy. Polingual does not store or receive the audio.</p>
      <h2>Payments</h2>
      <p>Apple processes every purchase. We receive the subscription status and a transaction id from Apple, linked to your account when you are signed in. We never see your payment details.</p>
      <h2>Where data lives</h2>
      <p>Account and progress data is stored with our database host in the United States. Beta signup emails are stored with Resend in the United States. Both are sent over HTTPS.</p>
      <h2>Your choices</h2>
      <p>To leave the beta list or give up a founding spot, email privacy@polingual.com and we remove your address from Resend and our database. Delete your account and all progress in the app: Account, Delete account. You can also email <a href="mailto:privacy@polingual.com">privacy@polingual.com</a> from the address on the account. Unsubscribe from email with the link in any message.</p>
      <h2>Children</h2>
      <p>Polingual is rated 13+ and collects no data from anyone who does not sign in or join the beta. We do not knowingly collect data from children under 13 without a parent&rsquo;s consent.</p>
      <p>Contact: <a href="mailto:privacy@polingual.com">privacy@polingual.com</a></p>
    </Legal>
  );
}
