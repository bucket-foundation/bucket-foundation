/**
 * bucket.foundation — Irys (Arweave) permanent storage helper
 * ------------------------------------------------------------
 * Uploads a citation envelope as JSON to Irys, which bundles it onto Arweave
 * for pay-once-store-forever semantics. Returns the Arweave tx id + gateway
 * URL.
 *
 * We use Irys over raw Arweave because:
 *   - supports Base (USDC / ETH) payment — same wallet as x402 rail
 *   - programmable tags + instant finality receipts
 *   - ~20x cheaper than raw Arweave bundlers (see BLOCKCHAIN_LANDSCAPE.md §B)
 *
 * Env:
 *   BUCKET_WALLET_PRIVATE_KEY   funded Base / Base Sepolia key
 *   IRYS_NODE_URL               default "https://devnet.irys.xyz" (devnet)
 *                                      "https://node1.irys.xyz"  (mainnet)
 *   IRYS_TOKEN                  default "base-eth" (mainnet)
 *                                       "base-ethereum"  (devnet naming varies)
 */

export type IrysUploadResult = {
  arweaveTxId: string;
  url: string;
  gateway: string;
  size: number;
};

export async function uploadEnvelopeToIrys(
  envelope: unknown,
): Promise<IrysUploadResult> {
  const pk = process.env.BUCKET_WALLET_PRIVATE_KEY;
  if (!pk) throw new Error("BUCKET_WALLET_PRIVATE_KEY is not set");

  const node = process.env.IRYS_NODE_URL ?? "https://devnet.irys.xyz";
  const token = process.env.IRYS_TOKEN ?? "base-eth";

  // Dynamic import so the @irys/sdk doesn't land in the default bundle.
  // NOTE: package is not yet in deps; add `@irys/sdk` or `@irys/upload` when
  // enabling the feature flag in prod.
  let IrysCtor: unknown;
  try {
    // Indirect import string keeps TS from resolving the module at build time,
    // so the app builds without @irys/sdk installed. Install before enabling
    // the feature flag: `npm i @irys/sdk`.
    const modName = "@irys/sdk";
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const dyn = new Function("m", "return import(m)") as (
      m: string,
    ) => Promise<unknown>;
    const mod: unknown = await dyn(modName);
    IrysCtor =
      (mod as { default?: unknown }).default ??
      (mod as { Irys?: unknown }).Irys ??
      mod;
  } catch (e) {
    throw new Error(
      `@irys/sdk not installed. Run: npm i @irys/sdk — original error: ${String(
        e,
      )}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Irys = IrysCtor as any;
  const irys = new Irys({
    url: node,
    token,
    key: pk,
  });

  const body = Buffer.from(JSON.stringify(envelope));
  const tags = [
    { name: "Content-Type", value: "application/json" },
    { name: "App-Name", value: "bucket.foundation" },
    { name: "App-Version", value: "permanence/v0.1" },
    {
      name: "License",
      value: "bucket.foundation/cite-forever/v0.1",
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipt: any = await irys.upload(body, { tags });
  const arweaveTxId: string = receipt.id;
  const gateway = node.includes("devnet")
    ? "https://devnet.irys.xyz"
    : "https://gateway.irys.xyz";

  return {
    arweaveTxId,
    url: `${gateway}/${arweaveTxId}`,
    gateway,
    size: body.length,
  };
}
