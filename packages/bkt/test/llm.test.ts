import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, closeSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entryFor, llmCommand, type LlmDeps } from "../src/cli/llm";
import { MemoryKeyring } from "../src/keyring";
import { AnthropicProvider, anthropicMessages } from "../src/llm/anthropic";
import { keyAccount, PRESETS, readProviders } from "../src/llm/config";
import { doctorLines, parseLspci, placementOf, runDoctor, type DoctorDeps } from "../src/llm/doctor";
import { providerFor } from "../src/llm/index";
import { probeLocal } from "../src/llm/local";
import { OpenAiProvider, openAiMessages } from "../src/llm/openai";
import { redact } from "../src/llm/redact";
import type { Fetch, Message, StreamEvent } from "../src/llm/types";

const FIX = join(import.meta.dir, "fixtures/llm");
const KEY = "sk-ant-api03-Zq7XkP2mW9vR4tY8uN1bC6dF3gH5jL0aS2eQ";
const OKEY = "sk-proj-9fK2mQ7xW4vB8nR1tY6uP3sD5gH0jL";
const TOOLS = [{ name: "canon_search", description: "search the canon", schema: { type: "object", properties: { query: { type: "string" } } } }];

interface Seen {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function recorded(file: string, seen: Seen[] = [], status = 200): Fetch {
  return async (input, init) => {
    const req = new Request(input, init);
    seen.push({ url: req.url, headers: Object.fromEntries(req.headers.entries()), body: await req.text() });
    return new Response(status === 200 ? readFileSync(join(FIX, file)) : file, { status, headers: { "content-type": status === 200 ? "text/event-stream" : "application/json" } });
  };
}

async function collect(it: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const ev of it) out.push(ev);
  return out;
}

const text = (evs: StreamEvent[]) => evs.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-llm-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("openai-compatible provider", () => {
  test("streams text and usage from a recorded Ollama reply", async () => {
    const seen: Seen[] = [];
    const p = new OpenAiProvider({ name: "ollama", baseUrl: "http://127.0.0.1:11434/v1/", model: "llama3.2:3b", local: true, key: async () => null, fetch: recorded("openai-text.sse", seen) });
    const evs = await collect(p.chat([{ role: "user", content: "hi" }], []));
    expect(text(evs)).toBe("ready");
    expect(evs.at(-1)).toEqual({ type: "done", stop: "stop", usage: { input: 32, output: 2 } });
    expect(seen[0].url).toBe("http://127.0.0.1:11434/v1/chat/completions");
    expect(seen[0].headers.authorization).toBeUndefined();
    expect(JSON.parse(seen[0].body).stream).toBe(true);
  });

  test("returns a tool call from a recorded Ollama reply", async () => {
    const p = new OpenAiProvider({ name: "ollama", baseUrl: "http://127.0.0.1:11434/v1", model: "llama3.2:3b", local: true, key: async () => null, fetch: recorded("openai-tools.sse") });
    const evs = await collect(p.chat([{ role: "user", content: "x" }], TOOLS));
    const call = evs.find((e) => e.type === "tool_call");
    expect(call).toEqual({ type: "tool_call", call: { id: "call_75snte7f", name: "canon_search", input: { search: "entropy", query: { type: "string" } } } });
    expect(evs.at(-1)).toMatchObject({ type: "done", stop: "tool_calls", usage: { input: 146, output: 28 } });
  });

  test("joins tool arguments split over chunks and keeps call order", async () => {
    const seen: Seen[] = [];
    const p = new OpenAiProvider({ name: "openai", baseUrl: "https://api.openai.com/v1", model: "m", local: false, key: async () => OKEY, fetch: recorded("openai-split-tools.sse", seen) });
    const evs = await collect(p.chat([{ role: "user", content: "x" }], TOOLS, { system: "be brief", maxTokens: 50 }));
    expect(text(evs)).toBe("Looking it up.");
    expect(evs.filter((e) => e.type === "tool_call")).toEqual([
      { type: "tool_call", call: { id: "call_a", name: "canon_search", input: { query: "entropy" } } },
      { type: "tool_call", call: { id: "call_b", name: "cite", input: { id: "c-7" } } },
    ]);
    const body = JSON.parse(seen[0].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "be brief" });
    expect(body.max_tokens).toBe(50);
    expect(body.tools[0].function.name).toBe("canon_search");
  });

  test("maps tool results and assistant tool calls to the wire format", () => {
    const msgs: Message[] = [
      { role: "user", content: "q" },
      { role: "assistant", content: "", toolCalls: [{ id: "c1", name: "cite", input: { id: 1 } }] },
      { role: "tool", content: "result", toolCallId: "c1" },
    ];
    expect(openAiMessages(msgs)).toEqual([
      { role: "user", content: "q" },
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "cite", arguments: '{"id":1}' } }] },
      { role: "tool", tool_call_id: "c1", content: "result" },
    ]);
  });

  test("stops without error when cancelled", async () => {
    const ac = new AbortController();
    const p = new OpenAiProvider({ name: "o", baseUrl: "http://127.0.0.1:1/v1", model: "m", local: true, key: async () => null, fetch: recorded("openai-split-tools.sse") });
    const evs: StreamEvent[] = [];
    for await (const ev of p.chat([{ role: "user", content: "x" }], [], { signal: ac.signal })) {
      evs.push(ev);
      ac.abort();
    }
    expect(evs).toHaveLength(1);
  });
});

