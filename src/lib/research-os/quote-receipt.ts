/**
 * The identity of one curated quotation, and the payload a receipt is
 * written from (ros-ai-access, learning/research-os/ai/IMPLEMENTATION.md,
 * "Quote contract").
 *
 * The curated slice quotes a graph node, so the source's identity is
 * `graph:<uuid>` and its revision is a hash over what the quotation stands
 * on: the passage text, its locator, and the node's own citation fields.
 * A passage edited later produces a different revision, so a receipt says
 * which version was quoted rather than pointing at whatever the node holds
 * now.
 *
 * An idempotency key is derived from the same material plus the session,
 * so a retry of one Quote call returns the receipt it already wrote, and a
 * different quotation in the same session is a different key.
 */
import { createHash } from "node:crypto";

export interface CuratedQuoteSource {
  nodeId: string;
  slug: string;
  title: string;
  /** The verbatim span, as the server rehydrated it. */
  text: string;
  locator: string;
  /** The citation line the span is attributed to. */
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

/** `graph:<uuid>`: a source identity that survives a slug rename. */
export function curatedSourceId(nodeId: string): string {
  return `graph:${nodeId}`;
}

/**
 * The revision of a curated source: a hash over the span, its locator and
 * the citation it is attributed to. Any edit to those changes it.
 */
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

/**
 * Everything a receipt records for one curated quotation, including the
 * key a retry is recognized by. `sessionId` separates two quotations of
 * the same span in different sittings; a Quote call with no session falls
 * back to the span itself, so a repeat within one request is one receipt.
 */
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
