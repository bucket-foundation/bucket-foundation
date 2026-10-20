import type { Keyring } from "../keyring";
import { AnthropicProvider } from "./anthropic";
import { isLoopback, keyAccount, type ProviderEntry } from "./config";
import { OpenAiProvider } from "./openai";
import type { Fetch, Provider } from "./types";

export * from "./types";

export function providerFor(entry: ProviderEntry, keyring: Keyring | null, fetch?: Fetch): Provider {
  const key = async () => (entry.keyed && keyring ? keyring.get(keyAccount(entry.name)) : null);
  if (entry.kind === "anthropic") return new AnthropicProvider({ name: entry.name, model: entry.model, baseUrl: entry.baseUrl, key, fetch });
  return new OpenAiProvider({ name: entry.name, baseUrl: entry.baseUrl, model: entry.model, local: entry.local && isLoopback(entry.baseUrl), key, fetch });
}
export * from "./canon-tools";