describe("anthropic provider", () => {
  test("streams text and a tool call from recorded events through the sdk", async () => {
    const seen: Seen[] = [];
    const p = new AnthropicProvider({ name: "anthropic", model: "claude-sonnet-4-5", key: async () => KEY, fetch: recorded("anthropic-tools.sse", seen) });
    const evs = await collect(p.chat([{ role: "user", content: "entropy?" }], TOOLS, { system: "cite" }));
    expect(text(evs)).toBe("Let me check the canon.");
    expect(evs.find((e) => e.type === "tool_call")).toEqual({ type: "tool_call", call: { id: "toolu_01", name: "canon_search", input: { query: "entropy" } } });
    expect(evs.at(-1)).toEqual({ type: "done", stop: "tool_use", usage: { input: 412, output: 58 } });
    const body = JSON.parse(seen[0].body);
    expect(body.system).toBe("cite");
    expect(body.tools[0].input_schema.properties.query.type).toBe("string");
    expect(seen[0].headers["x-api-key"]).toBe(KEY);
  });

  test("stops without error when cancelled", async () => {
    const ac = new AbortController();
    const p = new AnthropicProvider({ name: "anthropic", model: "m", key: async () => KEY, fetch: recorded("anthropic-tools.sse") });
    const evs: StreamEvent[] = [];
    for await (const ev of p.chat([{ role: "user", content: "x" }], [], { signal: ac.signal })) {
      evs.push(ev);
      ac.abort();
    }
    expect(evs).toEqual([{ type: "text", text: "Let me check" }]);
  });

  test("streams plain text", async () => {
    const p = new AnthropicProvider({ name: "anthropic", model: "m", key: async () => KEY, fetch: recorded("anthropic-text.sse") });
    const evs = await collect(p.chat([{ role: "user", content: "hi" }], []));
    expect(text(evs)).toBe("Ready.");
    expect(evs.at(-1)).toMatchObject({ stop: "end_turn" });
  });

  test("groups tool use and tool results into alternating turns", () => {
    expect(
      anthropicMessages([
        { role: "user", content: "q" },
        { role: "assistant", content: "looking", toolCalls: [{ id: "t1", name: "cite", input: {} }] },
        { role: "tool", content: "r1", toolCallId: "t1" },
      ]),
    ).toEqual([
      { role: "user", content: [{ type: "text", text: "q" }] },
      { role: "assistant", content: [{ type: "text", text: "looking" }, { type: "tool_use", id: "t1", name: "cite", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "r1" }] },
    ]);
  });

  test("refuses to call without a key", async () => {
    const p = new AnthropicProvider({ name: "anthropic", model: "m", key: async () => null, fetch: recorded("anthropic-text.sse") });
    await expect(collect(p.chat([{ role: "user", content: "hi" }], []))).rejects.toThrow("bkt llm add anthropic");
  });
});

