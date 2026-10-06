import GraphMap from "@/app/research-os/(app)/map/GraphMap";
import "../ros.css";

export function RosMapView({ branch }: { branch?: string }) {
  return (
    <section>
      <header className="head">
        <h1>Knowledge graph</h1>
        <p className="muted">Every idea in your decks, linked to what it builds on. Click one to open it.</p>
      </header>
      <GraphMap key={branch ?? ""} initialBranch={branch ?? "02-physics"} initialQuery="" />
    </section>
  );
}
