"use client";

import { useState } from "react";
import { Button, ButtonLink, Card } from "@/ui";
import { ICON_NAMES, Icon, iconDataUrl, iconSvg, type IconName } from "@/ui/icons";
import s from "./kit.module.css";

function spriteUrl() {
  const symbols = ICON_NAMES.map((n) => iconSvg(n).replace("<svg", `<symbol id="${n}"`).replace(/ width="24" height="24"/, "").replace(/<\/svg>$/, "</symbol>").replace(' xmlns="http://www.w3.org/2000/svg"', ""));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`)}`;
}

export default function IconGrid() {
  const [copied, setCopied] = useState<IconName | null>(null);

  async function copy(name: IconName) {
    try {
      await navigator.clipboard.writeText(iconSvg(name));
      setCopied(name);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
        <ButtonLink href={spriteUrl()} download="polingual-icons.svg" variant="primary" size="md" icon={<Icon name="download" size={20} />}>
          Download all {ICON_NAMES.length} icons
        </ButtonLink>
      </div>
      <div className={s.icons}>
        {ICON_NAMES.map((name) => (
          <Card key={name} pad="sm" className={s.iconCell}>
            <Icon name={name} size={48} />
            <code>{name}</code>
            <div className={s.iconActions}>
              <Button variant="quiet" size="sm" onClick={() => copy(name)} aria-label={`Copy ${name} SVG`}>
                {copied === name ? "Copied" : "Copy"}
              </Button>
              <ButtonLink href={iconDataUrl(name)} download={`polingual-${name}.svg`} variant="ghost" size="sm" aria-label={`Download ${name} SVG`}>
                SVG
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
