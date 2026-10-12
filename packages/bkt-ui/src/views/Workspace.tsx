import { useEffect, useState } from "react";
import type { Api, ResearchDetail, WorkspaceItem } from "../api";
import { href, type Route, type WorkspaceType } from "../router";
import { activateTab, openTab, patchTab, readTabs, windowStorage, writeTabs, type Tab, type Tabs, type TabStorage } from "../tabs";
import { FILTER_WAIT_MS, NOT_LOADED, Pager } from "./Data";
import { exploreHash, ExploreView, type ExploreApi } from "./Explore";
import type { ExploreStart } from "../explore/ExploreClientV2";
import { FigurePane, figureItems, ORIGIN_LABELS, Paper, RecordSetPane, TablePane, tabsFor, type ResearchApi } from "./Research";
import { TabBar } from "./TabBar";
import "../workspace.css";

export type WorkspaceApi = ResearchApi & ExploreApi & Pick<Api, "workspaceItems">;

export const workspaceTabsKey = (type: WorkspaceType) => `bucket.workspace.${type}.tabs`;

interface Built {
  title: string;
  about: string;
  home: string;
  open: string;
  empty: string;
  noMatch: string;
}

export const BUILT: Partial<Record<WorkspaceType, Built>> = {
  tables: { title: "Tables", about: "Every table across your research outputs. Open one and it stays here as a tab.", home: "All tables", open: "Open tables", empty: "No output lists a table yet.", noMatch: "No table matches" },
  figures: { title: "Figures", about: "Every figure across your research outputs. Open one and it stays here as a tab.", home: "All figures", open: "Open figures", empty: "No output lists a figure yet.", noMatch: "No figure matches" },
  papers: { title: "Papers", about: "Every paper across your research outputs, with its source beside its pages.", home: "All papers", open: "Open papers", empty: "No output holds a paper yet.", noMatch: "No paper matches" },
  graphs: { title: "Graphs", about: "Every set of rows that draws as a graph. Open one, mark rows, and carry them to Explore.", home: "All graphs", open: "Open graphs", empty: "This copy of Bucket holds no set that draws as a graph.", noMatch: "No graph matches" },
  maps: { title: "Maps", about: "Every set of rows that draws on a timeline or a map. Open one, mark rows, and carry them to Explore.", home: "All maps", open: "Open maps", empty: "This copy of Bucket holds no set that draws on a timeline or a map.", noMatch: "No map matches" },
  records: { title: "Records", about: "Every set of records across your research outputs and the data Bucket has loaded.", home: "All records", open: "Open record sets", empty: "No output lists a set of records yet.", noMatch: "No set of records matches" },
};

export type OutputType = "tables" | "records" | "figures" | "papers";
export type BuiltType = OutputType | "graphs" | "maps";
const RESEARCH_TAB = { tables: "data", records: "records", figures: "figures", papers: "paper" } as const;
export const TO_EXPLORE = "Open in Explore";
const MODES = /^[a-z]{3,12}$/;

export const LATER: Record<Exclude<WorkspaceType, BuiltType>, { title: string; line: string; link: { label: string; route: Route } | null }> = {
  people: { title: "People", line: "This workspace is empty in this version of Bucket.", link: null },
  decks: { title: "Decks", line: "Decks open from Learn for now.", link: { label: "Open Learn", route: { name: "learn" } } },
};

export const ON_DATA_SCREEN = "Opens on the Data screen";
export const CHANGED_MARK = "Changed on this computer";

