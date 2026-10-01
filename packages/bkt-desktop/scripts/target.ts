const BUN_TARGETS: Record<string, string> = {
  "x86_64-unknown-linux-gnu": "bun-linux-x64",
  "aarch64-unknown-linux-gnu": "bun-linux-arm64",
  "x86_64-apple-darwin": "bun-darwin-x64",
  "aarch64-apple-darwin": "bun-darwin-arm64",
  "x86_64-pc-windows-msvc": "bun-windows-x64",
};

export function bunTarget(triple: string): string {
  const t = BUN_TARGETS[triple];
  if (!t) throw new Error(`no bun compile target for ${triple}`);
  return t;
}

export function sidecarName(triple: string): string {
  return `bkt-${triple}${triple.includes("windows") ? ".exe" : ""}`;
}

export function hostTriple(rustcVersion: string): string {
  const m = rustcVersion.match(/^host:\s*(\S+)$/m);
  if (!m) throw new Error("rustc -vV printed no host line");
  return m[1];
}
