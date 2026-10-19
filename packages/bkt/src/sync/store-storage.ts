import { open, seal } from "../crypto";

export const SYNC_META_PREFIX = "sync:";

export interface MetaStore {
  meta(k: string): string | null;
  setMeta(k: string, v: string): void;
  deleteMeta?(k: string): void;
  metaKeys?(prefix: string): string[];
}

export function sealedMetaStorage(store: MetaStore, key: Buffer): Storage {
  const k = (name: string) => SYNC_META_PREFIX + name;
  const keys = () => (store.metaKeys?.(SYNC_META_PREFIX) ?? []).map((x) => x.slice(SYNC_META_PREFIX.length));
  return {
    getItem(name: string) {
      const v = store.meta(k(name));
      return v === null || v === "" ? null : open(key, v, k(name));
    },
    setItem(name: string, value: string) {
      store.setMeta(k(name), seal(key, String(value), k(name)));
    },
    removeItem(name: string) {
      if (store.deleteMeta) store.deleteMeta(k(name));
      else store.setMeta(k(name), "");
    },
    clear() {
      for (const name of keys()) this.removeItem(name);
    },
    key(i: number) {
      return keys()[i] ?? null;
    },
    get length() {
      return keys().length;
    },
  };
}
