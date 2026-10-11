import { createHash } from "node:crypto";
import { closeSync, createReadStream, createWriteStream, existsSync, linkSync, mkdirSync, openSync, readSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createZstdCompress } from "node:zlib";
import { checkManifest, DECK_MANIFEST, DeckError, fileSha256, findInstalled, installDeck, MANIFEST_BYTES, refuseLink, type DeckManifest } from "./decks";

export const DECK_FILE_MAGIC = "BKTDECK1\n";
export const DECK_FILE_EXT = ".bktdeck";
const HEAD_BYTES = DECK_FILE_MAGIC.length + 4;

export function isDeckFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    const fd = openSync(path, "r");
    try {
      const head = Buffer.alloc(DECK_FILE_MAGIC.length);
      readSync(fd, head, 0, head.length, 0);
      return head.toString("latin1") === DECK_FILE_MAGIC;
    } finally {
      closeSync(fd);
    }
  } catch {
    return false;
  }
}

export function deckFileName(m: Pick<DeckManifest, "id">): string {
  return `${m.id}${DECK_FILE_EXT}`;
}

export function readDeckFileManifest(path: string): { manifest: DeckManifest; offset: number } {
  const fd = openSync(path, "r");
  try {
    const head = Buffer.alloc(HEAD_BYTES);
    if (readSync(fd, head, 0, HEAD_BYTES, 0) !== HEAD_BYTES || head.subarray(0, DECK_FILE_MAGIC.length).toString("latin1") !== DECK_FILE_MAGIC) throw new DeckError(`${path} is not a Bucket deck file`);
    const size = head.readUInt32BE(DECK_FILE_MAGIC.length);
    if (size === 0 || size > MANIFEST_BYTES) throw new DeckError(`${path} carries a manifest Bucket cannot read`);
    const raw = Buffer.alloc(size);
    if (readSync(fd, raw, 0, size, HEAD_BYTES) !== size) throw new DeckError(`${path} was cut short`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch {
      throw new DeckError(`${path} carries a manifest Bucket cannot read`);
    }
    return { manifest: checkManifest(parsed), offset: HEAD_BYTES + size };
  } finally {
    closeSync(fd);
  }
}

export async function unpackDeckFile(path: string, into: string): Promise<DeckManifest> {
  refuseLink(path);
  const { manifest, offset } = readDeckFileManifest(path);
  mkdirSync(into, { recursive: true, mode: 0o700 });
  await pipeline(createReadStream(path, { start: offset }), createWriteStream(join(into, manifest.file), { mode: 0o600 }));
  writeFileSync(join(into, DECK_MANIFEST), JSON.stringify(manifest), { mode: 0o600 });
  return manifest;
}

export async function installDeckFile(home: string, path: string): Promise<DeckManifest> {
  const tmp = join(home, `.deck-import.${process.pid}.${Date.now()}`);
  try {
    await unpackDeckFile(path, tmp);
    return await installDeck(home, tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function installAny(home: string, source: string): Promise<DeckManifest> {
  return isDeckFile(source) ? installDeckFile(home, source) : installDeck(home, source);
}

export class DeckExistsError extends DeckError {
  constructor(readonly path: string) {
    super(`${path} already exists; Bucket did not replace it`);
  }
}

export async function exportDeck(home: string, deck: string, dest: string, o: { replace?: boolean } = {}): Promise<{ manifest: DeckManifest; path: string; bytes: number }> {
  const found = findInstalled(home, deck);
  if (!found) throw new DeckError(`no installed deck matches ${deck}`);
  refuseLink(dest);
  if (existsSync(dest) && !o.replace) throw new DeckExistsError(dest);
  mkdirSync(dirname(dest), { recursive: true });
  const packed = `${dest}.${process.pid}.zst`;
  const part = `${dest}.${process.pid}.part`;
  try {
    const h = createHash("sha256");
    let bytes = 0;
    const tally = new Transform({
      transform(chunk: Buffer, _enc, done) {
        bytes += chunk.length;
        h.update(chunk);
        done(null, chunk);
      },
    });
    await pipeline(createReadStream(found.db), createZstdCompress(), tally, createWriteStream(packed, { mode: 0o600 }));
    if ((await fileSha256(found.db)) !== found.manifest.db_sha256) throw new DeckError(`the installed ${found.manifest.title} deck no longer matches its manifest; install it again before sharing it`);
    const manifest: DeckManifest = { ...found.manifest, bytes, sha256: h.digest("hex") };
    const body = Buffer.from(JSON.stringify(manifest), "utf8");
    const head = Buffer.alloc(HEAD_BYTES);
    head.write(DECK_FILE_MAGIC, "latin1");
    head.writeUInt32BE(body.length, DECK_FILE_MAGIC.length);
    writeFileSync(part, Buffer.concat([head, body]), { mode: 0o600 });
    await pipeline(createReadStream(packed), createWriteStream(part, { flags: "a" }));
    if (o.replace) renameSync(part, dest);
    else {
      try {
        linkSync(part, dest);
      } catch {
        throw new DeckExistsError(dest);
      }
    }
    return { manifest, path: dest, bytes: statSync(dest).size };
  } finally {
    rmSync(packed, { force: true });
    rmSync(part, { force: true });
  }
}