describe("keys stay in headers", () => {
  const echo = (key: string) =>
    JSON.stringify({ error: { type: "authentication_error", message: `invalid x-api-key ${key}`, detail: `Authorization: Bearer ${key}` } });

  test("anthropic sends the key only in a header and redacts an echoed key from errors", async () => {
    const seen: Seen[] = [];
    const p = providerFor({ name: "anthropic", ...PRESETS.anthropic }, keyed(KEY, "anthropic"), recorded(echo(KEY), seen, 401));
    const err = (await collect(p.chat([{ role: "user", content: "hi" }], [])).catch((e) => e)) as Error;
    expect(err.message).toContain("401");
    expect(err.message).not.toContain(KEY);
    expect(err.message).not.toContain(KEY.slice(10, 40));
    expect(seen[0].url).not.toContain(KEY);
    expect(seen[0].body).not.toContain(KEY);
    expect(Object.entries(seen[0].headers).filter(([, v]) => v.includes(KEY)).map(([k]) => k)).toEqual(["x-api-key"]);
  });

  test("openai-compatible sends a bearer header and redacts an echoed key from errors", async () => {
    const seen: Seen[] = [];
    const p = providerFor({ name: "openai", ...PRESETS.openai }, keyed(OKEY, "openai"), recorded(echo(OKEY), seen, 401));
    const err = (await collect(p.chat([{ role: "user", content: "hi" }], [])).catch((e) => e)) as Error;
    expect(err.message).toContain("openai answered 401");
    expect(err.message).not.toContain(OKEY);
    expect(seen[0].body).not.toContain(OKEY);
    expect(Object.entries(seen[0].headers).filter(([, v]) => v.includes(OKEY)).map(([k]) => k)).toEqual(["authorization"]);
  });

  test("redact drops secret-shaped lines and lines that repeat the key", () => {
    const out = redact(["model not found", `token=${"a1".repeat(12)}`, `your key ${OKEY.slice(0, 30)} is wrong`].join("\n"), [OKEY]);
    expect(out).toContain("model not found");
    expect(out).not.toContain(OKEY.slice(0, 30));
    expect(out).not.toContain("a1a1a1");
    expect(out).toMatch(/hidden/);
  });
});

function keyed(key: string, name: string): MemoryKeyring {
  const kr = new MemoryKeyring();
  void kr.set(keyAccount(name), key);
  return kr;
}

function filesUnder(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name));
}

function deps(over: Partial<LlmDeps> = {}): LlmDeps & { lines: string[]; kr: MemoryKeyring } {
  const lines: string[] = [];
  const kr = new MemoryKeyring();
  return {
    home: dir,
    keyring: async () => kr,
    readKey: async () => KEY,
    fetch: async () => new Response("", { status: 404 }),
    doctor: { fetch: async () => new Response("", { status: 404 }), exec: async () => ({ code: 1, stdout: "", stderr: "" }), now: () => 0, which: () => null },
    out: (l) => lines.push(l),
    lines,
    kr,
    ...over,
  };
}

