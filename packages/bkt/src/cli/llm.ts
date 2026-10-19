import type { Keyring } from "../keyring";
import { isLoopback, keyAccount, PRESETS, readProviders, upsert, writeProviders, type ProviderEntry } from "../llm/config";
import { doctorLines, runDoctor, type DoctorDeps } from "../llm/doctor";
import { probeLocal } from "../llm/local";
import type { Fetch } from "../llm/types";
import { EXIT } from "./table";

export interface LlmDeps {
  home: string;
  keyring: () => Promise<Keyring>;
  readKey: (label: string) => Promise<string>;
  fetch: Fetch;
  doctor: DoctorDeps;
  out: (line: string) => void;
}

export interface LlmArgs {
  positionals: string[];
  values: Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function entryFor(name: string, values: Record<string, unknown>): ProviderEntry {
  keyAccount(name);
  const preset = PRESETS[name];
  const baseUrl = str(values["base-url"]) ?? preset?.baseUrl;
  if (!baseUrl) throw new Error(`${name} is not a known provider; give --base-url for an OpenAI-compatible server. Known: ${Object.keys(PRESETS).join(", ")}`);
  const url = new URL(baseUrl);
  const local = isLoopback(baseUrl);
  const keyed = values["no-key"] === true ? false : preset ? preset.keyed : !local;
  if (keyed && url.protocol !== "https:" && !local) throw new Error(`refusing to send a key over ${url.protocol} to ${url.host}; use https`);
  const model = str(values.model) ?? preset?.model;
  if (!model) throw new Error(`give --model for ${name}`);
  return { name, kind: preset?.kind ?? "openai", baseUrl: baseUrl.replace(/\/+$/, ""), model, local, keyed };
}

export async function llmCommand(sub: string, args: LlmArgs, deps: LlmDeps): Promise<number> {
  const { out } = deps;
  if (sub === "add") {
    const entry = entryFor(args.positionals[0], args.values);
    if (entry.keyed) {
      const key = (await deps.readKey(`API key for ${entry.name}: `)).trim();
      if (!key) throw new Error("no key given; nothing changed");
      await (await deps.keyring()).set(keyAccount(entry.name), key, { replace: true });
    }
    writeProviders(deps.home, upsert(readProviders(deps.home), entry));
    out(`added ${entry.name}: ${entry.model} at ${entry.baseUrl}${entry.keyed ? ", key stored in the keyring" : ""}`);
    return EXIT.ok;
  }
  if (sub === "remove") {
    const name = args.positionals[0];
    const list = readProviders(deps.home);
    const entry = list.find((p) => p.name === name);
    const dropped = await (await deps.keyring()).delete(keyAccount(name));
    if (entry) writeProviders(deps.home, list.filter((p) => p.name !== name));
    if (!entry && !dropped) {
      out(`no provider named ${name}`);
      return EXIT.noData;
    }
    out(`removed ${name}${dropped ? " and its key" : ""}`);
    return EXIT.ok;
  }
  if (sub === "list") {
    const list = readProviders(deps.home);
    if (!list.length) {
      out("no providers yet; run bkt llm add <name> or bkt llm local");
      return EXIT.noData;
    }
    const kr = list.some((p) => p.keyed) ? await deps.keyring() : null;
    for (const p of list) {
      const key = p.keyed ? ((await kr!.get(keyAccount(p.name))) !== null ? "key stored" : "key missing") : "no key";
      out(`${p.name}\t${p.model}\t${p.baseUrl}\t${p.local ? "local" : "hosted"}\t${key}`);
    }
    return EXIT.ok;
  }
  if (sub === "local") {
    const found = await probeLocal(deps.fetch);
    if (!found.length) {
      out("no OpenAI-compatible server answered on 127.0.0.1:11434, :8080 or :8000");
      return EXIT.noData;
    }
    for (const s of found) out(`${s.baseUrl}\t${s.preset}\t${s.models.length} models: ${s.models.join(", ")}`);
    out(`add one with bkt llm add ${found[0].preset}${found[0].preset === "openai" ? ` --base-url ${found[0].baseUrl} --model <model>` : ""}`);
    return EXIT.ok;
  }
  if (sub === "doctor") {
    const r = await runDoctor(deps.doctor, str(args.values.model));
    for (const line of doctorLines(r)) out(line);
    return r.completion?.ok ? EXIT.ok : EXIT.failure;
  }
  throw new Error(`unknown llm command ${sub}`);
}
