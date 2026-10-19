import { useEffect, useRef, useState } from "react";
import type { AgentsBodyV2, Api, ChatProvider } from "../api";
import { launchAgent, shellInvoke, type Invoke } from "../launch";
import { elapsed, POLL_MS } from "./Agents";

export type AgentsScreenApi = Pick<Api, "agentsV2" | "agentTools" | "agentFolders" | "agentProviders" | "chat" | "cancelChat">;

const TOOL_LABEL: Record<string, string> = { claude: "Claude Code", codex: "Codex", gemini: "Gemini CLI", opencode: "OpenCode", aider: "Aider" };
const STATE_LABEL: Record<string, string> = { running: "running", waiting: "waiting on you", done: "done", cancelled: "cancelled", error: "error" };

interface Line {
  role: "user" | "assistant";
  content: string;
}

export function AgentsScreen({ api, invoke = shellInvoke(), now = Date.now }: { api: AgentsScreenApi; invoke?: Invoke | null; now?: () => number }) {
  const [body, setBody] = useState<AgentsBodyV2 | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [launchNote, setLaunchNote] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      api.agentsV2().then(
        (b) => live && (setBody(b), setTrouble(null)),
        (e: Error) => live && setTrouble(e.message),
      );
    load();
    const t = setInterval(load, POLL_MS);
    api.agentTools().then((t) => live && setTools(t), (e: Error) => live && setTrouble(e.message));
    api.agentFolders().then(
      (f) => live && (setFolders(f), setFolder(f[0] ?? "")),
      (e: Error) => live && setTrouble(e.message),
    );
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [api]);

  const launch = async (tool: string) => {
    if (!invoke || !folder) return;
    try {
      await launchAgent(invoke, tool, folder);
      setLaunchNote(`Opened ${TOOL_LABEL[tool] ?? tool} in ${folder}.`);
    } catch (e) {
      setLaunchNote(`Bucket could not open ${TOOL_LABEL[tool] ?? tool}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <main className="agents-screen">
      <h1>Agents</h1>
      {trouble && <p className="status small">{trouble}</p>}
      <section aria-label="Coding agents">
        <h2>Coding agents</h2>
        {body && body.sessions.length === 0 && <p className="muted small">No coding agent is running.</p>}
        <ul className="agents-list">
          {body?.sessions.map((r) => (
            <li key={`${r.tool}:${r.session}`} className={`agent agent-${r.state}`}>
              <span className="agent-project">{r.project || r.session.slice(0, 8)}</span>
              <span className="muted small">{TOOL_LABEL[r.tool] ?? r.tool}</span>
              <b className="pill">{STATE_LABEL[r.state]}</b>
              <span className="muted small">{elapsed(r.since, now())}</span>
            </li>
          ))}
        </ul>
        {invoke && tools.length > 0 && (
          <div className="agents-launch">
            {folders.length === 0 ? (
              <p className="muted small">Approve a folder from the Bucket menu, Agents, Approve a folder, to launch an agent there.</p>
            ) : (
              <>
                <label>
                  Folder{" "}
                  <select value={folder} onChange={(e) => setFolder(e.target.value)}>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>{" "}
                {tools.map((t) => (
                  <button key={t} onClick={() => void launch(t)}>
                    Open {TOOL_LABEL[t] ?? t}
                  </button>
                ))}
              </>
            )}
            {launchNote && <p className="status small">{launchNote}</p>}
          </div>
        )}
      </section>
      <BucketChat api={api} folders={folders} />
      <section aria-label="Bucket agent chats">
        <h2>Past chats</h2>
        {body && body.chats.length === 0 && <p className="muted small">No chats yet.</p>}
        <ul className="agents-list">
          {body?.chats.map((c) => (
            <li key={c.id} className={`agent agent-${c.state}`}>
              <span className="agent-project">{c.provider}</span>
              <span className="muted small">{c.model}</span>
              <b className="pill">{STATE_LABEL[c.state]}</b>
              <span className="muted small">{elapsed(c.started, now())}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function BucketChat({ api, folders }: { api: Pick<Api, "agentProviders" | "chat" | "cancelChat">; folders: string[] }) {
  const [providers, setProviders] = useState<ChatProvider[] | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [folder, setFolder] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const chatId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    api.agentProviders().then(
      (p) => {
        if (!live) return;
        setProviders(p);
        if (p[0]) {
          setProvider(p[0].name);
          setModel(p[0].model);
        }
      },
      (e: Error) => live && (setProviders([]), setStatus(e.message)),
    );
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, [api]);

  const pickProvider = (name: string) => {
    setProvider(name);
    setModel(providers?.find((p) => p.name === name)?.model ?? "");
    setLines([]);
    chatId.current = undefined;
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy || !provider) return;
    const messages: Line[] = [...lines, { role: "user", content: text }];
    setDraft("");
    setLines([...messages, { role: "assistant", content: "" }]);
    setBusy(true);
    setStatus(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let answer = "";
    try {
      for await (const ev of api.chat({ id: chatId.current, provider, model, ...(folder ? { folder } : {}), messages }, ctrl.signal)) {
        if (ev.type === "start") chatId.current = ev.id;
        if (ev.type === "text") {
          answer += ev.text;
          setLines([...messages, { role: "assistant", content: answer }]);
        }
        if (ev.type === "error") setStatus(ev.message);
        if (ev.type === "cancelled") setStatus("Stopped.");
      }
    } catch (e) {
      setStatus(ctrl.signal.aborted ? "Stopped." : e instanceof Error ? e.message : String(e));
    }
    abort.current = null;
    setBusy(false);
  };

  const stop = async () => {
    const id = chatId.current;
    if (id) await api.cancelChat(id).catch(() => undefined);
    abort.current?.abort();
  };

  const entry = providers?.find((p) => p.name === provider);
  return (
    <section className="bucket-chat" aria-label="Bucket agent">
      <h2>Bucket agent</h2>
      {providers && providers.length === 0 && <p className="muted small">Add a model with bkt llm add, or run bkt llm local to find one on this computer.</p>}
      {providers && providers.length > 0 && (
        <>
          <div className="chat-pick">
            <label>
              Provider{" "}
              <select aria-label="Provider" value={provider} disabled={busy} onChange={(e) => pickProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>{" "}
            <label>
              Model <input aria-label="Model" value={model} disabled={busy} onChange={(e) => setModel(e.target.value)} />
            </label>
            {folders.length > 0 && (
              <label>
                {" "}
                Folder{" "}
                <select aria-label="Chat folder" value={folder} disabled={busy} onChange={(e) => setFolder(e.target.value)}>
                  <option value="">none</option>
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="muted small">{entry?.local ? "Runs on this computer. Nothing leaves it." : "Hosted model. Your messages go to this provider on your own key."}</p>
          <ol className="chat-log">
            {lines.map((l, i) => (
              <li key={i} className={`chat-${l.role}`}>
                {l.content}
              </li>
            ))}
          </ol>
          {status && <p className="status small">{status}</p>}
          <textarea aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} rows={3} />
          {busy ? <button onClick={() => void stop()}>Stop</button> : <button onClick={() => void send()}>Send</button>}
        </>
      )}
    </section>
  );
}
