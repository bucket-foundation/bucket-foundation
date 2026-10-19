import { join } from "node:path";
import { isOffline } from "../serve";
import type { Session } from "../setup";
import { createRemoteSync, DEFAULT_SYNC_BASE, type RemoteSync } from "../../../../src/lib/academy/remote-sync";
import { sealedMetaStorage } from "./store-storage";
import { pickVault } from "./token-vault";

export function openRemote(session: Session, dir: string, env: Record<string, string | undefined> = process.env): RemoteSync {
  const storage = sealedMetaStorage(session.store, session.key);
  return createRemoteSync({
    base: env.BKT_SYNC_URL || DEFAULT_SYNC_BASE,
    storage: () => storage,
    vault: pickVault(join(dir, "session.json"), env),
    device: { id: session.device.id, publicKey: session.device.publicKey, sign: (m) => session.device.sign(m) },
    readLocal: (branch) => session.store.learnState(branch),
    offline: () => isOffline(env),
  });
}
