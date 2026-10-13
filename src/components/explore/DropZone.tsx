"use client";

import { useEffect, useRef, useState } from "react";
import type { GenomeReply } from "@/lib/explore/genome/job";
import { ParseTokens, sizeError } from "@/lib/explore/genome/job";
import { MAX_UPLOAD_BYTES, classify, processUpload, routeFor, type UploadResult } from "@/lib/explore/upload";

interface Props {
  onResult(r: UploadResult): void;
}

export default function DropZone({ onResult }: Props) {
  const worker = useRef<Worker | null>(null);
  const tokens = useRef(new ParseTokens());
  const pending = useRef("");
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [status, setStatus] = useState("Drop a genome, structure, SMILES, bibliography, PDF or Markdown file. Files are parsed in this browser and never uploaded.");

  useEffect(() => {
    const w = new Worker(new URL("../../lib/explore/genome/genome.worker.ts", import.meta.url));
    w.onmessage = (e: MessageEvent<GenomeReply>) => {
      if (!tokens.current.isCurrent(e.data.token)) return;
      if (!e.data.ok) {
        setStatus(`Could not read the file: ${e.data.error}`);
        return;
      }
      const r: UploadResult = { kind: "genome", name: pending.current, format: e.data.summary.format, summary: e.data.summary };
      setStatus(`${pending.current}: ${routeFor(r).label}`);
      onResult(r);
    };
    worker.current = w;
    return () => w.terminate();
  }, [onResult]);

  const take = async (f: File) => {
    const token = tokens.current.next();
    pending.current = f.name;
    setStatus(`Reading ${f.name}…`);
    if (f.size > MAX_UPLOAD_BYTES) {
      setStatus(`${f.name} is ${Math.round(f.size / 1024 / 1024)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
      return;
    }
    const head = await f.slice(0, 64 * 1024).text();
    if (classify(f.name, head).kind === "genome") {
      const tooBig = sizeError(f.size);
      if (tooBig) {
        setStatus(tooBig);
        return;
      }
      worker.current?.postMessage({ token, file: f });
      return;
    }
    const r = await processUpload(f.name, new Uint8Array(await f.arrayBuffer()));
    if (!tokens.current.isCurrent(token)) return;
    setStatus(`${f.name}: ${routeFor(r).label}`);
    if (r.kind !== "unknown") onResult(r);
  };

  return (
    <div
      data-testid="drop-zone"
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) take(f);
      }}
      className="border hairline border-dashed px-4 py-3 mt-4 text-sm cursor-pointer"
      style={{ fontFamily: "var(--font-jetbrains)", background: over ? "rgba(217,164,58,0.15)" : undefined }}
    >
      <input
        ref={input}
        type="file"
        hidden
        data-testid="drop-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) take(f);
          e.target.value = "";
        }}
      />
      <span data-testid="drop-status">{status}</span>
    </div>
  );
}
