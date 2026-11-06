export type SocketStatus = "connecting" | "open" | "closed";
export type Realtime = { url: string; key: string; topic: string };

export function socketUrl(rt: Realtime): string {
  return `${rt.url.replace(/^http/, "ws").replace(/\/$/, "")}/realtime/v1/websocket?apikey=${encodeURIComponent(rt.key)}&vsn=1.0.0`;
}

export function joinFrame(topic: string, ref: string): string {
  return JSON.stringify({ topic: `realtime:${topic}`, event: "phx_join", payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false } }, ref });
}

export function heartbeatFrame(ref: string): string {
  return JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref });
}

export function broadcastPayload(raw: string): unknown | undefined {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!msg || typeof msg !== "object") return undefined;
  const m = msg as { event?: unknown; payload?: { event?: unknown; payload?: unknown } };
  if (m.event !== "broadcast" || !m.payload || m.payload.event !== "stoa") return undefined;
  return m.payload.payload;
}

export class LiveSocket {
  private ws: WebSocket | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private ref = 0;
  private stopped = false;
  private attempts = 0;

  constructor(
    private rt: Realtime,
    private onEvent: (payload: unknown) => void,
    private onStatus: (s: SocketStatus) => void,
  ) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  retarget(rt: Realtime): void {
    if (rt.topic === this.rt.topic && rt.url === this.rt.url) return;
    this.rt = rt;
    this.ws?.close();
  }

  stop(): void {
    this.stopped = true;
    if (this.beat) clearInterval(this.beat);
    if (this.retry) clearTimeout(this.retry);
    this.ws?.close();
    this.ws = null;
  }

  private next(): string {
    this.ref += 1;
    return String(this.ref);
  }

  private connect(): void {
    if (this.stopped) return;
    this.onStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(socketUrl(this.rt));
    } catch {
      this.schedule();
      return;
    }
    this.ws = ws;
    const topic = this.rt.topic;
    ws.onopen = () => {
      this.attempts = 0;
      ws.send(joinFrame(topic, this.next()));
      this.beat = setInterval(() => ws.readyState === ws.OPEN && ws.send(heartbeatFrame(this.next())), 25_000);
    };
    ws.onmessage = (m) => {
      const raw = typeof m.data === "string" ? m.data : "";
      if (raw.includes('"phx_reply"') && raw.includes('"ok"')) this.onStatus("open");
      const payload = broadcastPayload(raw);
      if (payload !== undefined) this.onEvent(payload);
    };
    ws.onclose = () => {
      if (this.beat) clearInterval(this.beat);
      this.beat = null;
      this.onStatus("closed");
      this.schedule();
    };
    ws.onerror = () => ws.close();
  }

  private schedule(): void {
    if (this.stopped) return;
    this.attempts += 1;
    this.retry = setTimeout(() => this.connect(), Math.min(10_000, 500 * 2 ** Math.min(this.attempts, 5)));
  }
}
