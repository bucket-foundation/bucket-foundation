import { summarize } from "./parse";

self.onmessage = async (e: MessageEvent<{ file?: File; text?: string }>) => {
  try {
    const text = e.data.text ?? (e.data.file ? await e.data.file.text() : "");
    const summary = summarize(text);
    (self as unknown as Worker).postMessage({ ok: true, summary });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};

export {};
