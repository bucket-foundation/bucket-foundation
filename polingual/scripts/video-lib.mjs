export const VIDEO_LANGS = ["en", "es", "fr", "de", "pt", "it", "ja"];

export function toSeconds(stamp) {
  if (typeof stamp === "number") return stamp;
  const parts = String(stamp).split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) throw new Error(`bad timestamp ${stamp}`);
  return Math.round(parts.reduce((acc, n) => acc * 60 + n, 0) * 1000) / 1000;
}

export function cuesFrom(chunks, sourceLang) {
  return chunks
    .map((c) => ({ start: toSeconds(c.start), end: toSeconds(c.end), text: { [sourceLang]: String(c.text ?? "").trim() } }))
    .filter((c) => c.text[sourceLang] && c.end > c.start);
}

export function mergeTranslations(cues, lang, lines) {
  if (lines.length !== cues.length) throw new Error(`${lang}: got ${lines.length} lines for ${cues.length} cues`);
  return cues.map((c, i) => ({ ...c, text: { ...c.text, [lang]: String(lines[i]).trim() } }));
}

export function buildVideo({ meta, cues, sourceLang, langs }) {
  const have = langs.filter((l) => cues.every((c) => c.text[l]));
  return {
    id: meta.id,
    title: meta.title,
    channel: meta.channel ?? meta.uploader ?? "",
    duration: Math.round(Number(meta.duration) || (cues.at(-1)?.end ?? 0)),
    source_lang: sourceLang,
    langs: have,
    cues,
  };
}

export function indexEntry(video, thumb) {
  return { id: video.id, title: video.title, channel: video.channel, duration: video.duration, langs: video.langs, thumb };
}

export function validateVideo(v) {
  const errors = [];
  for (const k of ["id", "title", "channel", "duration", "source_lang", "langs", "cues"]) if (!(k in v)) errors.push(`missing ${k}`);
  if (!Array.isArray(v.cues) || v.cues.length === 0) errors.push("no cues");
  else
    v.cues.forEach((c, i) => {
      if (!(c.end > c.start)) errors.push(`cue ${i} has end before start`);
      if (i > 0 && c.start < v.cues[i - 1].start) errors.push(`cue ${i} out of order`);
      for (const l of v.langs ?? []) if (!c.text?.[l]) errors.push(`cue ${i} missing ${l}`);
    });
  return errors;
}

export function parseJsonArray(text) {
  const start = text.indexOf("[");
  if (start < 0) throw new Error("no JSON array in reply");
  for (let end = text.indexOf("]", start); end >= 0; end = text.indexOf("]", end + 1)) {
    try {
      const arr = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(arr)) return arr.map(String);
    } catch {}
  }
  throw new Error("no JSON array in reply");
}
