import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProviderKind } from "./types";

export const LLM_FILE = "llm.json";

export interface ProviderEntry {
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  local: boolean;
  keyed: boolean;
}

export interface Preset {
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  local: boolean;
  keyed: boolean;
}

export const PRESETS: Record<string, Preset> = {
  anthropic: { kind: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5", local: false, keyed: true },
  openai: { kind: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini", local: false, keyed: true },
  openrouter: { kind: "openai", baseUrl: "https://openrouter.ai/api/v1", model: "anthropic/claude-sonnet-4.5", local: false, keyed: true },
  gemini: { kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash", local: false, keyed: true },
  ollama: { kind: "openai", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen3:4b", local: true, keyed: false },
  llamacpp: { kind: "openai", baseUrl: "http://127.0.0.1:8080/v1", model: "default", local: true, keyed: false },
  vllm: { kind: "openai", baseUrl: "http://127.0.0.1:8000/v1", model: "default", local: true, keyed: false },
  lmstudio: { kind: "openai", baseUrl: "http://127.0.0.1:1234/v1", model: "default", local: true, keyed: false },
};

export const NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function keyAccount(name: string): string {
  if (!NAME.test(name)) throw new Error(`provider names use a-z, 0-9, _ and -, up to 32 characters: ${name}`);
  return `llm:${name}`;
}

export function isLoopback(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]" || h === "::1";
  } catch {
    return false;
  }
}

export function llmFile(home: string): string {
  return join(home, LLM_FILE);
}

export function readProviders(home: string): ProviderEntry[] {
  const f = llmFile(home);
  if (!existsSync(f)) return [];
  const raw = JSON.parse(readFileSync(f, "utf8")) as { v: number; providers: ProviderEntry[] };
  if (raw.v !== 1 || !Array.isArray(raw.providers)) throw new Error(`${f} is not a v1 provider list`);
  return raw.providers;
}

export function writeProviders(home: string, providers: ProviderEntry[]): void {
  const f = llmFile(home);
  mkdirSync(dirname(f), { recursive: true, mode: 0o700 });
  const tmp = `${f}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ v: 1, providers }, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, f);
}

export function upsert(list: ProviderEntry[], entry: ProviderEntry): ProviderEntry[] {
  return [...list.filter((p) => p.name !== entry.name), entry].sort((a, b) => a.name.localeCompare(b.name));
}