const KEY = /^output:([a-z0-9][a-z0-9-]{0,63}):([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/;
const SET_KEY = /^rowset:([a-z0-9][a-z0-9-]{0,63}):all$/;
const anyKey = (id: string) => KEY.test(id) || SET_KEY.test(id);
export const setKey = (id: string) => `rowset:${id}:all`;

export const ITEM_STATE = "bucketWorkspaceItem";

function shownItem(state: unknown): string | null {
  const id = state && typeof state === "object" ? (state as Record<string, unknown>)[ITEM_STATE] : null;
  return typeof id === "string" && anyKey(id) ? id : null;
}

interface ItemTab extends Tab {
  title: string;
  modes?: string[];
}

export function validItemTab(raw: unknown): ItemTab | null {
  const t = raw as Partial<ItemTab> | null;
  if (!t || typeof t !== "object" || typeof t.id !== "string" || !anyKey(t.id)) return null;
  const title = typeof t.title === "string" && t.title.length > 0 ? t.title.slice(0, 200) : "Item";
  const modes = Array.isArray(t.modes) ? t.modes.filter((m): m is string => typeof m === "string" && MODES.test(m)).slice(0, 8) : [];
  return SET_KEY.test(t.id) && modes.length ? { id: t.id, title, modes } : { id: t.id, title };
}

type Loaded = { status: "loading" } | { status: "ready"; d: ResearchDetail } | { status: "gone" } | { status: "error"; error: string };

function RowSetPane({ api, type, tab, webgl }: { api: WorkspaceApi; type: "graphs" | "maps"; tab: ItemTab; webgl?: boolean }) {
  const data = SET_KEY.exec(tab.id)![1];
  const start: ExploreStart = { data, mode: type === "graphs" ? "graph" : (tab.modes?.[0] ?? "timeline") };
  const [shown, setShown] = useState<ExploreStart>(start);
  return (
    <>
      <div className="workspace-item-head">
        <h2>{tab.title}</h2>
        <a className="link to-explore" href={exploreHash({ data, mode: shown.mode ?? start.mode, sel: shown.data === data ? shown.sel : undefined })}>
          {TO_EXPLORE}
        </a>
      </div>
      <ExploreView api={api} webgl={webgl} embedded initial={start} onState={setShown} />
    </>
  );
}

function ItemPane({ api, type, tab, webgl }: { api: WorkspaceApi; type: BuiltType; tab: ItemTab; webgl?: boolean }) {
  if (type === "graphs" || type === "maps") return SET_KEY.test(tab.id) ? <RowSetPane api={api} type={type} tab={tab} webgl={webgl} /> : <p className="muted">{NOT_LOADED}</p>;
  if (!KEY.test(tab.id)) return <p className="muted">{NOT_LOADED}</p>;
  return <OutputPane api={api} type={type} tab={tab} />;
}

function OutputPane({ api, type, tab }: { api: WorkspaceApi; type: OutputType; tab: ItemTab }) {
  const [, slug, id] = KEY.exec(tab.id) ?? [];
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    api.researchManifest(slug).then(
      (d) => live && setState({ status: "ready", d }),
      (e: Error & { status?: number }) => live && setState(e.status === 404 ? { status: "gone" } : { status: "error", error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [api, slug]);

  if (state.status === "loading") return <p className="muted">Loading…</p>;
  if (state.status === "error") return <p className="error">{state.error}</p>;
  const d = state.status === "ready" ? state.d : null;
  const table = type === "tables" ? (d?.manifest.tables ?? []).find((t) => t.id === id) : undefined;
  const set = type === "records" ? (d?.manifest.record_sets ?? []).find((s) => s.id === id) : undefined;
  const figure = type === "figures" && d ? figureItems(d).find((f) => f.id === id) : undefined;
  const paper = type === "papers" && d !== null && id === "paper" && tabsFor(d).includes("paper");
  if (!d || d.unreadable || (!table && !set && !figure && !paper)) return <p className="muted">{NOT_LOADED}</p>;
  return (
    <>
      <div className="workspace-item-head">
        <h2>{table?.label ?? set?.label ?? figure?.caption ?? d.manifest.title}</h2>
        <a className="link" href={href({ name: "research", slug: d.slug, tab: RESEARCH_TAB[type] })}>
          {type === "papers" ? "Open the whole output" : `From ${d.manifest.title}`}
        </a>
      </div>
      {table && <TablePane api={api} d={d} table={table} />}
      {set && <RecordSetPane api={api} d={d} set={set} />}
      {figure && <FigurePane api={api} d={d} item={figure} />}
      {paper && <Paper api={api} d={d} />}
    </>
  );
}

function ItemList({ api, type, words, onOpen }: { api: WorkspaceApi; type: BuiltType; words: Built; onOpen: (item: WorkspaceItem) => void }) {
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState({ q: "", page: 1 });
  const [list, setList] = useState<{ items: WorkspaceItem[]; total: number; size: number } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (typed === query.q) return;
    const t = setTimeout(() => setQuery({ q: typed, page: 1 }), FILTER_WAIT_MS);
    return () => clearTimeout(t);
  }, [typed, query.q]);

  useEffect(() => {
    let live = true;
    api.workspaceItems(type, { q: query.q || undefined, page: query.page }).then(
      (r) => {
        if (!live) return;
        setFailed(null);
        setList(r);
      },
      (e: Error) => live && setFailed(e.message),
    );
    return () => {
      live = false;
    };
  }, [api, type, query.q, query.page]);

  if (failed) return <p className="banner" role="alert">{failed}</p>;
  if (!list) return <p className="muted">Opening the list…</p>;
  const pages = Math.max(1, Math.ceil(list.total / list.size));
  return (
    <div className="workspace-list">
      <div className="toolbar">
        <input className="search" type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Filter by name or output" aria-label={`Filter ${words.title.toLowerCase()}`} />
      </div>
      {list.total === 0 ? (
        <p className="muted">{query.q ? `${words.noMatch} “${query.q}”.` : words.empty}</p>
      ) : (
        <>
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>From</th>
                  <th>Origin</th>
                  <th>Licence</th>
                  <th>Edits</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => (
                  <tr key={item.key}>
                    <td>
                      {item.from.kind === "output" || type === "graphs" || type === "maps" ? (
                        <button className="link" onClick={() => onOpen(item)}>
                          {item.title}
                        </button>
                      ) : (
                        <a className="link" href={item.opens} title={ON_DATA_SCREEN}>
                          {item.title}
                        </a>
                      )}
                    </td>
                    <td>{item.from.kind === "output" ? <a className="link" href={item.opens}>{item.from.title}</a> : item.explore ? <a className="link" href={href({ name: "explore", data: item.explore.data, mode: item.explore.modes[0] })}>{TO_EXPLORE}</a> : <span className="muted">{ON_DATA_SCREEN}</span>}</td>
                    <td>{ORIGIN_LABELS[item.origin]}</td>
                    <td>{item.licence === "mixed" ? "Each row carries its own" : item.licence || <span className="muted">None stated</span>}</td>
                    <td className={item.changed ? "changed" : undefined}>{item.changed ? CHANGED_MARK : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager at={query.page} pages={pages} onPrev={() => setQuery((s) => ({ ...s, page: Math.max(1, s.page - 1) }))} onNext={() => setQuery((s) => ({ ...s, page: s.page + 1 }))} />
        </>
      )}
    </div>
  );
}

function BuiltWorkspace({ api, type, words, storage, item, webgl }: { api: WorkspaceApi; type: BuiltType; words: Built; storage: TabStorage | null; item?: string; webgl?: boolean }) {
  const key = workspaceTabsKey(type);
  const [tabs, setTabs] = useState<Tabs<ItemTab>>(() => {
    const stored = readTabs<ItemTab>(storage, key, validItemTab);
    return item ? openTab(stored, stored.tabs.find((t) => t.id === setKey(item)) ?? { id: setKey(item), title: item }) : stored;
  });

  useEffect(() => {
    if (!item) return;
    let live = true;
    void api.workspaceItems(type, {}).then(
      (r) => {
        const found = r.items.find((i) => i.key === setKey(item));
        if (live && found) setTabs((s) => patchTab(s, found.key, { title: found.title, modes: found.explore?.modes }));
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [api, type, item]);

  useEffect(() => {
    writeTabs(storage, key, tabs);
  }, [storage, key, tabs]);

  useEffect(() => {
    const onPop = () => setTabs((s) => activateTab(s, shownItem(window.history.state)));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const choose = (next: Tabs<ItemTab>) => {
    if (next.active !== tabs.active) window.history.pushState({ ...(window.history.state && typeof window.history.state === "object" ? window.history.state : {}), [ITEM_STATE]: next.active }, "");
    setTabs(next);
  };

  const active = tabs.tabs.find((t) => t.id === tabs.active) ?? null;
  return (
    <>
      <TabBar label={words.open} home={words.home} state={tabs} onChange={choose} />
      <div role="tabpanel">{active ? <ItemPane key={active.id} api={api} type={type} tab={active} webgl={webgl} /> : <ItemList api={api} type={type} words={words} onOpen={(found) => choose(openTab(tabs, found.explore ? { id: found.key, title: found.title, modes: found.explore.modes } : { id: found.key, title: found.title }))} />}</div>
    </>
  );
}

export function WorkspaceView({ api, type, item, webgl, storage = windowStorage() }: { api: WorkspaceApi; type: WorkspaceType; item?: string; webgl?: boolean; storage?: TabStorage | null }) {
  const words = BUILT[type];
  if (words && type !== "people" && type !== "decks") {
    return (
      <section className="workspace data">
        <header className="head">
          <h1>{words.title}</h1>
          <p className="muted">{words.about}</p>
        </header>
        <BuiltWorkspace key={`${type}/${item ?? ""}`} api={api} type={type} words={words} storage={storage} item={type === "graphs" || type === "maps" ? item : undefined} webgl={webgl} />
      </section>
    );
  }
  const later = LATER[type as keyof typeof LATER];
  return (
    <section className="workspace">
      <header className="head">
        <h1>{later.title}</h1>
        <p className="muted">{later.line}</p>
      </header>
      {later.link && (
        <a className="link" href={href(later.link.route)}>
          {later.link.label}
        </a>
      )}
    </section>
  );
}
