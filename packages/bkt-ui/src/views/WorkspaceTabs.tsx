import { href, type Route, type WorkspaceType } from "../router";
import "../workspace.css";

export type WorkspaceTab = "nodes" | WorkspaceType;

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string; route: Route }[] = [
  { id: "nodes", label: "Nodes", route: { name: "graph" } },
  { id: "tables", label: "Tables", route: { name: "workspace", type: "tables" } },
  { id: "figures", label: "Figures", route: { name: "workspace", type: "figures" } },
  { id: "papers", label: "Papers", route: { name: "workspace", type: "papers" } },
  { id: "records", label: "Records", route: { name: "workspace", type: "records" } },
  { id: "graphs", label: "Graphs", route: { name: "workspace", type: "graphs" } },
  { id: "people", label: "People", route: { name: "workspace", type: "people" } },
  { id: "decks", label: "Decks", route: { name: "workspace", type: "decks" } },
  { id: "maps", label: "Maps", route: { name: "workspace", type: "maps" } },
];

export const WORKSPACE_BAR_LABEL = "Workspaces, one for each kind of thing";

export function workspaceTabFor(route: Route): WorkspaceTab | null {
  if (route.name === "graph" || route.name === "node") return "nodes";
  if (route.name === "workspace") return route.type ?? "tables";
  return null;
}

export function WorkspaceTabs({ lit }: { lit: WorkspaceTab }) {
  return (
    <nav className="workspace-tabs" aria-label={WORKSPACE_BAR_LABEL}>
      {WORKSPACE_TABS.map((t) => (
        <a key={t.id} href={href(t.route)} className={t.id === lit ? "on" : ""} aria-current={t.id === lit ? "page" : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
