import type { CSSProperties } from "react";

export type CssVarName = `--${string}`;

export function cssVars(vars: Partial<Record<CssVarName, string | number>>): CSSProperties {
  return vars as CSSProperties;
}
