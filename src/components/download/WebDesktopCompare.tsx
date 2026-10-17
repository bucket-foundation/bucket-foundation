const ROWS: { feature: string; web: string; desktop: string }[] = [
  { feature: "Reading", web: "Every canon page, branch and excerpt, free to read", desktop: "Canon excerpts with their evidence passages, from the pack on this computer" },
  { feature: "Canon search", web: "Search, bridges and the knowledge graph", desktop: "Search over the canon held on the device, with the globe and the graph" },
  { feature: "Learn", web: "Lessons, recall and mastery per branch", desktop: "Timed quiz and spaced review over local decks, with a path per deck" },
  { feature: "Language systems", web: "Build a system from a root language and study it", desktop: "Language decks with word lessons" },
  { feature: "Sync", web: "Signed in, Learn progress saves to your account", desktop: "No account sync; bring web progress over with an exported file" },
  { feature: "Offline", web: "Needs a connection", desktop: "Runs offline" },
  { feature: "Local database and device key", web: "None; progress sits in the browser or your account", desktop: "Local database, a data key and a device key in the system key store" },
  { feature: "Analyses", web: "None", desktop: "Check a data file, run the analysis suite and keep the reports" },
  { feature: "Quiz notifications", web: "None", desktop: "A daily quiz notification, Linux only" },
  { feature: "Human and AI probe", web: "None", desktop: "Run the probe, score it and read the results" },
  { feature: "Deck library", web: "None", desktop: "Install decks checked against their manifest and checksum, remove them, or export one to share" },
  { feature: "Updates", web: "Always the current site", desktop: "Checks for a newer signed release and verifies it before install" },
];

export default function WebDesktopCompare() {
  return (
    <section id="web-and-desktop" aria-labelledby="web-and-desktop-heading" className="max-w-5xl mx-auto px-4 md:px-6 py-12">
      <h2 id="web-and-desktop-heading" className="font-display uppercase text-2xl text-[color:var(--basalt)] mb-2">Web and desktop</h2>
      <p className="text-[color:var(--basalt-2)] mb-6">What works on bucket.foundation in the browser, and what the desktop app adds.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-[color:var(--hairline)] small-caps text-[11px] text-[color:var(--basalt-2)]">
              <th scope="col" className="py-2 pr-4">Feature</th>
              <th scope="col" className="py-2 pr-4">Web</th>
              <th scope="col" className="py-2">Desktop</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.feature} className="border-b border-[color:var(--hairline)] align-top">
                <th scope="row" className="py-3 pr-4 text-left font-semibold text-[color:var(--basalt)]">{r.feature}</th>
                <td className="py-3 pr-4 text-[color:var(--basalt-2)]">{r.web}</td>
                <td className="py-3 text-[color:var(--basalt-2)]">{r.desktop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
