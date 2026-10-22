export const WEB_WORKSPACE_TYPES = ["study", "figures", "maps", "datasets"] as const;
export type WebWorkspaceType = (typeof WEB_WORKSPACE_TYPES)[number];
export type ListWorkspaceType = Exclude<WebWorkspaceType, "study">;

export const WORKSPACE_ROOT = "/research-os/workspace";

export interface WorkspaceTab {
  type: WebWorkspaceType;
  title: string;
  about: string;
  empty: string;
}

export const WORKSPACE_TABS: Record<WebWorkspaceType, WorkspaceTab> = {
  study: { type: "study", title: "Study", about: "Your target, your notes and the evidence you found, in one place.", empty: "" },
  figures: { type: "figures", title: "Figures", about: "Every figure Bucket draws from its own scripts. Open one to see its data and the script that drew it.", empty: "No figure is on record yet." },
  maps: { type: "maps", title: "Maps", about: "Every research map Bucket draws from the corpus. Open one to read it at full size.", empty: "No map is on record yet." },
  datasets: { type: "datasets", title: "Datasets", about: "Every open dataset in the research atlas, free to read and priced once to cite.", empty: "No dataset is on record yet." },
};

export function parseWorkspaceType(raw: string | undefined | null): WebWorkspaceType | null {
  return WEB_WORKSPACE_TYPES.find((t) => t === raw) ?? null;
}

export function workspaceHref(type: WebWorkspaceType): string {
  return type === "study" ? WORKSPACE_ROOT : `${WORKSPACE_ROOT}/${type}`;
}

export function activeWorkspaceType(pathname: string): WebWorkspaceType | null {
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === WORKSPACE_ROOT) return "study";
  if (!trimmed.startsWith(`${WORKSPACE_ROOT}/`)) return null;
  const rest = trimmed.slice(WORKSPACE_ROOT.length + 1);
  if (rest.includes("/")) return null;
  return parseWorkspaceType(rest);
}
