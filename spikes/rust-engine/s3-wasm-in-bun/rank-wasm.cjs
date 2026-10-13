function scoreBits(x) {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, x);
  return b.getBigUint64(0).toString(16).padStart(16, "0");
}

function loadRank(bytes) {
  const x = new WebAssembly.Instance(new WebAssembly.Module(bytes), {}).exports;
  const enc = new TextEncoder();
  const put = (data) => {
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    return [ptr, data.length];
  };
  const floats = (v) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  const hits = (n) => {
    const view = new DataView(x.memory.buffer);
    const ids = x.result_ids();
    const scores = x.result_scores();
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = [view.getUint32(ids + i * 4, true), view.getFloat64(scores + i * 8, true)];
    return out;
  };
  const clamp = (topK) => Math.max(0, Math.min(0xffffffff, Math.trunc(topK) || 0));
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

module.exports = { loadRank, scoreBits };
