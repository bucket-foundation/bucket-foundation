"use client";
import { useEffect, useState } from "react";
import nextDynamic from "next/dynamic";
import StaticCanonGlobe, { GlobeBranch } from "@/components/CanonGlobe";
import type { CanonGlobeMode } from "@/components/canon-globe";

const R3FCanonGlobe = nextDynamic(() => import("@/components/canon-globe"), {
  ssr: false,
  loading: () => <StaticCanonGlobe branches={[]} size={420} interactive={false} />,
});

const STORAGE_KEY = "bkt:canon-globe-mode";

interface Props {
  branches: GlobeBranch[];
}

export default function CanonGlobeMount({ branches }: Props) {
  const [mode, setMode] = useState<CanonGlobeMode>("earth");

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "earth" || v === "stone") setMode(v);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const choose = (m: CanonGlobeMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* localStorage unavailable */
    }
  };

  return (
    <div style={{ width: 420, height: 420 }} className="relative">
      <R3FCanonGlobe branches={branches} mode={mode} />
      <div
        role="group"
        aria-label="Globe texture"
        className="absolute bottom-2 right-2 flex border hairline bg-[color:var(--bone)]/85 backdrop-blur-sm"
        style={{ fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.18em" }}
      >
        <ToggleBtn active={mode === "earth"} onClick={() => choose("earth")}>Earth</ToggleBtn>
        <ToggleBtn active={mode === "stone"} onClick={() => choose("stone")}>Stone</ToggleBtn>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "px-3 py-1 uppercase transition " +
        (active
          ? "bg-[color:var(--basalt)] text-[color:var(--bone)]"
          : "text-[color:var(--basalt-2)] hover:bg-[color:var(--bone-3)]")
      }
    >
      {children}
    </button>
  );
}
