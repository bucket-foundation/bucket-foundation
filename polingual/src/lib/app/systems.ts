import { LANG_CODES, LANGS, langName, MAX_TARGETS, PRESETS, sameTargets, SYSTEM_CATALOG, type LangSystem } from "@academy/lang-systems";

export const ROOT_CHOICES = LANG_CODES.filter((c) => LANGS[c]).map((c) => ({ code: c, name: langName(c) })).sort((a, b) => a.name.localeCompare(b.name));

export function toggleTarget(targets: string[], code: string, root: string): string[] {
  if (code === root) return targets;
  if (targets.includes(code)) return targets.filter((t) => t !== code);
  if (targets.length >= MAX_TARGETS) return targets;
  return [...targets, code];
}

export function presetsFor(root: string): { name: string; targets: string[] }[] {
  const seen: string[][] = [];
  return [...PRESETS, ...SYSTEM_CATALOG].filter((p) => {
    if (p.targets.includes(root) || seen.some((s) => sameTargets(s, p.targets))) return false;
    seen.push(p.targets);
    return true;
  });
}

export function targetChoices(root: string): { code: string; name: string }[] {
  return ROOT_CHOICES.filter((c) => c.code !== root);
}

export function nextToPlace(system: LangSystem): string | null {
  return system.targets.find((t) => system.placement[t] === undefined) ?? null;
}

export function levelText(system: LangSystem, lang: string): string {
  const level = system.levels?.[lang];
  if (level) return level;
  return system.placement[lang] === undefined ? "Not placed" : "Placed";
}

export const appHref = {
  home: "/app",
  create: "/app/new",
  place: (id: string, lang?: string) => `/app/${encodeURIComponent(id)}/place${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`,
  study: (id: string) => `/app/${encodeURIComponent(id)}/study`,
};
