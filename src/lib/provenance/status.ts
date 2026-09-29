import { SignJWT, importJWK, jwtVerify, type JWK } from "jose";
import { gunzipSync, gzipSync } from "node:zlib";

export const MIN_LIST_BITS = 131072;

export function encodeStatusList(revoked: number[], size = MIN_LIST_BITS): string {
  if (size < MIN_LIST_BITS || size % 8 !== 0) throw new Error("status_list_size");
  const bytes = new Uint8Array(size / 8);
  for (const i of revoked) {
    if (!Number.isInteger(i) || i < 0 || i >= size) throw new Error(`status_index_out_of_range:${i}`);
    bytes[i >> 3] |= 0x80 >> (i & 7);
  }
  return "u" + Buffer.from(gzipSync(bytes)).toString("base64url");
}

export function decodeStatusList(encoded: string): Uint8Array {
  if (!encoded.startsWith("u")) throw new Error("status_list_multibase");
  return new Uint8Array(gunzipSync(Buffer.from(encoded.slice(1), "base64url")));
}

export function isRevoked(encoded: string, index: number): boolean {
  const bytes = decodeStatusList(encoded);
  if (!Number.isInteger(index) || index < 0 || index >= bytes.length * 8) throw new Error("status_index_out_of_range");
  return (bytes[index >> 3] & (0x80 >> (index & 7))) !== 0;
}

export function statusListCredential(listUrl: string, issuer: string, encodedList: string, validFrom: string) {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: listUrl,
    type: ["VerifiableCredential", "BitstringStatusListCredential"],
    issuer,
    validFrom,
    credentialSubject: {
      id: `${listUrl}#list`,
      type: "BitstringStatusList",
      statusPurpose: "revocation",
      encodedList,
    },
  };
}

export type StatusListCredential = ReturnType<typeof statusListCredential>;

export async function signStatusList(list: StatusListCredential, jwk: JWK & { kid: string }): Promise<string> {
  const key = await importJWK(jwk, "EdDSA");
  return await new SignJWT({ vc: list as unknown as Record<string, unknown> })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: jwk.kid })
    .setIssuer(list.issuer)
    .setJti(list.id)
    .sign(key);
}

export async function verifyStatusList(jwt: string, publicJwks: JWK[]): Promise<StatusListCredential> {
  for (const pub of publicJwks) {
    try {
      const { payload } = await jwtVerify(jwt, await importJWK(pub, "EdDSA"), { algorithms: ["EdDSA"] });
      const vc = (payload as { vc?: StatusListCredential }).vc;
      if (vc?.credentialSubject?.statusPurpose === "revocation") return vc;
    } catch {
      continue;
    }
  }
  throw new Error("status_list_signature");
}
