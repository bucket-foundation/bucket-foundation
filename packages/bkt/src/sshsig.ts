import { createHash, createPublicKey, verify } from "node:crypto";

export const RELEASE_PUBKEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOxLPJ9aXCPCnxg+caf9yG5sBavpDE65sfeX66PkAQLs release@bucket.foundation";
export const RELEASE_NAMESPACE = "bucket-release";

class Reader {
  private at = 0;
  constructor(private buf: Buffer) {}
  bytes(n: number): Buffer {
    if (this.at + n > this.buf.length) throw new Error("truncated signature");
    const out = this.buf.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  u32(): number {
    return this.bytes(4).readUInt32BE(0);
  }
  string(): Buffer {
    return this.bytes(this.u32());
  }
  done(): boolean {
    return this.at === this.buf.length;
  }
}

const sshString = (b: Buffer | string) => {
  const body = typeof b === "string" ? Buffer.from(b) : b;
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  return Buffer.concat([len, body]);
};

function ed25519Raw(blob: Buffer): Buffer {
  const r = new Reader(blob);
  if (r.string().toString() !== "ssh-ed25519") throw new Error("release key is not ed25519");
  const key = r.string();
  if (key.length !== 32 || !r.done()) throw new Error("malformed ed25519 key");
  return key;
}

export function verifySshSig(message: Buffer | string, armored: string, pubkey = RELEASE_PUBKEY, namespace = RELEASE_NAMESPACE): boolean {
  try {
    const m = armored.match(/-----BEGIN SSH SIGNATURE-----([\s\S]+?)-----END SSH SIGNATURE-----/);
    if (!m) return false;
    const r = new Reader(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
    if (r.bytes(6).toString() !== "SSHSIG" || r.u32() !== 1) return false;
    const sigKey = r.string();
    const ns = r.string().toString();
    const reserved = r.string();
    const hashAlg = r.string().toString();
    const sigBlob = r.string();
    if (!r.done() || ns !== namespace || (hashAlg !== "sha512" && hashAlg !== "sha256")) return false;
    const pinned = Buffer.from(pubkey.trim().split(/\s+/)[1] ?? "", "base64");
    if (!sigKey.equals(pinned)) return false;
    const s = new Reader(sigBlob);
    if (s.string().toString() !== "ssh-ed25519") return false;
    const sig = s.string();
    if (sig.length !== 64 || !s.done()) return false;
    const digest = createHash(hashAlg).update(message).digest();
    const signed = Buffer.concat([Buffer.from("SSHSIG"), sshString(namespace), sshString(reserved), sshString(hashAlg), sshString(digest)]);
    const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: ed25519Raw(pinned).toString("base64url") }, format: "jwk" });
    return verify(null, signed, key, sig);
  } catch {
    return false;
  }
}