describe("bkt llm", () => {
  test("add stores the key in the keyring and nowhere on disk or in output", async () => {
    const d = deps();
    expect(await llmCommand("add", { positionals: ["anthropic"], values: {} }, d)).toBe(0);
    expect(await d.kr.get("llm:anthropic")).toBe(KEY);
    expect(readProviders(dir)).toEqual([{ name: "anthropic", ...PRESETS.anthropic }]);
    for (const f of filesUnder(dir)) expect(readFileSync(f, "utf8")).not.toContain(KEY);
    expect(statSync(join(dir, "llm.json")).mode & 0o077).toBe(0);
    expect(d.lines.join("\n")).not.toContain(KEY);
    expect(await llmCommand("list", { positionals: [], values: {} }, d)).toBe(0);
    expect(d.lines.at(-1)).toContain("key stored");
  });

  test("add again rotates the key; remove deletes key and entry", async () => {
    const d = deps();
    await llmCommand("add", { positionals: ["anthropic"], values: {} }, d);
    await llmCommand("add", { positionals: ["anthropic"], values: { model: "claude-opus-4-1" } }, { ...d, readKey: async () => "sk-ant-rotated-key-0001" });
    expect(await d.kr.get("llm:anthropic")).toBe("sk-ant-rotated-key-0001");
    expect(readProviders(dir)[0].model).toBe("claude-opus-4-1");
    expect(await llmCommand("remove", { positionals: ["anthropic"], values: {} }, d)).toBe(0);
    expect(await d.kr.get("llm:anthropic")).toBeNull();
    expect(readProviders(dir)).toEqual([]);
    expect(await llmCommand("remove", { positionals: ["anthropic"], values: {} }, d)).toBe(3);
  });

  test("a local server needs no key and an empty key changes nothing", async () => {
    const d = deps({ readKey: async () => "  " });
    expect(await llmCommand("add", { positionals: ["ollama"], values: { model: "llama3.2:3b" } }, d)).toBe(0);
    expect(readProviders(dir)[0]).toMatchObject({ local: true, keyed: false, model: "llama3.2:3b" });
    await expect(llmCommand("add", { positionals: ["openai"], values: {} }, d)).rejects.toThrow("no key given");
    expect(readProviders(dir).map((p) => p.name)).toEqual(["ollama"]);
  });

  test("entryFor refuses a key over plain http and unknown names without a base url", () => {
    expect(() => entryFor("corp", { "base-url": "http://llm.example.com/v1", model: "m" })).toThrow("refusing to send a key");
    expect(entryFor("corp", { "base-url": "http://llm.example.com/v1", model: "m", "no-key": true }).keyed).toBe(false);
    expect(entryFor("box", { "base-url": "http://127.0.0.1:9000/v1/", model: "m" })).toMatchObject({ local: true, keyed: false, baseUrl: "http://127.0.0.1:9000/v1" });
    expect(() => entryFor("mystery", {})).toThrow("--base-url");
    expect(() => entryFor("Bad Name", {})).toThrow("provider names");
  });

  test("local reports a server found by the probe", async () => {
    const d = deps({ fetch: fakeServers({ 8080: ["phi-4"] }) });
    expect(await llmCommand("local", { positionals: [], values: {} }, d)).toBe(0);
    expect(d.lines[0]).toBe("http://127.0.0.1:8080/v1\tllamacpp\t1 models: phi-4");
    const none = deps();
    expect(await llmCommand("local", { positionals: [], values: {} }, none)).toBe(3);
  });
});

function fakeServers(ports: Record<number, string[]>): Fetch {
  return async (input) => {
    const u = new URL(String(input instanceof Request ? input.url : input));
    const models = ports[Number(u.port)];
    if (!models) throw new TypeError("connection refused");
    if (u.pathname === "/v1/models") return Response.json({ object: "list", data: models.map((id) => ({ id, object: "model" })) });
    return new Response("not found", { status: 404 });
  };
}

describe("local probe", () => {
  test("finds every OpenAI-compatible server and ignores other answers", async () => {
    const f: Fetch = async (input) => {
      const port = Number(new URL(String(input)).port);
      if (port === 11434) return Response.json({ data: [{ id: "qwen3:4b" }, { id: "nomic-embed-text" }] });
      if (port === 8000) return Response.json({ hello: "not openai" });
      throw new TypeError("refused");
    };
    const found = await probeLocal(f);
    expect(found).toEqual([{ baseUrl: "http://127.0.0.1:11434/v1", port: 11434, models: ["qwen3:4b", "nomic-embed-text"], preset: "ollama" }]);
  });
});

