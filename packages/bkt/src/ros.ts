import { parseRos, ROS_PATHS, type RosPayloads, type RosResource } from "../../../src/lib/research-os/contract";
import staff from "../content/staff-ros.json" with { type: "json" };
import type { Route } from "./serve";

export type RosLoader<K extends RosResource> = () => RosPayloads[K] | null;

export type RosLoaders = { [K in RosResource]?: RosLoader<K> };

export function bundledRos(data: Record<string, unknown> = staff): RosLoaders {
  const pick = <K extends RosResource>(k: K): RosLoader<K> | undefined => (k in data ? () => data[k] as RosPayloads[K] : undefined);
  return { solvability: pick("solvability"), software: pick("software"), patents: pick("patents") };
}

export const BUNDLED_ROS: RosLoaders = bundledRos();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function rosRoutes(loaders: RosLoaders = BUNDLED_ROS, onError: (e: Error) => void = () => {}): Record<string, Route> {
  const routes: Record<string, Route> = {};
  for (const resource of Object.keys(ROS_PATHS) as RosResource[]) {
    routes[`GET ${ROS_PATHS[resource].local}`] = () => {
      const load = loaders[resource] as RosLoader<typeof resource> | undefined;
      const data = load ? load() : null;
      if (data === null) return json({ error: `no ${resource} source on this computer` }, 404);
      try {
        return json(parseRos(resource, data));
      } catch (e) {
        onError(e as Error);
        return json({ error: "contract_broken" }, 500);
      }
    };
  }
  return routes;
}
