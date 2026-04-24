"use client";

import { useEffect, useState } from "react";

/**
 * Wallet-gated interactive island.
 *
 * In production, NEXT_PUBLIC_DYNAMIC_ENV_ID is sometimes unset, in which case
 * Web3Providers renders bare and the Author/CiteToken contexts do not exist.
 * The previous implementation called `useAuthor()` unconditionally and crashed
 * the whole /research route with a 500. This island graceful-degrades:
 *
 *   - Providers missing  -> stone-bone "connect to publish" panel, no crash.
 *   - Providers present  -> lazy-import the real form.
 */
export default function ResearchPublishClient() {
  const [ready, setReady] = useState(false);
  const [hasProviders, setHasProviders] = useState<boolean | null>(null);
  const [FormComp, setFormComp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    setReady(true);
    const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID;
    if (!envId) {
      setHasProviders(false);
      return;
    }
    setHasProviders(true);
    // Lazy import so a missing provider never pulls the module into SSR.
    import("./PublishForm")
      .then((mod) => setFormComp(() => mod.default))
      .catch(() => setHasProviders(false));
  }, []);

  if (!ready || hasProviders === null) {
    return <PanelShell>Loading publish form…</PanelShell>;
  }

  if (hasProviders === false) {
    return (
      <PanelShell>
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-4">
          § Wallet not configured
        </div>
        <div className="font-display uppercase text-[18px] tracking-[0.04em] text-[color:var(--basalt)] mb-3">
          publish is temporarily read-only
        </div>
        <p className="text-[15px] leading-[1.7] text-[color:var(--basalt-2)]">
          This deployment does not have a web3 wallet provider configured, so
          the interactive mint form is disabled here. You can still publish by:
        </p>
        <ul className="mt-4 grid gap-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] list-disc pl-5">
          <li>
            Opening a pull request against{" "}
            <code className="font-mono-mark text-[13px]">
              gianyrox/bucket-foundation
            </code>{" "}
            with your PDF under <code className="font-mono-mark text-[13px]">canon/</code>.
          </li>
          <li>
            Minting directly via the Story Protocol SDK against your own wallet
            — see the scripts in{" "}
            <code className="font-mono-mark text-[13px]">scripts/</code>.
          </li>
          <li>
            Checking back after{" "}
            <code className="font-mono-mark text-[13px]">
              NEXT_PUBLIC_DYNAMIC_ENV_ID
            </code>{" "}
            is provisioned in the Vercel environment.
          </li>
        </ul>
      </PanelShell>
    );
  }

  if (!FormComp) {
    return <PanelShell>Loading publish form…</PanelShell>;
  }
  return <FormComp />;
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="carved-inset carved-pad max-w-2xl">
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}
