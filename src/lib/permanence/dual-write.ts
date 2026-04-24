/**
 * bucket.foundation — dual-write orchestrator
 * --------------------------------------------
 * permanentize(envelope):
 *   1. upload full envelope JSON to Irys/Arweave → arweaveTxId
 *   2. attest (hash + metadata + arweaveTxId) on EAS → uid
 *   3. enrich envelope.provenance[] with both receipts
 *   4. return { attestationUid, arweaveTxId, enriched }
 *
 * Order matters: Arweave first so the attestation can reference the tx id.
 */

import type { CitationEnvelope } from "./eas";

export type PermanenceReceipt = {
  attestationUid: string;
  attestationTxHash: string;
  attestationScanner: string;
  arweaveTxId: string;
  arweaveUrl: string;
  enriched: CitationEnvelope;
};

export async function permanentize(
  envelope: CitationEnvelope,
): Promise<PermanenceReceipt> {
  const { uploadEnvelopeToIrys } = await import("./irys");
  const { attestCitation } = await import("./eas");

  const now = () => new Date().toISOString();
  const existingProv = Array.isArray(envelope.provenance)
    ? (envelope.provenance as unknown[])
    : [];

  // 1. Store the full envelope on Arweave (via Irys)
  const irys = await uploadEnvelopeToIrys(envelope);

  // 2. Attest the hash + arweaveTxId on EAS
  const att = await attestCitation(envelope, { arweaveTxId: irys.arweaveTxId });

  // 3. Enrich provenance
  const enriched: CitationEnvelope = {
    ...envelope,
    provenance: [
      ...existingProv,
      {
        action: "stored_permanent",
        at: now(),
        by: "bucket-permanence/v1",
        via: irys.gateway,
        arweave_tx_id: irys.arweaveTxId,
        url: irys.url,
        size_bytes: irys.size,
      },
      {
        action: "attested",
        at: now(),
        by: "bucket-permanence/v1",
        via: "eas:" + (process.env.EAS_CHAIN ?? "base-sepolia"),
        attestation_uid: att.uid,
        tx_hash: att.txHash,
        scanner: att.scanner,
        arweave_tx_id: irys.arweaveTxId,
      },
    ],
  };

  return {
    attestationUid: att.uid,
    attestationTxHash: att.txHash,
    attestationScanner: att.scanner,
    arweaveTxId: irys.arweaveTxId,
    arweaveUrl: irys.url,
    enriched,
  };
}
