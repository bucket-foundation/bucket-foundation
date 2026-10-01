export type Hit = [number, number];

interface Exports {
  memory: WebAssembly.Memory;
  alloc(len: number): number;
  release(ptr: number, len: number): void;
  index_reset(): void;
  index_push(text: number, textLen: number, vec: number, vecCount: number): void;
  token_rank(query: number, queryLen: number, topK: number): number;
  cosine_rank_q(query: number, count: number, topK: number, single: number): number;
  result_ids(): number;
  result_scores(): number;
}

export interface Rank {
  reset(): void;
  push(text: string, vec?: Float32Array): void;
  tokenRank(query: string, topK: number): Hit[];
  cosineRank(q: Float32Array, topK: number, single?: boolean): Hit[];
}

export function scoreBits(x: number): string {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, x);
  return b.getBigUint64(0).toString(16).padStart(16, "0");
}

export function loadRank(bytes: BufferSource): Rank {
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), {});
  const x = instance.exports as unknown as Exports;
  const enc = new TextEncoder();
  const put = (data: Uint8Array): [number, number] => {
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    return [ptr, data.length];
  };
  const floats = (v: Float32Array) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  const hits = (n: number): Hit[] => {
    const view = new DataView(x.memory.buffer);
    const ids = x.result_ids();
    const scores = x.result_scores();
    const out: Hit[] = new Array(n);
    for (let i = 0; i < n; i++) out[i] = [view.getUint32(ids + i * 4, true), view.getFloat64(scores + i * 8, true)];
    return out;
  };
  const clamp = (topK: number) => Math.max(0, Math.min(0xffffffff, Math.trunc(topK) || 0));
  return {
    reset: () => x.index_reset(),
    push(text, vec = new Float32Array(0)) {
      const [t, tLen] = put(enc.encode(text));
      const [v, vLen] = put(floats(vec));
      x.index_push(t, tLen, v, vec.length);
      x.release(t, tLen);
      x.release(v, vLen);
    },
    tokenRank(query, topK) {
      const [q, qLen] = put(enc.encode(query));
      const n = x.token_rank(q, qLen, clamp(topK));
      x.release(q, qLen);
      return hits(n);
    },
    cosineRank(q, topK, single = false) {
      const [p, len] = put(floats(q));
      const n = x.cosine_rank_q(p, q.length, clamp(topK), single ? 1 : 0);
      x.release(p, len);
      return hits(n);
    },
  };
}
