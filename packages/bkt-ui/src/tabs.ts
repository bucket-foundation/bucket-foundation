export interface Tab {
  id: string;
  title?: string;
}

export interface Tabs<T extends Tab> {
  tabs: T[];
  active: string | null;
}

export const MAX_TABS = 12;

export function noTabs<T extends Tab>(): Tabs<T> {
  return { tabs: [], active: null };
}

export function openTab<T extends Tab>(s: Tabs<T>, tab: T, max = MAX_TABS): Tabs<T> {
  if (s.tabs.some((t) => t.id === tab.id)) return { tabs: s.tabs, active: tab.id };
  const tabs = [...s.tabs, tab];
  return { tabs: tabs.slice(Math.max(0, tabs.length - max)), active: tab.id };
}

export function closeTab<T extends Tab>(s: Tabs<T>, id: string): Tabs<T> {
  const at = s.tabs.findIndex((t) => t.id === id);
  if (at < 0) return s;
  const tabs = s.tabs.filter((t) => t.id !== id);
  if (s.active !== id) return { tabs, active: s.active };
  return { tabs, active: (tabs[at] ?? tabs[at - 1])?.id ?? null };
}

export function activateTab<T extends Tab>(s: Tabs<T>, id: string | null): Tabs<T> {
  if (id !== null && !s.tabs.some((t) => t.id === id)) return s;
  return { tabs: s.tabs, active: id };
}

export function moveTab<T extends Tab>(s: Tabs<T>, id: string, to: number): Tabs<T> {
  const from = s.tabs.findIndex((t) => t.id === id);
  const target = Math.max(0, Math.min(s.tabs.length - 1, to));
  if (from < 0 || from === target) return s;
  const tabs = [...s.tabs];
  const [tab] = tabs.splice(from, 1);
  tabs.splice(target, 0, tab);
  return { tabs, active: s.active };
}

export function stepTab<T extends Tab>(s: Tabs<T>, delta: 1 | -1): Tabs<T> {
  const ring: (string | null)[] = [null, ...s.tabs.map((t) => t.id)];
  const at = ring.indexOf(s.active);
  return { tabs: s.tabs, active: ring[(Math.max(at, 0) + delta + ring.length) % ring.length] };
}

export function patchTab<T extends Tab>(s: Tabs<T>, id: string, patch: Partial<Omit<T, "id">>): Tabs<T> {
  if (!s.tabs.some((t) => t.id === id)) return s;
  return { tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)), active: s.active };
}

export type TabStorage = Pick<Storage, "getItem" | "setItem">;

export function windowStorage(): TabStorage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readTabs<T extends Tab>(storage: TabStorage | null, key: string, valid: (raw: unknown) => T | null, max = MAX_TABS): Tabs<T> {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return noTabs();
    const data = JSON.parse(raw) as { tabs?: unknown; active?: unknown } | null;
    if (!data || !Array.isArray(data.tabs)) return noTabs();
    const seen = new Set<string>();
    const tabs: T[] = [];
    for (const item of data.tabs) {
      const t = valid(item);
      if (!t || seen.has(t.id) || tabs.length >= max) continue;
      seen.add(t.id);
      tabs.push(t);
    }
    return { tabs, active: typeof data.active === "string" && seen.has(data.active) ? data.active : null };
  } catch {
    return noTabs();
  }
}

export function writeTabs<T extends Tab>(storage: TabStorage | null, key: string, s: Tabs<T>): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
