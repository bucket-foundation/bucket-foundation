import { permanentize } from "../src/lib/permanence/dual-write";

const sample = {
  data: {
    title: "Sample Canon Entry",
    body: "Keccak is deterministic; therefore any bit-identical JSON canonicalization yields a stable artifactHash.",
  },
  citation: {
    type: "source",
    source_id: "bucket:test:001",
    provider: "bucket-foundation",
    retrieved_at: new Date().toISOString(),
    license: "CC-BY-4.0",
    canonical_url: "https://www.bucket.foundation/test/001",
  },
  receipt: {
    tier: "insight",
    price_usd: 0.002,
    tx: null,
    paid_at: null,
    buyer_wallet: null,
    status: "test",
  },
  cite: {
    price_usd: 0.002,
    payout_wallet: "0xa91115B1AB8412f380Fd62446F523559F668b96B",
    license: "bucket.foundation/cite-forever/v0.1",
  },
  tags: ["test", "permanence"],
  canon_tier: "candidate",
  foundation_branches: ["04-information"],
  provenance: [
    {
      action: "generated",
      at: new Date().toISOString(),
      by: "test-permanence-script",
      via: "local",
    },
  ],
};

async function main() {
  console.log("Dual-writing sample envelope");
  console.log(
    "  keccak stable hash preview:",
    JSON.stringify(sample).slice(0, 80) + "...",
  );

  const r = await permanentize(sample);

  console.log("\n== Arweave (Irys) ==");
  console.log("  tx id   :", r.arweaveTxId);
  console.log("  url     :", r.arweaveUrl);

  console.log("\n== EAS attestation ==");
  console.log("  uid     :", r.attestationUid);
  console.log("  tx      :", r.attestationTxHash);
  console.log("  scanner :", r.attestationScanner);

  console.log("\n== Enriched envelope.provenance[] ==");
  console.log(JSON.stringify(r.enriched.provenance, null, 2));

  try {
    const resp = await fetch(r.arweaveUrl);
    console.log("\nIrys gateway status:", resp.status);
  } catch (e) {
    console.log("\nIrys gateway fetch error (devnet may be slow):", String(e));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
