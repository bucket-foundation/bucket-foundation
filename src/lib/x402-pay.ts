export async function signX402ServerSide(
  _resourceUrl: string,
  _priceUsd: number,
): Promise<string | null> {
  const pk = process.env.BUCKET_WALLET_PRIVATE_KEY;
  if (!pk) {
    return null;
  }

  console.warn(
    "[x402-pay] BUCKET_WALLET_PRIVATE_KEY is set but server-side signing " +
      "is not yet implemented — serving zero-key canon fallback. " +
      "See FOUNDER ACTION in src/lib/x402-pay.ts.",
  );
  return null;
}
