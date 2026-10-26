import { fitInWorker, type FitOptions, type FitResult, type FitWorker, type ReviewEntry } from "./fsrs-fit";

export const spawnFitWorker = (): FitWorker => new Worker(new URL("./fsrs-fit.worker.ts", import.meta.url)) as unknown as FitWorker;

export const fitFsrsWeightsInBrowser = (log: ReviewEntry[], opts?: FitOptions): Promise<FitResult> => fitInWorker(spawnFitWorker, log, opts);
