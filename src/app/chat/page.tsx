"use client";

// src/app/chat/page.tsx — public chat surface for bucket.foundation.
// Behind NEXT_PUBLIC_CHAT_ENABLED gate. Auth via NextAuth email magic link.

import { useEffect, useRef, useState } from "react";

const CHAT_ENABLED = process.env.NEXT_PUBLIC_CHAT_ENABLED === "true";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface SessionResp {
  user?: { email?: string; id?: string };
}

export default function ChatPage() {
  if (!CHAT_ENABLED) {
    return <PreviewGate />;
  }
  return <ChatSurface />;
}

function PreviewGate() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-light tracking-tight mb-3">chat — preview soon</h1>
      <p className="text-sm text-[color:var(--basalt-2,#888)] mb-8">
        bucket.foundation chat is gated while we tune feed402 grounding.
        Drop your email to get the access link when it opens.
      </p>
      {sent ? (
        <p className="text-sm">Thanks — we&apos;ll be in touch.</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            // TODO(bkt-q7k+6): wire to real waitlist endpoint; for now mailto fallback.
            window.location.href = `mailto:hello@bucket.foundation?subject=chat%20preview&body=Please%20add%20${encodeURIComponent(
              email,
            )}%20to%20the%20chat%20preview%20list.`;
            setSent(true);
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="flex-1 border border-[color:var(--basalt-3,#444)] bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="border border-[color:var(--basalt-3,#444)] px-4 py-2 text-sm small-caps"
          >
            Request access
          </button>
        </form>
      )}
    </main>
  );
}

function ChatSurface() {
  const [session, setSession] = useState<SessionResp | null | undefined>(undefined);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setSession(s && s.user ? s : null))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (session === undefined) {
    return <main className="p-12 text-sm">loading…</main>;
  }

  if (session === null) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-3xl font-light mb-4">sign in to chat</h1>
        <p className="text-sm text-[color:var(--basalt-2,#888)] mb-6">
          We email you a magic link. No password, no social.
        </p>
        <a
          href="/api/auth/signin"
          className="inline-block border border-[color:var(--basalt-3,#444)] px-4 py-2 small-caps text-sm"
        >
          Sign in with email
        </a>
      </main>
    );
  }

  async function send() {
    if (!input.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantIdx = next.length;
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.body) throw new Error("no_stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const evt of events) {
          const lines = evt.split("\n");
          const eventName = lines.find((l) => l.startsWith("event: "))?.slice(7);
          const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6);
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (eventName === "text" && data.delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[assistantIdx] = {
                  role: "assistant",
                  content: copy[assistantIdx].content + data.delta,
                };
                return copy;
              });
            } else if (eventName === "tool_use") {
              setMessages((m) => {
                const copy = [...m];
                copy[assistantIdx] = {
                  role: "assistant",
                  content:
                    copy[assistantIdx].content +
                    `\n[tool: ${data.name}(${JSON.stringify(data.input)})]\n`,
                };
                return copy;
              });
            }
          } catch {
            // ignore parse errors on partial frames
          }
        }
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[assistantIdx] = {
          role: "assistant",
          content: `error: ${(err as Error).message}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col h-[calc(100vh-80px)]">
      <header className="mb-4">
        <h1 className="text-2xl font-light">chat</h1>
        <p className="text-xs text-[color:var(--basalt-2,#888)]">
          grounded in feed402. signed in as {session.user?.email}.
        </p>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 border border-[color:var(--basalt-3,#222)] p-4"
      >
        {messages.length === 0 && (
          <p className="text-sm text-[color:var(--basalt-2,#888)]">
            Ask about a primary derivation, an axiom, or a paper. Every claim is
            grounded in feed402 citation envelopes.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-sm whitespace-pre-wrap">
            <span className="small-caps text-[color:var(--basalt-2,#888)] mr-2">
              {m.role === "user" ? "you" : "bucket"}
            </span>
            {m.content}
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask about a foundation…"
          disabled={streaming}
          className="flex-1 border border-[color:var(--basalt-3,#444)] bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="border border-[color:var(--basalt-3,#444)] px-4 py-2 text-sm small-caps disabled:opacity-50"
        >
          {streaming ? "…" : "send"}
        </button>
      </form>
    </main>
  );
}
