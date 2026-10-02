import type { MarkStore } from "../download/marks";
import { getWaitlistStore } from "../waitlist/store";
import { getWhatsNewStore, type DocStore } from "../whats-new/store";
import { digestConfig, optedInRecipients, type DigestConfig, type Recipient } from "./send";
import { getOptOutStore, unsubscribeSecret } from "./unsubscribe";

type Env = Record<string, string | undefined>;

export interface MailWiring {
  config: DigestConfig;
  progress: MarkStore;
  store: DocStore;
  recipients: () => Promise<Recipient[]>;
}

export function mailWiring(env: Env = process.env): MailWiring | { status: 503; error: string; missing?: string[] } {
  const config = digestConfig(env, unsubscribeSecret(env));
  if ("missing" in config) return { status: 503, error: "Digest email is not configured.", missing: config.missing };
  const list = getWaitlistStore(env, "list");
  const downloads = getWaitlistStore(env, "downloads");
  const optOuts = getOptOutStore(env);
  const progress = getOptOutStore(env, "progress");
  const store = getWhatsNewStore(env);
  if (!list || !downloads || !optOuts || !progress || !store) return { status: 503, error: "No Blob store is connected." };
  return { config, progress, store, recipients: () => optedInRecipients([list, downloads], optOuts, config.secret) };
}
