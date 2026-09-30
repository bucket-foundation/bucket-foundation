import { runGenomeJob, runSpaceJob, type GenomeRequest } from "./job";

self.onmessage = async (e: MessageEvent<GenomeRequest>) => {
  (self as unknown as Worker).postMessage(e.data.space ? await runSpaceJob(e.data) : await runGenomeJob(e.data));
};

export {};
