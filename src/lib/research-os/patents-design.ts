import type { Segment } from "./software-atlas";

export interface PatentsDesign {
  memo: string;
  sources: { source: Segment[]; researchOs: Segment[]; gateway: Segment[] }[];
  corpus: { branch: Segment[]; cpc: Segment[]; why: Segment[] }[];
  settled: Segment[][];
  slices: { n: number; title: string; shipped: boolean }[];
}
