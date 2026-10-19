import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentRoutes, agentsBodyV2, AGENT_CLIS, approvedFolders, ChatStore, foldChats, inApproved, installedClis, parseChat, type ChatRunner, type TurnEvent } from "../src/agents";
import { writeProviders } from "../src/llm/config";
import { startServe } from "../src/serve";
import { agentsBody, waitDir } from "../src/wait";
import type { AgentsBody } from "../src/wait-fold";

const NOW_S = 1_800_000_000;

function scratch() {
  const home = mkdtempSync(join(process.env.BKT_WAIT_TMP ?? tmpdir(), "bkt-agents-"));
  const env = { HOME: home, XDG_STATE_HOME: join(home, "state"), XDG_DATA_HOME: join(home, "share") };
  const llmHome = join(home, "data");
  mkdirSync(llmHome, { recursive: true });
  writeProviders(llmHome, [{ name: "ollama", kind: "openai", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen3:4b", local: true, keyed: false }]);
  const state = waitDir(env, home);
  mkdirSync(state, { recursive: true });
  return { home, env, llmHome, state, d: { home, env, os: "linux" } };
}

let s: ReturnType<typeof scratch>;
beforeEach(() => {
  s = scratch();
});
afterEach(() => rmSync(s.home, { recursive: true, force: true }));

const words = (parts: string[]): ChatRunner =>
  async function* () {
    for (const text of parts) yield { type: "text", text };
    yield { type: "done", stop: "end", usage: { input: 3, output: parts.length } };
  };

const stalled: ChatRunner = async function* (_p, _m, signal) {
  yield { type: "text", text: "thinking" };
  await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
};

function routes(run: ChatRunner) {
  let n = 0;
  return agentRoutes({ wait: () => s.d, llmHome: s.llmHome, keyring: null, which: (b) => (b === "claude" || b === "gemini" ? `/bin/${b}` : null), run, newId: () => `chat000${++n}` }, () => NOW_S * 1000);
}

const call = (r: ReturnType<typeof routes>, key: string, body?: unknown) => {
  const [method, path] = key.split(" ");
  const req = new Request(`http://x${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return r[key](req, new URL(req.url), { cli: false });
};

async function lines(res: Response): Promise<TurnEvent[]> {
  return (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
}

const LOG = [
  `{"v":1,"ts":${NOW_S - 125},"tool":"claude","session":"aaaa1111","event":"UserPromptSubmit","project":"bucket-foundation"}`,
  `{"v":1,"ts":${NOW_S - 30},"tool":"codex","session":"bbbb2222","event":"agent-turn-complete","project":"tools"}`,
].join("\n");

describe("chat store", () => {
  test("keeps the last line per chat id and drops malformed lines", () => {
    const text = [
      JSON.stringify({ v: 1, id: "chat0001", provider: "ollama", model: "qwen3:4b", started: 10, state: "running" }),
      "not json",
      JSON.stringify({ v: 1, id: "bad id!", provider: "x", model: "y", started: 1, state: "done" }),
      JSON.stringify({ v: 1, id: "chat0002", provider: "ollama", model: "qwen3:4b", started: 20, state: "running" }),
      JSON.stringify({ v: 1, id: "chat0001", provider: "ollama", model: "qwen3:4b", started: 10, state: "done" }),
    ].join("\n");
    expect(foldChats(text).map((c) => [c.id, c.state])).toEqual([
      ["chat0002", "running"],
      ["chat0001", "done"],
    ]);
    expect(parseChat(JSON.stringify({ v: 1, id: "chat0003", provider: "a", model: "b", started: 1, state: "sleeping" }))).toBeNull();
  });

  test("lives in chats.jsonl beside the agent event log and reads empty when missing", () => {
    const store = new ChatStore(s.state);
    expect(store.list()).toEqual([]);
    store.write({ v: 1, id: "chat0001", provider: "ollama", model: "m", started: 1, state: "done" });
    expect(readFileSync(join(s.state, "chats.jsonl"), "utf8")).toBe(`${JSON.stringify({ v: 1, id: "chat0001", provider: "ollama", model: "m", started: 1, state: "done" })}\n`);
  });
});

describe("/local/agents v2", () => {
  test("adds v 2 and kind to each row and keeps every v1 field", async () => {
    writeFileSync(join(s.state, "agents.jsonl"), `${LOG}\n`);
    new ChatStore(s.state).write({ v: 1, id: "chat0001", provider: "ollama", model: "qwen3:4b", started: NOW_S - 5, state: "done" });
    const body = (await (await call(routes(words([])), "GET /local/agents")).json()) as AgentsBody & { chats: unknown[] };
    const v1 = agentsBody(s.d, NOW_S);
    expect(body.sessions).toEqual(v1.sessions.map((r) => ({ ...r, v: 2, kind: "cli" })) as never);
    expect(body.chats).toEqual([{ v: 1, id: "chat0001", provider: "ollama", model: "qwen3:4b", started: NOW_S - 5, state: "done", kind: "chat" }]);
    expect({ v: body.v, supported: body.supported, installed: body.installed }).toEqual({ v: v1.v, supported: v1.supported, installed: v1.installed });
  });

  test("a v1 reader parsing v2 output gets the same external CLI rows", () => {
    const v1 = agentsBody(s.d, NOW_S);
    writeFileSync(join(s.state, "agents.jsonl"), `${LOG}\n`);
    const before = agentsBody(s.d, NOW_S);
    const v2 = JSON.parse(JSON.stringify(agentsBodyV2(before, [{ v: 1, id: "chat0001", provider: "p", model: "m", started: 1, state: "done" }])));
    const v1Fold = (b: AgentsBody) => b.sessions.map(({ tool, session, project, state, since, subagents }) => ({ tool, session, project, state, since, subagents }));
    expect(v1Fold(v2)).toEqual(v1Fold(before));
    expect(v1Fold(v2)).toHaveLength(2);
    expect(v1.sessions).toEqual([]);
  });
});

describe("chat route", () => {
  test("streams text, records the chat as running then done, and continues the same chat", async () => {
    const r = routes(words(["Light ", "is a wave."]));
    const res = await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [{ role: "user", content: "what is light" }] });
    expect(res.headers.get("content-type")).toBe("application/x-ndjson");
    const ev = await lines(res);
    expect(ev).toEqual([
      { type: "start", id: "chat0001", started: NOW_S, provider: "ollama", model: "qwen3:4b", local: true },
      { type: "text", text: "Light " },
      { type: "text", text: "is a wave." },
      { type: "done", usage: { input: 3, output: 2 } },
    ]);
    const raw = readFileSync(join(s.state, "chats.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l).state);
    expect(raw).toEqual(["running", "done"]);
    const again = await lines(await call(r, "POST /local/agents/chat", { id: "chat0001", provider: "ollama", model: "llama3.2:3b", messages: [{ role: "user", content: "and sound" }] }));
    expect(again[0]).toMatchObject({ type: "start", id: "chat0001", started: NOW_S, model: "llama3.2:3b" });
    expect(new ChatStore(s.state).list()).toHaveLength(1);
  });

  test("cancel stops a running answer and records it as cancelled", async () => {
    const r = routes(stalled);
    const res = await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [{ role: "user", content: "long one" }] });
    const reader = res.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    expect(first).toContain('"type":"start"');
    const busy = await call(r, "POST /local/agents/chat", { id: "chat0001", provider: "ollama", messages: [{ role: "user", content: "again" }] });
    expect(busy.status).toBe(409);
    expect(await (await call(r, "POST /local/agents/chat/cancel", { id: "chat0001" })).json()).toEqual({ cancelled: true });
    let rest = "";
    for (let c = await reader.read(); !c.done; c = await reader.read()) rest += new TextDecoder().decode(c.value);
    expect(rest).toContain('{"type":"cancelled"}');
    expect(new ChatStore(s.state).list()[0].state).toBe("cancelled");
    expect(await (await call(r, "POST /local/agents/chat/cancel", { id: "chat0001" })).json()).toEqual({ cancelled: false });
  });

  test("a provider error is reported and recorded", async () => {
    const r = routes(async function* () {
      throw new Error("model not found");
    });
    const ev = await lines(await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [{ role: "user", content: "x" }] }));
    expect(ev.at(-1)).toEqual({ type: "error", message: "model not found" });
    expect(new ChatStore(s.state).list()[0].state).toBe("error");
  });

  test("rejects an unknown provider, bad messages, an unknown chat and an unapproved folder", async () => {
    const r = routes(words(["x"]));
    expect((await call(r, "POST /local/agents/chat", { provider: "nope", messages: [{ role: "user", content: "x" }] })).status).toBe(400);
    expect((await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [] })).status).toBe(400);
    expect((await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [{ role: "system", content: "x" }] })).status).toBe(400);
    expect((await call(r, "POST /local/agents/chat", { provider: "ollama", messages: [{ role: "assistant", content: "x" }] })).status).toBe(400);
    expect((await call(r, "POST /local/agents/chat", { id: "chat9999", provider: "ollama", messages: [{ role: "user", content: "x" }] })).status).toBe(404);
    expect((await call(r, "POST /local/agents/chat", { provider: "ollama", folder: s.home, messages: [{ role: "user", content: "x" }] })).status).toBe(403);
  });

  test("a chat scoped to an approved folder records its real path", async () => {
    const proj = join(s.home, "proj");
    mkdirSync(proj);
    writeFileSync(join(s.state, "agent-folders.json"), JSON.stringify({ v: 1, folders: [proj] }));
    await lines(await call(routes(words(["ok"])), "POST /local/agents/chat", { provider: "ollama", folder: proj, messages: [{ role: "user", content: "x" }] }));
    expect(new ChatStore(s.state).list()[0].folder).toBe(proj);
  });
});

describe("folder approval", () => {
  test("the sidecar exposes the approved list read-only and no route writes it", async () => {
    const r = routes(words([]));
    writeFileSync(join(s.state, "agent-folders.json"), JSON.stringify({ v: 1, folders: ["/srv/a", "relative", 3] }));
    expect(await (await call(r, "GET /local/agents/folders")).json()).toEqual({ folders: ["/srv/a"] });
    const writers = Object.keys(r).filter((k) => !k.startsWith("GET ") && k.includes("folder"));
    expect(writers).toEqual([]);
    const srv = startServe({ uid: 1, resolvePeerUid: () => 1, cliToken: "t".repeat(43), routes: r });
    try {
      const read = await fetch(`${srv.url}local/agents/folders`, { headers: { authorization: `Bucket ${"t".repeat(43)}` } });
      expect(read.status).toBe(200);
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const res = await fetch(`${srv.url}local/agents/folders`, { method, headers: { authorization: `Bucket ${"t".repeat(43)}`, "content-type": "application/json" }, body: JSON.stringify({ folders: ["/"] }) });
        expect([404, 405], method).toContain(res.status);
      }
    } finally {
      srv.stop();
    }
    expect(approvedFolders(s.state)).toEqual(["/srv/a"]);
  });

  test("a folder inside an approved root passes and a symlink escaping it is rejected", () => {
    const root = join(s.home, "approved");
    const outside = join(s.home, "outside");
    mkdirSync(join(root, "inner"), { recursive: true });
    mkdirSync(outside);
    symlinkSync(outside, join(root, "escape"));
    symlinkSync(root, join(s.home, "alias"));
    expect(inApproved(join(root, "inner"), [root])).toBe(join(root, "inner"));
    expect(inApproved(join(s.home, "alias", "inner"), [root])).toBe(join(root, "inner"));
    expect(inApproved(join(root, "escape"), [root])).toBeNull();
    expect(inApproved(join(root, "..", "outside"), [root])).toBeNull();
    expect(inApproved(`${root}-sibling`, [root])).toBeNull();
    expect(inApproved(join(root, "missing"), [root])).toBeNull();
  });

  test("a corrupt folder list is reported", () => {
    writeFileSync(join(s.state, "agent-folders.json"), JSON.stringify({ v: 9 }));
    expect(() => approvedFolders(s.state)).toThrow("not a v1 folder list");
  });
});

describe("installed CLIs", () => {
  test("lists only allowlisted tools found on PATH", async () => {
    expect(installedClis((b) => (b === "codex" || b === "rm" ? "/bin/x" : null))).toEqual(["codex"]);
    expect(AGENT_CLIS).toEqual(["claude", "codex", "gemini", "opencode", "aider"]);
    expect(await (await call(routes(words([])), "GET /local/agents/tools")).json()).toEqual({ tools: ["claude", "gemini"] });
  });

  test("providers route shows names and models and no keys or URLs", async () => {
    expect(await (await call(routes(words([])), "GET /local/agents/providers")).json()).toEqual({ providers: [{ name: "ollama", model: "qwen3:4b", local: true }] });
  });
});
