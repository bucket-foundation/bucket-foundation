import { runFitJob, type FitRequest } from "./fsrs-fit";

self.onmessage = (e: MessageEvent<FitRequest>) => {
  (self as unknown as Worker).postMessage(runFitJob(e.data));
};

export {};
