"use client";

import { useEffect, useState } from "react";
import type { RosPayloads, RosResource, RosSource } from "./contract";

export type RosState<K extends RosResource> =
  | { status: "loading" }
  | { status: "ready"; data: RosPayloads[K] }
  | { status: "missing"; error: string }
  | { status: "error"; httpStatus: number; error: string };

export function rosState<K extends RosResource>(result: Awaited<ReturnType<RosSource["get"]>>): RosState<K> {
  if (result.ok) return { status: "ready", data: result.data as RosPayloads[K] };
  if (result.status === 404) return { status: "missing", error: result.error };
  return { status: "error", httpStatus: result.status, error: result.error };
}

export function useRosResource<K extends RosResource>(source: RosSource, resource: K): RosState<K> {
  const [state, setState] = useState<RosState<K>>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    source.get(resource).then((r) => {
      if (alive) setState(rosState<K>(r));
    });
    return () => {
      alive = false;
    };
  }, [source, resource]);
  return state;
}
