import { render } from "ink";
import { agentsBodyV2, ChatStore, chatTurn, plainChat } from "../agents";
import { readProviders } from "../llm/config";
import { dataDir, ensureDataDir, pickKeyring } from "../setup";
import { agentsBody, defaultWaitDeps, waitDir } from "../wait";
import { AgentsApp } from "./agents";
import { EXIT } from "./table";
import { keyringOptions, type Invocation } from "./run";

export async function agentsCmd(inv: Invocation): Promise<number> {
  const home = ensureDataDir(dataDir());
  const d = defaultWaitDeps();
  const store = new ChatStore(waitDir(d.env, d.home));
  const providers = readProviders(home);
  const keyring = providers.some((p) => p.keyed) ? await pickKeyring(keyringOptions(inv), home) : null;
  const running = new Map<string, AbortController>();
  const load = () => agentsBodyV2(agentsBody(d, Math.floor(Date.now() / 1000)), store.list());
  await render(<AgentsApp load={load} providers={providers} turn={(input, ctrl) => chatTurn({ store, running, run: plainChat, keyring, fetch, newId: () => crypto.randomUUID().replace(/-/g, ""), now: Date.now }, input, ctrl)} />).waitUntilExit();
  return EXIT.ok;
}
