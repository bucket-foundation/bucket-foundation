export type CitationEnvelope = Record<string, unknown> & {
  citation?: {
    canonical_url?: string;
    [k: string]: unknown;
  };
  cite?: {
    price_usd?: number;
    payout_wallet?: string;
    license?: string;
  };
  canon_tier?: string;
  foundation_branches?: string[];
  provenance?: unknown[];
};

export type AttestResult = {
  uid: string;
  txHash: string;
  scanner: string;
};

export function canonicalize(value: unknown): string {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sortKeys((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sortKeys(value));
}

export async function artifactHash(envelope: unknown): Promise<`0x${string}`> {
  const { keccak256, toHex } = await import("viem");
  const canon = canonicalize(envelope);
  return keccak256(toHex(canon));
}

export async function attestCitation(
  envelope: CitationEnvelope,
  opts: { arweaveTxId: string },
): Promise<AttestResult> {
  const pk = process.env.BUCKET_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  const easAddr = process.env.EAS_CONTRACT_BASE as `0x${string}` | undefined;
  const schemaUid = process.env.EAS_SCHEMA_UID as `0x${string}` | undefined;
  const chain = process.env.EAS_CHAIN ?? "base-sepolia";

  if (!pk) throw new Error("BUCKET_WALLET_PRIVATE_KEY is not set");
  if (!easAddr) throw new Error("EAS_CONTRACT_BASE is not set");
  if (!schemaUid)
    throw new Error(
      "EAS_SCHEMA_UID is not set — run scripts/register-eas-schema.ts",
    );

  const { createWalletClient, createPublicClient, http, encodeAbiParameters } =
    await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const chains = await import("viem/chains");

  const targetChain =
    chain === "base" ? chains.base : chains.baseSepolia;

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({
    chain: targetChain,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: targetChain,
    transport: http(),
  });

  const hash = await artifactHash(envelope);
  const canonicalUrl = envelope.citation?.canonical_url ?? "";
  const payoutWallet = (envelope.cite?.payout_wallet ??
    account.address) as `0x${string}`;
  const priceUsdc = BigInt(
    Math.round(((envelope.cite?.price_usd as number) ?? 0) * 1_000_000),
  );
  const license =
    envelope.cite?.license ?? "bucket.foundation/cite-forever/v0.1";
  const branches = (envelope.foundation_branches ?? []) as string[];
  const canonTier = envelope.canon_tier ?? "candidate";
  const publishedAt = BigInt(Math.floor(Date.now() / 1000));

  const encodedData = encodeAbiParameters(
    [
      { name: "artifactHash", type: "bytes32" },
      { name: "canonicalUrl", type: "string" },
      { name: "arweaveTxId", type: "string" },
      { name: "payoutWallet", type: "address" },
      { name: "pricePerCiteUsdcE6", type: "uint256" },
      { name: "license", type: "string" },
      { name: "foundationBranches", type: "string[]" },
      { name: "canonTier", type: "string" },
      { name: "publishedAt", type: "uint64" },
    ],
    [
      hash,
      canonicalUrl,
      opts.arweaveTxId,
      payoutWallet,
      priceUsdc,
      license,
      branches,
      canonTier,
      publishedAt,
    ],
  );

  const easAbi = [
    {
      name: "attest",
      type: "function",
      stateMutability: "payable",
      inputs: [
        {
          name: "request",
          type: "tuple",
          components: [
            { name: "schema", type: "bytes32" },
            {
              name: "data",
              type: "tuple",
              components: [
                { name: "recipient", type: "address" },
                { name: "expirationTime", type: "uint64" },
                { name: "revocable", type: "bool" },
                { name: "refUID", type: "bytes32" },
                { name: "data", type: "bytes" },
                { name: "value", type: "uint256" },
              ],
            },
          ],
        },
      ],
      outputs: [{ name: "", type: "bytes32" }],
    },
  ] as const;

  const request = {
    schema: schemaUid,
    data: {
      recipient: payoutWallet,
      expirationTime: BigInt(0),
      revocable: false,
      refUID:
        "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      data: encodedData,
      value: BigInt(0),
    },
  } as const;

  const txHash = await walletClient.writeContract({
    address: easAddr,
    abi: easAbi,
    functionName: "attest",
    args: [request],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const uid =
    (receipt.logs[0]?.topics?.[1] as `0x${string}` | undefined) ??
    ("0x" + "0".repeat(64));

  const scannerHost =
    chain === "base" ? "base.easscan.org" : "base-sepolia.easscan.org";

  return {
    uid,
    txHash,
    scanner: `https://${scannerHost}/attestation/view/${uid}`,
  };
}
