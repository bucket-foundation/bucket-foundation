import type { Metadata } from "next";
import { loadFlow } from "@/lib/research-maps/flow";
import MapFigure, { LegendItem } from "../MapFigure";
import FlowDiagram from "./FlowDiagram";

export const metadata: Metadata = { title: "Major to career flow", robots: { index: false, follow: false } };

export default function Page() {
  const flow = loadFlow();
  const total = flow.total.toLocaleString("en-US");
  return (
    <MapFigure
      eyebrow="Research map · crosswalk"
      title="Major to career flow"
      deck={`Where each field of study leads. The federal crosswalk joins six-digit programs to detailed occupations ${total} times, drawn here from ${flow.cip.length} CIP series to ${flow.soc.length} SOC major groups.`}
      footer={`${flow.date}. ${total} links from the ${flow.source}. A band's thickness is its count of program to occupation links.`}
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1">
        <LegendItem swatch={<span aria-hidden className="inline-block h-[6px] w-[26px]" style={{ background: "#B8861E", opacity: 0.7 }} />} label="Largest destination of each series" />
        <LegendItem swatch={<span aria-hidden className="inline-block h-[6px] w-[26px]" style={{ background: "#2E6B6B", opacity: 0.3 }} />} label="Every other link" />
      </div>
      <div className="mx-auto max-w-[1900px]">
        <FlowDiagram />
      </div>
    </MapFigure>
  );
}
