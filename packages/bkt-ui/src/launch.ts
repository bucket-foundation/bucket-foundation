export type Invoke = (cmd: string, args: Record<string, unknown>) => Promise<unknown>;

export function shellInvoke(win: Window = window): Invoke | null {
  const internals = (win as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__;
  return typeof internals?.invoke === "function" ? internals.invoke.bind(internals) : null;
}

export async function launchAgent(invoke: Invoke, tool: string, folder: string): Promise<void> {
  await invoke("launch_agent", { tool, folder });
}
