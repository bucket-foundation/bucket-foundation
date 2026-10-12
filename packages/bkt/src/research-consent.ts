import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MINT = Symbol("bkt.research.grant");

export const INTERNAL_KINDS = ["research-pages"] as const;
export const FROZEN_SKIP = new Set([".bkt-job", "out"]);

export class Grant {
  spent = false;

  constructor(
    key: symbol,
    readonly kind: string,
    readonly digest: string,
  ) {
    if (key !== MINT) throw new Error("a grant comes from the consent store alone");
    Object.freeze(this.kind);
  }
}

function walk(root: string, rel: string, out: string[]): void {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (!rel && FROZEN_SKIP.has(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`the frozen folder holds a symlink at ${path}`);
    if (entry.isDirectory()) walk(root, path, out);
    else if (entry.isFile()) out.push(path);
    else throw new Error(`the frozen folder holds a special file at ${path}`);
  }
}

export function frozenDigest(dir: string): string {
  if (lstatSync(dir).isSymbolicLink()) throw new Error("the frozen folder is a symlink");
  const files: string[] = [];
  walk(dir, "", files);
  const h = createHash("sha256");
  for (const path of files) h.update(path).update("\0").update(createHash("sha256").update(readFileSync(join(dir, path))).digest("hex")).update("\0");
  return h.digest("hex");
}

export class ConsentStore {
  internal(kind: string, digest: string): Grant {
    if (!(INTERNAL_KINDS as readonly string[]).includes(kind)) throw new Error(`${kind} needs an approval and takes no internal grant`);
    if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("a grant needs the digest of the frozen folder");
    return new Grant(MINT, kind, digest);
  }
}
