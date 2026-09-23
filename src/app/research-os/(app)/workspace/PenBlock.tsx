"use client";

import { useEffect, useState } from "react";

function key(nodeId: string) {
  return `ros-pen:${nodeId}`;
}

export default function PenBlock({ nodeId }: { nodeId: string }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      setText(localStorage.getItem(key(nodeId)) ?? "");
    } catch {
      setText("");
    }
    setSaved(true);
  }, [nodeId]);

  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      try {
        if (text) localStorage.setItem(key(nodeId), text);
        else localStorage.removeItem(key(nodeId));
      } catch {
      }
      setSaved(true);
    }, 400);
    return () => clearTimeout(t);
  }, [text, saved, nodeId]);

  return (
    <div className="mt-3 border-t border-[color:var(--hairline)] pt-3">
      <div className="flex items-center gap-2 text-[12px]">
        <span className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--aegean-deep)]">pen</span>
        <span className="text-[color:var(--basalt-3)]">your own writing; nothing reads it</span>
        <span className="ml-auto text-[10px] text-[color:var(--basalt-3)]">{saved ? "saved here" : "…"}</span>
      </div>
      <textarea
        id={`pen-${nodeId}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder="Think on the page."
        className="mt-2 w-full min-h-[96px] bg-transparent border border-[color:var(--hairline)] rounded px-3 py-2 text-[14px] leading-[1.6] resize-y"
        style={{ fontFamily: "var(--font-fraunces)" }}
      />
    </div>
  );
}
