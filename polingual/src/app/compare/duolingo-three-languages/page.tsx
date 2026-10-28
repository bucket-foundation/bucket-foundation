import type { Metadata } from "next";
import Legal from "../../legal";
import { FAQ, FACTS, faqJsonLd, jsonLdScript } from "@/lib/facts";

const CHECKED = "2026-10-25";

const title = "Polingual vs Duolingo for 3 languages";
const description = "How Polingual and Duolingo handle studying three languages at the same time.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/compare/duolingo-three-languages" },
  openGraph: { type: "article", title, description, url: "/compare/duolingo-three-languages", images: [{ url: "/d8/og.png", width: 1200, height: 630 }] },
};

const ROWS: [string, string, string][] = [
  ["Courses at once", "Several languages in one set, studied together", "Each language is a separate course"],
  ["Review queue", "One spaced review queue mixes every language in the set", "Practice runs inside each course"],
  ["Word presentation", "A meaning appears once with its word in each of your languages", "Words appear in the lessons of one course"],
  ["Platforms", FACTS.platforms, "Android, iOS and iPadOS apps"],
  ["Price", "Free in the Bucket beta on TestFlight", "Free with ads; a subscription removes ads"],
];

export default function Page() {
  return (
    <Legal>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
      <h1>{title}</h1>
      <p className="lede">Both apps can teach Spanish, French and Italian. They differ in how the three fit into one day of study.</p>
      <table>
        <thead>
          <tr><th></th><th>Polingual</th><th>Duolingo</th></tr>
        </thead>
        <tbody>
          {ROWS.map(([k, p, d]) => (
            <tr key={k}><th scope="row">{k}</th><td>{p}</td><td>{d}</td></tr>
          ))}
        </tbody>
      </table>
      <h2>When Polingual fits</h2>
      <p>You study languages that share roots and want to see a word in all of them side by side, in one short session a day.</p>
      <h2>When Duolingo fits</h2>
      <p>You want one language at a time, on Android, with a free tier.</p>
      <h2>Questions</h2>
      {FAQ.map((f) => (
        <section key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </section>
      ))}
      <p>Duolingo facts from <a href="https://en.wikipedia.org/wiki/Duolingo">Wikipedia: Duolingo</a>, checked {CHECKED}. Polingual facts from the app.</p>
      <p><a href="/">Join the beta</a></p>
    </Legal>
  );
}
