"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TabId = "chat" | "mcp" | "claudeai" | "corpus";

const TABS: { id: TabId; label: string }[] = [
  { id: "chat", label: "Learn with Claude" },
  { id: "mcp", label: "Wire your Claude Desktop" },
  { id: "claudeai", label: "Send a lesson to Claude.ai" },
  { id: "corpus", label: "Take the corpus" },
];

const SYSTEM_PREAMBLE = `You are helping someone learn from bucket.foundation — a nonprofit building reformative education infrastructure. Primary research should be free to read, paid only when cited, with fees routing to the original author forever. Teach them not just what bucket does but why the incumbent publishing system is structurally extractive. Use the provided llms-full.txt + MANIFESTO + PROTOCOL + ENVELOPE docs as ground truth. Cite the sources they can re-open. Be declarative, honest about tradeoffs, and treat the reader as capable of genius work.`;

const LESSONS = [
  "How does gated academic publishing extract from authors?",
  "What does 'free to read, paid to cite' actually change?",
  "What are the 7 canon branches and why only foundations?",
  "How does feed402 let an agent pay the original author, not a publisher?",
  "Why is bucket a nonprofit and not a startup?",
  "What is the cite-forever license?",
];

const KEY_STORAGE = "bucket:anthropic-key:v1";
const THREAD_STORAGE = "bucket:learn-thread:v1";

type Msg = { role: "user" | "assistant"; content: string };

