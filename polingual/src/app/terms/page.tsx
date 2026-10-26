import type { Metadata } from "next";
import Legal from "../legal";

export const metadata: Metadata = { title: { absolute: "Polingual Terms of Use" }, description: "Terms for the Polingual app and polingual.com.", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <Legal>
      <h1>Polingual Terms of Use</h1>
      <p>Effective at launch.</p>
      <p>These terms cover your use of the Polingual app and polingual.com, published by AGFarms LLC. Apple&rsquo;s Licensed Application End User License Agreement also applies to the app.</p>
      <h2>Subscription</h2>
      <p>Polingual Monthly and Polingual Yearly are auto-renewable subscriptions sold through the App Store. New subscribers get a 3-day free trial. Payment is charged to your Apple Account when you confirm the purchase. The subscription renews at the same price unless you cancel at least 24 hours before the end of the current period. Manage or cancel in Settings, Apple Account, Subscriptions. Refunds go through Apple at <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>.</p>
      <h2>Your account</h2>
      <p>You sign in with an email code. Keep access to your email secure. One account works in Polingual, Bucket and bucket.foundation.</p>
      <h2>Content</h2>
      <p>Word data comes from Wiktionary contributors via kaikki.org under CC BY-SA. The rest of the app is ours. You may use it for personal learning.</p>
      <h2>Acceptable use</h2>
      <p>Do not scrape the service, resell access, or interfere with its operation.</p>
      <h2>Changes and ending</h2>
      <p>We may change these terms and will post the new version here with a new effective date. You can stop using Polingual at any time.</p>
      <h2>Liability</h2>
      <p>Polingual is provided as is. To the extent the law allows, AGFarms LLC is not liable for indirect or consequential damages. These terms follow the laws of the State of New York.</p>
      <p>Contact: <a href="mailto:support@polingual.com">support@polingual.com</a></p>
    </Legal>
  );
}