describe("doctor", () => {
  const LSPCI = [
    "03:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Navi 33 [Radeon RX 7600/7600 XT/7600M XT/7600S/7700S / PRO W7600] (rev c1)",
    "04:00.0 Ethernet controller: Realtek RTL8125",
  ].join("\n");

  function ollama(chat: () => Response, ps: unknown): DoctorDeps {
    let t = 0;
    return {
      exec: async () => ({ code: 0, stdout: LSPCI, stderr: "" }),
      which: (b) => (b === "lspci" || b === "rocminfo" ? `/usr/bin/${b}` : null),
      now: () => (t += 500),
      fetch: async (input) => {
        const u = new URL(String(input instanceof Request ? input.url : input));
        if (u.port !== "11434") throw new TypeError("refused");
        if (u.pathname === "/v1/models") return Response.json({ data: [{ id: "nomic-embed-text" }, { id: "llama3.2:3b" }] });
        if (u.pathname === "/api/version") return Response.json({ version: "0.18.2" });
        if (u.pathname === "/api/ps") return Response.json(ps);
        return chat();
      },
    };
  }

  test("reports gpu, runner, one completion and GPU placement", async () => {
    const r = await runDoctor(ollama(() => new Response(readFileSync(join(FIX, "openai-text.sse"))), { models: [{ name: "llama3.2:3b", size: 3_400_000_000, size_vram: 3_400_000_000 }] }));
    expect(r.gpus).toEqual([{ vendor: "amd", name: "Advanced Micro Devices, Inc. [AMD/ATI] Navi 33 [Radeon RX 7600/7600 XT/7600M XT/7600S/7700S / PRO W7600]" }]);
    expect(r.runner).toBe("ollama 0.18.2");
    expect(r.completion).toMatchObject({ ok: true, model: "llama3.2:3b", text: "ready", outputTokens: 2, crashed: false });
    expect(r.placement?.processor).toBe("gpu");
    const lines = doctorLines(r);
    expect(lines).toContain("inference: GPU, 3.2 of 3.2 GiB in VRAM");
    expect(lines.find((l) => l.startsWith("completion:"))).toContain('answered "ready"');
  });

  test("flags a runner crash and CPU placement", async () => {
    const crash = () => Response.json({ error: { message: "llama runner process has terminated: signal: aborted (core dumped)" } }, { status: 500 });
    const r = await runDoctor(ollama(crash, { models: [{ name: "llama3.2:3b", size: 100, size_vram: 0 }] }));
    expect(r.completion).toMatchObject({ ok: false, crashed: true });
    expect(doctorLines(r).join("\n")).toContain("runner crashed, see bead bkt-s9ey");
    expect(r.placement?.processor).toBe("cpu");
  });

  test("reports no server", async () => {
    const r = await runDoctor({ exec: async () => ({ code: 0, stdout: "", stderr: "" }), which: () => null, now: () => 0, fetch: async () => Promise.reject(new TypeError("refused")) });
    expect(doctorLines(r)).toEqual(["gpu: none found", "rocm: not installed", "server: no OpenAI-compatible server on 127.0.0.1:11434, :8080 or :8000", "recommended local model: qwen3:8b, run ollama pull qwen3:8b"]);
  });

  test("parses lspci and splits placement", () => {
    expect(parseLspci(LSPCI)).toHaveLength(1);
    expect(placementOf({ models: [{ name: "m", size: 10, size_vram: 4 }] }, "m")?.processor).toBe("split");
    expect(placementOf({ models: [] }, "m")).toBeNull();
  });
});

describe("cli process", () => {
  const CLI = join(import.meta.dir, "../src/cli.tsx");
  const linux = process.platform === "linux";

  test.skipIf(!linux)("bkt llm add reads the key from a descriptor and never puts it on any argv or file", async () => {
    const bin = join(dir, "bin");
    const store = join(dir, "store");
    const argvLog = join(dir, "argv.log");
    mkdirSync(bin);
    mkdirSync(store);
    writeFileSync(
      join(bin, "secret-tool"),
      [
        "#!/bin/bash",
        `printf '%s\\n' "$*" >> "${argvLog}"`,
        `f="${store}/\${@: -1}"`,
        `case "$1" in`,
        `  store) IFS= read -r -d '' v; printf %s "$v" > "$f"; exit 0;;`,
        `  lookup) [ -f "$f" ] && cat "$f" && exit 0; exit 1;;`,
        `  search) exit 0;;`,
        `  clear) rm -f "$f"; exit 0;;`,
        `esac`,
        "exit 2",
      ].join("\n"),
    );
    chmodSync(join(bin, "secret-tool"), 0o755);
    const keyFile = join(dir, "key.txt");
    writeFileSync(keyFile, `${KEY}\n`);
    const fd = openSync(keyFile, "r");
    const home = join(dir, "data");
    const p = Bun.spawn([process.execPath, CLI, "llm", "add", "anthropic", "--key-fd", "3"], {
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: join(dir, "user"), BKT_HOME: home, DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus" },
      stdio: ["ignore", "pipe", "pipe", fd],
    });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    closeSync(fd);
    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain("key stored in the keyring");
    expect(readFileSync(join(store, "llm:anthropic"), "utf8")).toBe(KEY);
    expect(readFileSync(argvLog, "utf8")).not.toContain(KEY);
    expect(`${out}${err}`).not.toContain(KEY);
    for (const f of filesUnder(home)) expect(readFileSync(f, "utf8")).not.toContain(KEY);
    const rm = Bun.spawn([process.execPath, CLI, "llm", "remove", "anthropic"], {
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: join(dir, "user"), BKT_HOME: home, DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent/bkt-test-bus" },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await rm.exited).toBe(0);
    expect(readdirSync(store)).toEqual([]);
  });
});
