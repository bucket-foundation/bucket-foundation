import ConnectionsPanel from "@/app/research-os/(app)/home/ConnectionsPanel";
import LoopPanel from "@/app/research-os/(app)/home/LoopPanel";
import { href } from "../router";
import "../ros.css";

export function RosProgressView() {
  return (
    <section>
      <header className="head">
        <h1>Progress</h1>
        <p className="muted">
          How far each idea has gone for you, from first look to your own work. Open ideas from the <a href={href({ name: "graph" })}>knowledge graph</a>.
        </p>
      </header>
      <div className="ros-stack">
        <LoopPanel />
        <ConnectionsPanel />
      </div>
    </section>
  );
}
