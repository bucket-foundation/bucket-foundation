import { runGenomeJob, type GenomeRequest } from "./job";

self.onmessage = async (e: MessageEvent<GenomeRequest>) => {
  (self as unknown as Worker).postMessage(await runGenomeJob(e.data));
};

export {};
