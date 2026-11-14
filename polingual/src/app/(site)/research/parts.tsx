export function H2({ id, n, children }: { id: string; n: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-8 flex items-baseline gap-3 text-3xl md:text-4xl text-[color:var(--pl-ink)] tracking-[-0.01em]">
      <span className="text-[color:var(--ink)]">{n}</span>
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-sans text-[17px] leading-8 max-w-[68ch] text-[color:var(--ink-2)]">{children}</p>;
}

export function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg px-5 py-3 text-[17px] bg-[var(--sky-2)] border-[1px] border-[var(--hairline)] text-[color:var(--ink)]">
      {children}
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="scroll-fade mt-4 overflow-x-auto rounded-lg bg-white border-[1px] border-[var(--hairline)]">
      <table className="w-full min-w-[540px] font-sans text-[15px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-dim)] border-b-[1px] border-b-[var(--hairline)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className={`px-4 py-2 align-top text-[color:var(--pl-ink-2)] border-t border-[color:var(--pl-hairline)] ${i === 0 ? "font-mono text-[13px]" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
