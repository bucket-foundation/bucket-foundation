"use client";

export type ProduceKind = "extension" | "replication" | "peer_review";

const KINDS: { kind: ProduceKind; label: string; hint: string }[] = [
  { kind: "extension", label: "extend this", hint: "carry the claim further" },
  { kind: "replication", label: "replicate this", hint: "redo the study or derivation" },
  { kind: "peer_review", label: "review this", hint: "assess a production" },
];

export default function ProduceBlock({ node, active, onPick }: { node: { title: string }; active: ProduceKind | "production"; onPick: (kind: ProduceKind) => void }) {
  return (
    <div className="mt-3 border-t border-[color:var(--hairline)] pt-3 text-[12px] text-[color:var(--basalt-2)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">produce</span>
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            title={k.hint}
            onClick={() => onPick(k.kind)}
            className={
              "small-caps text-[10px] tracking-[0.14em] px-2 py-1 border rounded-sm " +
              (active === k.kind ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)] bg-[color:var(--bone)]" : "border-[color:var(--hairline)] hover:text-[color:var(--basalt)]")
            }
          >
            {k.label}
          </button>
        ))}
      </div>
      {active !== "production" && <p className="mt-1 text-[color:var(--basalt-3)]">The Production form below is a {active.replace("_", " ")} of {node.title}.</p>}
    </div>
  );
}
