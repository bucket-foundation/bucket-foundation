const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export type SourceIdentity =
  | { kind: "graph"; id: string; nodeId: string }
  | { kind: "doi"; id: string; doi: string }
  | { kind: "url"; id: string; url: string; sha256: string };

export function graphSourceId(nodeId: string): string {
  const id = nodeId.toLowerCase();
  if (!UUID.test(id)) throw new Error(`not a node uuid: ${nodeId}`);
  return `graph:${id}`;
}

export function normalizeDoi(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.trim();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  d = d.toLowerCase();
  if (!/^10\.\d{4,9}\/\S+$/.test(d)) return null;
  return d;
}

export function doiSourceId(raw: string): string | null {
  const d = normalizeDoi(raw);
  return d ? `doi:${d}` : null;
}

export function parseSourceId(id: string): SourceIdentity | null {
  if (id.startsWith("graph:")) {
    const nodeId = id.slice(6);
    return UUID.test(nodeId) ? { kind: "graph", id, nodeId } : null;
  }
  if (id.startsWith("doi:")) {
    const doi = normalizeDoi(id.slice(4));
    return doi && `doi:${doi}` === id ? { kind: "doi", id, doi } : null;
  }
  if (id.startsWith("url:")) {
    const at = id.lastIndexOf("@");
    if (at < 5) return null;
    const url = id.slice(4, at);
    const sha256 = id.slice(at + 1);
    if (!SHA256.test(sha256)) return null;
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    } catch {
      return null;
    }
    return { kind: "url", id, url, sha256 };
  }
  return null;
}
