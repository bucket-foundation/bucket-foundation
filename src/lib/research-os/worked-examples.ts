export function firstHalfOfWorkedExample(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)/g);
  if (!sentences || sentences.length === 0) return trimmed;
  const half = Math.max(1, Math.ceil(sentences.length / 2));
  return sentences.slice(0, half).join("").trim();
}