export default function LearnTabs() {
  const [tab, setTab] = useState<TabId>("chat");

  return (
    <section className="max-w-[1200px] mx-auto px-6 pb-24">
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Learn tabs"
        className="flex flex-wrap gap-2 border-b border-[color:var(--hairline)] mb-8"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`small-caps text-[11px] tracking-[0.14em] px-5 py-3 min-h-[44px] border-b-2 -mb-px transition ${
                active
                  ? "border-[color:var(--gold-deep)] text-[color:var(--basalt)]"
                  : "border-transparent text-[color:var(--basalt-3)] hover:text-[color:var(--basalt-2)] hover:border-[color:var(--gold)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "chat" && <ChatPanel />}
      {tab === "mcp" && <McpPanel />}
      {tab === "claudeai" && <ClaudeAiPanel />}
      {tab === "corpus" && <CorpusPanel />}
    </section>
  );
}

// ─────────────────────────── TAB 1: Chat ───────────────────────────
function ChatPanel() {
  const [apiKey, setApiKey] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docsLoaded, setDocsLoaded] = useState<string | null>(null);
  const docsRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore from sessionStorage
  useEffect(() => {
    try {
      const k = sessionStorage.getItem(KEY_STORAGE);
      if (k) setApiKey(k);
      const t = sessionStorage.getItem(THREAD_STORAGE);
      if (t) setMessages(JSON.parse(t));
    } catch {
      /* noop */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      if (apiKey) sessionStorage.setItem(KEY_STORAGE, apiKey);
    } catch {
      /* noop */
    }
  }, [apiKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(THREAD_STORAGE, JSON.stringify(messages));
    } catch {
      /* noop */
    }
  }, [messages]);

  const loadDocs = useCallback(async () => {
    if (docsRef.current) return docsRef.current;
    const urls = ["/llms-full.txt"];
    const fetched = await Promise.all(
      urls.map((u) =>
        fetch(u)
          .then((r) => (r.ok ? r.text() : ""))
          .catch(() => "")
      )
    );
    const joined = fetched.join("\n\n---\n\n").slice(0, 120_000);
    docsRef.current = joined;
    setDocsLoaded(`${Math.round(joined.length / 1024)}kb loaded`);
    return joined;
  }, []);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || !apiKey || streaming) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: q };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const docs = await loadDocs();
      // Lazy import SDK
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true,
      });

      const system = `${SYSTEM_PREAMBLE}\n\n--- GROUND-TRUTH DOCS (bucket.foundation /llms-full.txt) ---\n${docs}`;

      const controller = new AbortController();
      abortRef.current = controller;

      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const stream = await client.messages.stream(
        {
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          system,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
        { signal: controller.signal }
      );

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const delta = event.delta.text;
          setMessages((m) => {
            const copy = m.slice();
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              copy[copy.length - 1] = {
                role: "assistant",
                content: last.content + delta,
              };
            }
            return copy;
          });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // If stream threw before any assistant text, remove placeholder
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          return m.slice(0, -1);
        }
        return m;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [apiKey, input, messages, streaming, loadDocs]);

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const clearThread = () => {
    setMessages([]);
    try {
      sessionStorage.removeItem(THREAD_STORAGE);
    } catch {
      /* noop */
    }
  };

  // Export row handlers
  const threadText = messages
    .map((m) => `## ${m.role}\n\n${m.content}`)
    .join("\n\n---\n\n");

  const download = () => {
    const blob = new Blob([threadText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bucket-learn-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(threadText);
    } catch {
      /* noop */
    }
  };
  const email = () => {
    const body = encodeURIComponent(
      threadText.slice(0, 1500) +
        (threadText.length > 1500 ? "\n\n[truncated — see attached]" : "")
    );
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "A lesson from bucket.foundation"
    )}&body=${body}`;
  };
  const openInClaude = () => {
    const q = encodeURIComponent(
      `Continue this bucket.foundation lesson:\n\n${threadText}`.slice(0, 6000)
    );
    window.open(`https://claude.ai/new?q=${q}`, "_blank", "noopener");
  };
  const shareLink = async () => {
    try {
      const { compressToEncodedURIComponent } = await import("lz-string");
      const enc = compressToEncodedURIComponent(threadText);
      const url = `${window.location.origin}/learn?t=${enc}`;
      await navigator.clipboard.writeText(url);
      alert("share link copied");
    } catch (e) {
      setError("share link failed: " + String(e));
    }
  };

  const hasKey = apiKey.length > 20;
  const hasThread = messages.length > 0;

  return (
    <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8">
          <div className="carved-inset rounded-sm bg-[color:var(--bone-2)]/70 p-5 md:p-6">
            <label className="block small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">
              › your anthropic api key
            </label>
            <p className="mt-2 text-[12px] leading-[1.6] text-[color:var(--basalt-2)]">
              Bring your own Anthropic key. It never touches our servers.
              Bucket is a nonprofit — we route zero economics through your
              learning. Everything you read, every question you ask, the
              models you run — yours. The only thing we gate is citation, and
              citation pays the author forever.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-3 w-full font-mono-mark text-[13px] bg-[color:var(--bone)] border border-[color:var(--hairline)] focus:border-[color:var(--gold)] outline-none rounded-sm px-3 py-3 min-h-[44px]"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="mt-2 text-[10px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
              sessionStorage only · cleared when you close the tab
            </div>
          </div>

          {/* Thread */}
          <div className="mt-6 space-y-5">
            {messages.length === 0 && (
              <div className="text-[13px] text-[color:var(--basalt-3)] italic">
                Ask anything about bucket — the protocol, the canon, why we&apos;re
                a nonprofit, what the cite-forever license changes.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="">
                <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)]">
                  {m.role === "user" ? "› you" : "› claude"}
                </div>
                <div className="mt-2 text-[14px] leading-[1.75] text-[color:var(--basalt)] whitespace-pre-wrap">
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === "assistant" && (
                    <span className="inline-block w-[6px] h-[14px] bg-[color:var(--gold-deep)] ml-1 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div className="text-[12px] font-mono-mark text-red-700 bg-red-50 border border-red-200 rounded-sm p-3">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="mt-6">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                hasKey
                  ? "ask claude about bucket… (cmd/ctrl+enter to send)"
                  : "paste your anthropic key above first"
              }
              disabled={!hasKey || streaming}
              rows={3}
              className="w-full font-mono-mark text-[13px] bg-[color:var(--bone)] border border-[color:var(--hairline)] focus:border-[color:var(--gold)] outline-none rounded-sm p-3"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {!streaming ? (
                <button
                  onClick={send}
                  disabled={!hasKey || !input.trim()}
                  className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--basalt)] disabled:opacity-40 px-5 py-3 rounded-sm min-h-[44px] hover:bg-[color:var(--aegean-deep)] transition"
                >
                  → ask
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--aegean-deep)] px-5 py-3 rounded-sm min-h-[44px]"
                >
                  ■ stop
                </button>
              )}
              {hasThread && (
                <button
                  onClick={clearThread}
                  className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt-2)] bg-[color:var(--bone)] border border-[color:var(--hairline)] px-4 py-3 rounded-sm min-h-[44px]"
                >
                  clear
                </button>
              )}
              {docsLoaded && (
                <span className="inline-flex items-center small-caps text-[10px] tracking-[0.14em] text-[color:var(--basalt-3)] px-2">
                  ground-truth · {docsLoaded}
                </span>
              )}
            </div>
          </div>

          {/* Export row */}
          {hasThread && (
            <div className="mt-6 pt-6 border-t border-[color:var(--hairline)]">
              <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)] mb-3">
                › export this lesson
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={download} className={exportBtn}>↓ download .md</button>
                <button onClick={copy} className={exportBtn}>⧉ copy</button>
                <button onClick={email} className={exportBtn}>✉ email</button>
                <button onClick={openInClaude} className={exportBtn}>→ open in Claude.ai</button>
                <button onClick={shareLink} className={exportBtn}>⌘ share link</button>
              </div>
            </div>
          )}
        </div>

        {/* sidebar — starter lessons */}
        <aside className="col-span-12 md:col-span-4">
          <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)] mb-3">
            § starter lessons
          </div>
          <ul className="space-y-2">
            {LESSONS.map((l) => (
              <li key={l}>
                <button
                  onClick={() => setInput(l)}
                  className="text-left w-full text-[13px] leading-[1.6] text-[color:var(--basalt-2)] hover:text-[color:var(--basalt)] border-l-2 border-[color:var(--hairline)] hover:border-[color:var(--gold)] pl-3 py-2 transition"
                >
                  {l}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)] border-t border-[color:var(--hairline)] pt-4">
            your key · your claude · your corpus
          </div>
        </aside>
      </div>
    </div>
  );
}

