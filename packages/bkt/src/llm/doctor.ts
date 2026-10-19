import type { Exec } from "../platform";
import { RECOMMENDED_LOCAL_MODEL } from "./config";
import { probeLocal, pickChatModel, type LocalServer } from "./local";
import { OpenAiProvider } from "./openai";
import type { Fetch } from "./types";

export const DOCTOR_PROMPT = "Reply with the single word ready.";
export const DOCTOR_MAX_TOKENS = 64;
export const RUNNER_CRASH = /runner process (has )?terminated|core dumped|signal: (aborted|segmentation)|exit status [1-9]|llama runner/i;

export interface Gpu {
  vendor: string;
  name: string;
}

export interface Completion {
  ok: boolean;
  model: string;
  seconds: number;
  firstTokenSeconds: number | null;
  outputTokens: number;
  tokensPerSecond: number | null;
  text: string;
  error?: string;
  crashed: boolean;
}

export interface Placement {
  processor: "gpu" | "cpu" | "split" | "unknown";
  vramBytes: number;
  totalBytes: number;
}

export interface DoctorReport {
  gpus: Gpu[];
  rocm: boolean;
  server: LocalServer | null;
  runner: string | null;
  completion: Completion | null;
  placement: Placement | null;
}

export interface DoctorDeps {
  fetch: Fetch;
  exec: Exec;
  now: () => number;
  which: (bin: string) => string | null;
}

export function parseLspci(out: string): Gpu[] {
  return out
    .split("\n")
    .filter((l) => /VGA compatible controller|3D controller|Display controller/.test(l))
    .map((l) => {
      const desc = l.replace(/^\S+\s+[^:]+:\s*/, "").replace(/\s*\(rev [0-9a-f]+\)\s*$/, "");
      const vendor = /AMD|ATI/.test(desc) ? "amd" : /NVIDIA/i.test(desc) ? "nvidia" : /Intel/i.test(desc) ? "intel" : "other";
      return { vendor, name: desc };
    });
}

export function placementOf(ps: { models?: { name?: string; model?: string; size?: number; size_vram?: number }[] }, model: string): Placement | null {
  const m = ps.models?.find((x) => x.name === model || x.model === model);
  if (!m || typeof m.size !== "number") return null;
  const vram = m.size_vram ?? 0;
  const processor = vram === 0 ? "cpu" : vram >= m.size ? "gpu" : "split";
  return { processor, vramBytes: vram, totalBytes: m.size };
}

export async function runDoctor(deps: DoctorDeps, model?: string, server?: LocalServer): Promise<DoctorReport> {
  const gpus = deps.which("lspci") ? parseLspci((await deps.exec(["lspci"])).stdout) : [];
  const rocm = deps.which("rocminfo") !== null;
  const found = server ?? (await probeLocal(deps.fetch))[0] ?? null;
  const report: DoctorReport = { gpus, rocm, server: found, runner: null, completion: null, placement: null };
  if (!found) return report;
  const root = found.baseUrl.replace(/\/v1$/, "");
  if (found.preset === "ollama") {
    try {
      const v = (await (await deps.fetch(`${root}/api/version`)).json()) as { version?: string };
      report.runner = v.version ? `ollama ${v.version}` : "ollama";
    } catch {
      report.runner = "ollama";
    }
  } else report.runner = found.preset;
  const chosen = model ?? pickChatModel(found.models);
  if (!chosen) return report;
  const provider = new OpenAiProvider({ name: found.preset, baseUrl: found.baseUrl, model: chosen, local: true, key: async () => null, fetch: deps.fetch });
  const start = deps.now();
  let text = "";
  let outputTokens = 0;
  let first: number | null = null;
  try {
    for await (const ev of provider.chat([{ role: "user", content: DOCTOR_PROMPT }], [], { maxTokens: DOCTOR_MAX_TOKENS })) {
      if (ev.type === "text") {
        first ??= deps.now();
        text += ev.text;
      }
      if (ev.type === "done") outputTokens = ev.usage.output;
    }
    const end = deps.now();
    const gen = first === null ? 0 : (end - first) / 1000;
    report.completion = {
      ok: true,
      model: chosen,
      seconds: (end - start) / 1000,
      firstTokenSeconds: first === null ? null : (first - start) / 1000,
      outputTokens,
      tokensPerSecond: gen > 0 && outputTokens > 1 ? (outputTokens - 1) / gen : end > start && outputTokens ? (outputTokens * 1000) / (end - start) : null,
      text: text.trim().slice(0, 80),
      crashed: false,
    };
  } catch (e) {
    const error = (e as Error).message;
    report.completion = { ok: false, model: chosen, seconds: (deps.now() - start) / 1000, firstTokenSeconds: null, outputTokens: 0, tokensPerSecond: null, text: "", error, crashed: RUNNER_CRASH.test(error) };
  }
  if (found.preset === "ollama") {
    try {
      report.placement = placementOf((await (await deps.fetch(`${root}/api/ps`)).json()) as Parameters<typeof placementOf>[0], chosen);
    } catch {
      report.placement = null;
    }
  }
  return report;
}

const GIB = 1024 ** 3;

export function doctorLines(r: DoctorReport): string[] {
  const lines: string[] = [];
  lines.push(r.gpus.length ? `gpu: ${r.gpus.map((g) => g.name).join("; ")}` : "gpu: none found");
  lines.push(`rocm: ${r.rocm ? "rocminfo installed" : "not installed"}`);
  if (!r.server) {
    lines.push("server: no OpenAI-compatible server on 127.0.0.1:11434, :8080 or :8000");
    lines.push(`recommended local model: ${RECOMMENDED_LOCAL_MODEL}, run ollama pull ${RECOMMENDED_LOCAL_MODEL}`);
    return lines;
  }
  lines.push(`server: ${r.server.baseUrl} (${r.runner ?? r.server.preset}), ${r.server.models.length} models`);
  lines.push(`recommended local model: ${RECOMMENDED_LOCAL_MODEL}${r.server.models.includes(RECOMMENDED_LOCAL_MODEL) ? ", installed" : `, not installed; run ollama pull ${RECOMMENDED_LOCAL_MODEL}`}`);
  const c = r.completion;
  if (!c) lines.push("completion: no chat model to test");
  else if (c.ok)
    lines.push(`completion: ${c.model} ${c.text ? `answered "${c.text}"` : `gave no answer text within ${DOCTOR_MAX_TOKENS} tokens, likely still reasoning,`} in ${c.seconds.toFixed(1)} s${c.firstTokenSeconds !== null ? `, first token at ${c.firstTokenSeconds.toFixed(1)} s` : ""}, ${c.outputTokens} tokens${c.tokensPerSecond ? `, ${c.tokensPerSecond.toFixed(1)} tokens/s` : ""}`);
  else lines.push(`completion: ${c.model} failed${c.crashed ? " (runner crashed, see bead bkt-s9ey)" : ""}: ${c.error}`);
  const p = r.placement;
  if (p) {
    const where = p.processor === "gpu" ? "GPU" : p.processor === "cpu" ? "CPU" : "split GPU and CPU";
    lines.push(`inference: ${where}, ${(p.vramBytes / GIB).toFixed(1)} of ${(p.totalBytes / GIB).toFixed(1)} GiB in VRAM`);
  } else if (r.server.preset === "ollama") lines.push("inference: unknown, the model was not listed as loaded");
  else lines.push("inference: unknown for this server");
  return lines;
}
