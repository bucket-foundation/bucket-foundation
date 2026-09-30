import { useEffect, useState } from "react";
import { PatentsView } from "@/components/research-os/views/PatentsView";
import SoftwareAtlas from "@/components/research-os/views/SoftwareAtlas";
import SolvabilityAtlas from "@/components/research-os/views/SolvabilityAtlas";
import { parseRos, type RosPayloads } from "@/lib/research-os/contract";
import type { Api } from "../api";
import { readJsonFile } from "./file";
import "../ros.css";

type AtlasId = "solvability" | "software" | "patents";

const TABS: { id: AtlasId; label: string }[] = [
  { id: "solvability", label: "Solvability" },
  { id: "software", label: "Software" },
  { id: "patents", label: "Patents" },
];

type State<K extends AtlasId> = { status: "loading" } | { status: "ready"; data: RosPayloads[K]; from: "build" | "file" } | { status: "missing" } | { status: "error"; error: string };

export function AtlasesView({ api }: { api: Api }) {
  const [tab, setTab] = useState<AtlasId>("solvability");
  const [state, setState] = useState<State<AtlasId>>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    api.ros(tab).then(
      (r) => alive && setState(r === null ? { status: "missing" } : { status: "ready", data: r, from: "build" }),
      (e: Error) => alive && setState({ status: "error", error: e.message }),
    );
    return () => {
      alive = false;
    };
  }, [api, tab]);

  const open = async (f: File | undefined) => {
    const parsed = await readJsonFile(f);
    if (!parsed.ok) return setState({ status: "error", error: parsed.error });
    try {
      setState({ status: "ready", data: parseRos(tab, parsed.value), from: "file" });
    } catch (e) {
      setState({ status: "error", error: (e as Error).message });
    }
  };

  return (
    <section>
      <header className="head">
        <h1>Atlases</h1>
        <p className="muted">Staff atlases ship only in private builds. Open an exported atlas file to read one here; it stays in this window.</p>
      </header>
      <div className="toolbar">
        <div className="seg">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => (setState({ status: "loading" }), setTab(t.id))}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="file">
          <input type="file" accept=".json,application/json" onChange={(e) => void open(e.target.files?.[0])} />
          <span>Open {tab} JSON</span>
        </label>
      </div>
      {state.status === "loading" && <p className="muted">Loading…</p>}
      {state.status === "missing" && <p className="muted">This build has no {tab} atlas. Open the JSON file the web exports.</p>}
      {state.status === "error" && <p className="error">{state.error}</p>}
      {state.status === "ready" && (
        <div className="ros panel atlas-body">
          {tab === "solvability" ? (
            <SolvabilityAtlas data={state.data as RosPayloads["solvability"]} />
          ) : tab === "software" ? (
            <SoftwareAtlas data={state.data as RosPayloads["software"]} />
          ) : (
            <PatentsView design={state.data as RosPayloads["patents"]} />
          )}
        </div>
      )}
    </section>
  );
}