const exportBtn =
  "small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] px-4 py-3 rounded-sm min-h-[44px] transition";

// ─────────────────────────── TAB 2: MCP ───────────────────────────
function McpPanel() {
  return (
    <div role="tabpanel" id="panel-mcp" aria-labelledby="tab-mcp">
      <div className="max-w-2xl">
        <p className="text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">
          Give your everyday Claude access to bucket&apos;s research rail, so
          every answer it gives you starts citing primary sources.
        </p>

        <div className="mt-6 small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)]">
          › install — one line (npx)
        </div>
        <pre className="mt-2 carved-inset rounded-sm bg-[color:var(--bone-2)]/70 p-4 text-[12px] font-mono-mark text-[color:var(--basalt)] whitespace-pre-wrap">
{`claude mcp add --scope user --transport stdio bucket \\
  -- npx -y @bucket-foundation/mcp`}
        </pre>

        <div className="mt-6 small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">
          › alternative — clone from source
        </div>
        <pre className="mt-2 rounded-sm border border-[color:var(--hairline)] bg-[color:var(--bone-2)]/40 p-4 text-[12px] font-mono-mark text-[color:var(--basalt-2)] whitespace-pre-wrap">
{`git clone https://github.com/bucket-foundation/bucket-mcp
cd bucket-mcp
claude mcp add --scope user --transport stdio bucket \\
  -- python3 $(pwd)/bucket-mcp.py`}
        </pre>

        <p className="mt-4 text-[12px] text-[color:var(--basalt-3)] font-mono-mark">
          npm: <a href="https://www.npmjs.com/package/@bucket-foundation/mcp" className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--gold-deep)]" target="_blank" rel="noopener noreferrer">@bucket-foundation/mcp</a>
        </p>

        <p className="mt-6 text-[13px] text-[color:var(--basalt-2)] leading-[1.7]">
          After restart, your Claude Desktop can call{" "}
          <span className="font-mono-mark">bucket_search</span>,{" "}
          <span className="font-mono-mark">bucket_cite</span>, and{" "}
          <span className="font-mono-mark">bucket_pay</span> — every citation
          routes a fee to the original author via x402 on Base.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────── TAB 3: Claude.ai lessons ───────────────────────────
