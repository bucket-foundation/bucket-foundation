import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultDownloads } from "./library";

export type SaveText = (name: string, text: string) => { name: string; folder: string };

export function saveTextToDownloads(downloads: () => string = defaultDownloads): SaveText {
  return (name, text) => {
    const folder = downloads();
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let file = name;
    for (let i = 2; existsSync(join(folder, file)); i++) file = `${stem} (${i})${ext}`;
    writeFileSync(join(folder, file), text, { mode: 0o600, flag: "wx" });
    return { name: file, folder };
  };
}
