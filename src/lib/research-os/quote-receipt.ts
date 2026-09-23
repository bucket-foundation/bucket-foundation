import { createHash } from "node:crypto";

export interface CuratedQuoteSource {
  nodeId: string;
  slug: string;
  title: string;
  text: string;
  locator: string;
  citation: string;
}

export interface QuoteReceiptPayload {
  sourceId: string;
  sourceRevision: string;
  sourceNodeId: string;
  passageId: string;
  locator: string;
  textHash: string;
  payloadHash: string;
  idempotencyKey: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function curatedSourceId(nodeId: string): string {
  return `graph:${nodeId}`;
}

export function curatedSourceRevision(source: CuratedQuoteSource): string {
  return sha256(
    JSON.stringify({
      v: 1,
      nodeId: source.nodeId,
      text: source.text,
      locator: source.locator,
      citation: source.citation,
    }),
  );
}

export function curatedQuotePayload(source: CuratedQuoteSource, sessionId: string | null): QuoteReceiptPayload {
  const sourceId = curatedSourceId(source.nodeId);
  const sourceRevision = curatedSourceRevision(source);
  const textHash = sha256(source.text);
  const payloadHash = sha256(
    JSON.stringify({ v: 1, sourceId, sourceRevision, locator: source.locator, textHash, target: source.nodeId }),
  );
  return {
    sourceId,
    sourceRevision,
    sourceNodeId: source.nodeId,
    passageId: `${sourceId}#${source.locator}`,
    locator: source.locator,
    textHash,
    payloadHash,
    idempotencyKey: sha256(JSON.stringify({ v: 1, session: sessionId ?? "", payloadHash })),
  };
}
