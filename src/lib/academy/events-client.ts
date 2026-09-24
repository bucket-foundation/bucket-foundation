import type { ClientEventName, LearnEventProps } from "./events";

const API = "/api/academy/event";
const RETRY_MS = 1500;

export type Fetcher = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status">>;

export interface EventSender {
  send: <N extends ClientEventName>(id: string, name: N, props: LearnEventProps[N]) => Promise<boolean>;
}

export function createEventSender(fetcher: Fetcher, wait: (ms: number) => Promise<void>): EventSender {
  const sent = new Map<string, Promise<boolean>>();
  const attempt = async (body: string): Promise<"ok" | "retry" | "stop"> => {
    try {
      const res = await fetcher(API, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
      if (res.ok) return "ok";
      return res.status >= 500 ? "retry" : "stop";
    } catch {
      return "retry";
    }
  };
  return {
    send(id, name, props) {
      const prior = sent.get(id);
      if (prior) return prior;
      const body = JSON.stringify({ id, name, props });
      const run = (async () => {
        const first = await attempt(body);
        if (first !== "retry") return first === "ok";
        await wait(RETRY_MS);
        return (await attempt(body)) === "ok";
      })();
      sent.set(id, run);
      return run;
    },
  };
}

let _sender: EventSender | null = null;

export function sendLearnEvent<N extends ClientEventName>(id: string, name: N, props: LearnEventProps[N]): void {
  if (typeof window === "undefined") return;
  _sender ??= createEventSender((url, init) => fetch(url, init), (ms) => new Promise((r) => window.setTimeout(r, ms)));
  void _sender.send(id, name, props);
}

export function newEventId(): string {
  return crypto.randomUUID();
}
