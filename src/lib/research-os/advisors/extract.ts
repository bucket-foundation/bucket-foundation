export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

export function docxXmlToText(xml: string): string {
  const paragraphs = xml.split(/<\/w:p>/);
  const out: string[] = [];
  for (const p of paragraphs) {
    const parts: string[] = [];
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p))) parts.push(m[1] !== undefined ? decodeXml(m[1]) : m[0] === "<w:tab/>" ? "\t" : "\n");
    const line = parts.join("");
    if (line.trim()) out.push(line);
  }
  return out.join("\n");
}

export type FileKind = "pdf" | "docx" | "text";

export function kindOf(name: string, type: string): FileKind | null {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (n.endsWith(".docx") || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (n.endsWith(".txt") || n.endsWith(".md") || type.startsWith("text/")) return "text";
  return null;
}

export async function docxToText(buf: ArrayBuffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buf);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("This .docx has no word/document.xml.");
  return docxXmlToText(await doc.async("string"));
}

export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than 10 MB.");
  const kind = kindOf(file.name, file.type);
  if (!kind) throw new Error("Use a PDF, DOCX, TXT or Markdown file.");
  if (kind === "text") return file.text();
  const buf = await file.arrayBuffer();
  if (kind === "pdf") {
    const { pdfToText } = await import("./pdf");
    return pdfToText(buf);
  }
  return docxToText(buf);
}
