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

  const irys = await uploadEnvelopeToIrys(envelope);

  const att = await attestCitation(envelope, { arweaveTxId: irys.arweaveTxId });

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
