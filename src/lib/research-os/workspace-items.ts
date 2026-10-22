import { loadFigures } from "@/lib/figures";
import { datasetDescription, datasetSlug, datasetTitle, listDatasets } from "@/lib/research-atlas";
import { MAPS } from "@/app/research/maps/maps";
import type { ListWorkspaceType } from "./workspace-tabs";

export interface WorkspaceListItem {
  id: string;
  title: string;
  line: string;
  href: string;
}

export function workspaceItems(type: ListWorkspaceType): WorkspaceListItem[] {
  if (type === "figures") return loadFigures().map((f) => ({ id: f.name, title: f.name, line: f.about, href: `/research/figures#${encodeURIComponent(f.name)}` }));
  if (type === "maps") return MAPS.map((m) => ({ id: m.slug, title: m.title, line: m.line, href: `/research/maps/${m.slug}` }));
  return listDatasets().map((d) => ({ id: datasetSlug(d), title: datasetTitle(d), line: datasetDescription(d), href: `/research/datasets/${datasetSlug(d)}` }));
}
