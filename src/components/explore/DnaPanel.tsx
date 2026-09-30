"use client";

import { useEffect, useRef, useState } from "react";
import type { GenomeSummary } from "@/lib/explore/genome/parse";
import { ParseTokens, sizeError, type GenomeReply } from "@/lib/explore/genome/job";

interface Props {
  genome: GenomeSummary | null;
  onGenome(g: GenomeSummary | null): void;
}

export default function DnaPanel({ genome, onGenome }: Props) {
  const worker = useRef<Worker | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const tokens = useRef(new ParseTokens());
  const [status, setStatus] = useState<string>("No file loaded. Files are parsed in this browser and never uploaded.");

  useEffect(() => {
    const w = new Worker(new URL("../../lib/explore/genome/genome.worker.ts", import.meta.url));
    w.onmessage = (e: MessageEvent<GenomeReply>) => {
      if (!tokens.current.isCurrent(e.data.token)) return;
      if (!e.data.ok) {
        setStatus(`Could not read the file: ${e.data.error}`);
        return;
      }
      const s = e.data.summary;
      if (s.format === "unknown") {
        setStatus("Format not recognized. Use a 23andMe or AncestryDNA txt, a VCF, or a FASTA file.");
        onGenome(null);
        return;
      }
      onGenome(s);
      setStatus(
        s.format === "fasta"
          ? `FASTA: ${s.fasta.length} sequence${s.fasta.length === 1 ? "" : "s"}, ${s.fasta.reduce((a, f) => a + f.length, 0).toLocaleString()} bases.`
          : `${s.format}: ${s.variantCount.toLocaleString()} variants, ${s.annotated.length} annotated SNPs, ${s.skipped} lines skipped.`,
      );
    };
    worker.current = w;
    return () => w.terminate();
  }, [onGenome]);

  const loadSample = async () => {
    setStatus("Parsing the sample genome…");
    const token = tokens.current.next();
    const text = await (await fetch("/explore/sample-genome.txt")).text();
    if (!tokens.current.isCurrent(token)) return;
    worker.current?.postMessage({ token, text });
  };

  const clear = () => {
    tokens.current.cancel();
    onGenome(null);
    if (input.current) input.current.value = "";
    setStatus("Cleared. Nothing was stored.");
  };

  return (
    <div data-testid="dna-panel" className="border hairline p-3 mt-3 text-sm flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span>Genome file</span>
        <input
          ref={input}
          type="file"
          accept=".txt,.vcf,.fa,.fasta,.fna,.csv,text/plain"
          data-testid="dna-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const tooBig = sizeError(f.size);
            if (tooBig) {
              tokens.current.cancel();
              setStatus(tooBig);
              return;
            }
            setStatus(`Parsing ${f.name} in a worker…`);
            worker.current?.postMessage({ token: tokens.current.next(), file: f });
          }}
        />
      </label>
      <button type="button" className="border hairline px-3 py-1" data-testid="dna-sample" onClick={loadSample}>
        Load sample genome
      </button>
      <button type="button" className="border hairline px-3 py-1" data-testid="dna-clear" onClick={clear}>
        Clear data
      </button>
      <span data-testid="dna-status" style={{ color: "var(--parchment-dim)" }}>{status}</span>
    </div>
  );
}
