import type { Metadata } from "next";
import { loadProgressions, type LayoutOptions } from "@/lib/research-maps/progressions";
import MapFigure from "../MapFigure";
import ProgressionPanel from "./ProgressionPanel";

export const metadata: Metadata = { title: "Progression graphs", robots: { index: false, follow: false } };

const GRADES = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "High school"];

const OPTIONS: Record<string, LayoutOptions> = {
  school: { nodeWidth: 150, ranksep: 46, bandLabels: GRADES },
  "advanced-placement": { nodeWidth: 150, ranksep: 34 },
  university: { nodeWidth: 210, ranksep: 80 },
  patterns: { nodeWidth: 200, ranksep: 70 },
  usaco: { nodeWidth: 170, ranksep: 60 },
};

export default function Page() {
  const data = loadProgressions();
  const nodes = data.graphs.reduce((a, g) => a + g.panels.reduce((b, p) => b + p.nodes.length, 0), 0);
  const edges = data.graphs.reduce((a, g) => a + g.panels.reduce((b, p) => b + p.edges.length, 0), 0);
  return (
    <MapFigure
      eyebrow="Research map · corpus"
      title="Progression graphs"
      deck="What comes before what. Each arrow runs from a prerequisite to the topic that needs it. A solid arrow is printed by the source, and a dashed arrow is inferred from its ordering."
      footer={`${data.date}. ${nodes} topics and ${edges} prerequisite edges from the progressions corpus. The corpus holds no edge between the stages of a graph, so each stage is drawn on its own row.`}
    >
      <div className="flex flex-col gap-12">
        {data.graphs.map((g) => (
          <section key={g.id} data-progression={g.id}>
            <h2 className="mb-5 border-b border-[color:var(--stone-carve)] pb-2 font-display text-[clamp(1.2rem,1.7vw,2rem)] uppercase text-[color:var(--basalt)]">
              {g.title}
              <span className="ml-4 font-[inherit] text-[0.55em] normal-case tracking-normal text-[color:var(--basalt-3)]">{g.summary}</span>
            </h2>
            <div className="flex flex-col gap-9">
              {g.panels.map((p) => (
                <ProgressionPanel key={p.id} panel={p} options={OPTIONS[p.id]} legendGroups={p.id !== "school" && p.id !== "usaco"} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </MapFigure>
  );
}
