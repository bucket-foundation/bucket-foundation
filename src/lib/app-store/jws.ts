import { X509Certificate, createPublicKey, verify } from "node:crypto";
import { APPLE_ROOT_CA_G3_DER_BASE64 } from "./apple-root";

const LEAF_OID = Buffer.from("060a2a864886f76364060b01", "hex");
const INTERMEDIATE_OID = Buffer.from("060a2a864886f76364060201", "hex");

export class JwsError extends Error {}

export interface VerifyOptions {
  roots?: X509Certificate[];
  at?: (payload: Record<string, unknown>) => Date;
}

let _apple: X509Certificate | null = null;
export function appleRoot(): X509Certificate {
  if (!_apple) _apple = new X509Certificate(Buffer.from(APPLE_ROOT_CA_G3_DER_BASE64, "base64"));
  return _apple;
}

function b64url(part: string): Buffer {
  return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function within(cert: X509Certificate, at: Date): boolean {
  return Date.parse(cert.validFrom) <= at.getTime() && at.getTime() <= Date.parse(cert.validTo);
}

function signedAt(payload: Record<string, unknown>): Date {
  const ms = typeof payload.signedDate === "number" ? payload.signedDate : NaN;
  return Number.isFinite(ms) ? new Date(ms) : new Date();
}

export function verifyJws(token: string, opts: VerifyOptions = {}): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new JwsError("malformed");
  let header: { alg?: unknown; x5c?: unknown };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(b64url(parts[0]).toString("utf8"));
    payload = JSON.parse(b64url(parts[1]).toString("utf8"));
  } catch {
    throw new JwsError("malformed");
  }
  if (header.alg !== "ES256") throw new JwsError("bad_alg");
  if (!Array.isArray(header.x5c) || header.x5c.length !== 3 || !header.x5c.every((c) => typeof c === "string")) throw new JwsError("bad_x5c");
  let chain: X509Certificate[];
  try {
    chain = (header.x5c as string[]).map((c) => new X509Certificate(Buffer.from(c, "base64")));
  } catch {
    throw new JwsError("bad_x5c");
  }
  const [leaf, intermediate, root] = chain;
  const roots = opts.roots ?? [appleRoot()];
  if (!roots.some((r) => r.fingerprint256 === root.fingerprint256)) throw new JwsError("untrusted_root");
  if (!intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) throw new JwsError("bad_chain");
  if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) throw new JwsError("bad_chain");
  if (!intermediate.ca || leaf.ca) throw new JwsError("bad_chain");
  if (!intermediate.raw.includes(INTERMEDIATE_OID) || !leaf.raw.includes(LEAF_OID)) throw new JwsError("bad_chain");
  const at = (opts.at ?? signedAt)(payload);
  if (!chain.every((c) => within(c, at))) throw new JwsError("expired_chain");
  const ok = verify("sha256", Buffer.from(`${parts[0]}.${parts[1]}`), { key: createPublicKey(leaf.publicKey.export({ type: "spki", format: "pem" })), dsaEncoding: "ieee-p1363" }, b64url(parts[2]));
  if (!ok) throw new JwsError("bad_signature");
  return payload;
}