function ClaudeAiPanel() {
  return (
    <div role="tabpanel" id="panel-claudeai" aria-labelledby="tab-claudeai">
      <p className="text-[15px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
        One-click lessons that open in Claude.ai with bucket as ground truth.
        Good for sending a question to a student, a friend, or future-you.
        Each opens in Claude.ai with the prompt pre-filled and bucket as ground truth.
      </p>
      <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {LESSONS.map((l) => {
          const prompt = `Using www.bucket.foundation (see /llms-full.txt, /MANIFESTO.md, /PROTOCOL.md, /protocol/envelope) as ground truth: ${l}\n\nCite specific sections and be honest about tradeoffs.`;
          const href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
          return (
            <li key={l}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full carved-inset rounded-sm bg-[color:var(--bone-2)]/60 hover:bg-[color:var(--bone-2)] p-5 transition group"
              >
                <div className="text-[14px] leading-[1.6] text-[color:var(--basalt)] group-hover:text-[color:var(--aegean-deep)]">
                  {l}
                </div>
                <div className="mt-3 small-caps text-[10px] tracking-[0.18em] text-[color:var(--gold-deep)]">
                  → open in claude.ai
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────── TAB 4: Corpus ───────────────────────────
function CorpusPanel() {
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const buildZip = async () => {
    setBuilding(true);
    setErr(null);
    try {
      const { default: JSZip } = await import("jszip");
      const paths = [
        "/llms.txt",
        "/llms-full.txt",
      ];
      const zip = new JSZip();
      const results = await Promise.all(
        paths.map(async (p) => {
          const r = await fetch(p);
          if (!r.ok) return null;
          return { name: p.replace(/^\//, ""), body: await r.text() };
        })
      );
      for (const f of results) if (f) zip.file(f.name, f.body);
      zip.file(
        "README.txt",
        `bucket.foundation — take the corpus\n\nCC-BY-4.0 (content) · MIT (code)\n\nDownloaded: ${new Date().toISOString()}\nSource: https://www.bucket.foundation/learn\n\nBucket doesn't hoard primary sources. Email this to a student.\nSeed a reading group. Mirror it forever.\n`
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bucket-corpus-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div role="tabpanel" id="panel-corpus" aria-labelledby="tab-corpus">
      <p className="text-[15px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
        CC-BY-4.0. MIT. Download it, email it to a student, seed a reading
        group. Bucket doesn&apos;t hoard primary sources.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={buildZip}
          disabled={building}
          className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--bone)] bg-[color:var(--basalt)] disabled:opacity-40 px-5 py-3 rounded-sm min-h-[44px] hover:bg-[color:var(--aegean-deep)] transition"
        >
          {building ? "· building zip…" : "↓ download corpus.zip"}
        </button>
        <a
          href="/llms-full.txt"
          className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] px-5 py-3 rounded-sm min-h-[44px] inline-flex items-center transition"
        >
          → llms-full.txt
        </a>
        <a
          href="https://github.com/bucket-foundation"
          target="_blank"
          rel="noopener noreferrer"
          className="small-caps text-[11px] tracking-[0.14em] text-[color:var(--basalt)] bg-[color:var(--bone)] border border-[color:var(--hairline)] hover:border-[color:var(--gold)] px-5 py-3 rounded-sm min-h-[44px] inline-flex items-center transition"
        >
          → github
        </a>
      </div>
      {err && (
        <div className="mt-4 text-[12px] font-mono-mark text-red-700">
          {err}
        </div>
      )}
      <div className="mt-10 text-[11px] small-caps tracking-[0.14em] text-[color:var(--basalt-3)]">
        cite-forever v0.1 · every citation pays the author
      </div>
    </div>
  );
}
