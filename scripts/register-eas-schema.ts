/**
 * One-shot: register the BucketCitation schema on EAS.
 *
 * Requires:
 *   BUCKET_WALLET_PRIVATE_KEY   funded key on target chain (~0.001 ETH on Base Sepolia)
 *   EAS_SCHEMA_REGISTRY         default Base predeploy 0x4200000000000000000000000000000000000020
 *   EAS_CHAIN                   "base" | "base-sepolia" (default base-sepolia)
 *
 * Run:
 *   npx tsx scripts/register-eas-schema.ts
 *
 * Output: the schema UID. Paste into .env as EAS_SCHEMA_UID.
 *
 * DO NOT run this automatically — it costs gas and requires a funded key.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const SCHEMA =
  "bytes32 artifactHash,string canonicalUrl,string arweaveTxId,address payoutWallet,uint256 pricePerCiteUsdcE6,string license,string[] foundationBranches,string canonTier,uint64 publishedAt";

const REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schema", type: "string" },
      { name: "resolver", type: "address" },
      { name: "revocable", type: "bool" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

async function main() {
  const pk = process.env.BUCKET_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) throw new Error("BUCKET_WALLET_PRIVATE_KEY is not set");

  const registry =
    (process.env.EAS_SCHEMA_REGISTRY as `0x${string}` | undefined) ??
    "0x4200000000000000000000000000000000000020";
  const chain =
    process.env.EAS_CHAIN === "base" ? base : baseSepolia;

  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({ chain, transport: http() });
  const wallet = createWalletClient({ account, chain, transport: http() });

  console.log("Registering BucketCitation schema");
  console.log("  chain    :", chain.name);
  console.log("  registry :", registry);
  console.log("  signer   :", account.address);
  console.log("  schema   :", SCHEMA);

  const txHash = await wallet.writeContract({
    address: registry,
    abi: REGISTRY_ABI,
    functionName: "register",
    args: [
      SCHEMA,
      "0x0000000000000000000000000000000000000000" as `0x${string}`,
      false, // revocable=false — canon citations are immutable
    ],
  });
  console.log("  tx       :", txHash);

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
  // Registry emits Registered(bytes32 indexed uid, address registerer, SchemaRecord schema)
  const uid =
    (receipt.logs[0]?.topics?.[1] as `0x${string}` | undefined) ??
    keccak256(toHex(SCHEMA));

  console.log("\nSUCCESS. Schema UID:");
  console.log(uid);
  console.log("\nAdd this to your .env:");
  console.log(`EAS_SCHEMA_UID=${uid}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
