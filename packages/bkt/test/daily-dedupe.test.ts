import { describe, expect, test } from "bun:test";
import { dropRepeats, nearDuplicate, priorDays, promptTokens } from "../src/daily-dedupe";

const est = (prompt: string, answer: string) => ({ type: "estimate" as const, prompt, answer });
const rec = (prompt: string, answer: string) => ({ type: "recall" as const, prompt, answer });

describe("daily quiz repeat filter", () => {
  test("the copy-time repeat from 11-03 and 11-04 is caught", () => {
    expect(nearDuplicate(est("Seconds to copy 57 GB at 100 Mbit/s?", "4560"), est("Seconds to copy 57 GB at 500 MB/s?", "114"))).toBe(true);
  });

  test("the photon vector repeat from 11-05 and 11-06 is caught", () => {
    expect(
      nearDuplicate(est("Gigabytes for 6,564,942 photon vectors of 768 float32 dimensions each?", "20"), est("How many GB hold 6.5 million 768-dimension float32 vectors?", "20")),
    ).toBe(true);
  });

  test("distinct questions from the same days pass", () => {
    const pairs = [
      [est("Seconds to copy 57 GB at 500 MB/s?", "114"), est("GB moved by a 1 Gbit/s link in one hour?", "450")],
      [est("Flashcard reviews in one year at 50 reviews per day?", "18250"), est("How many runs does an hourly timer make in one year?", "8760")],
      [rec("Which license covers the Wiktionary data in the Polingual index?", "CC-BY-SA"), rec("Which branch receives every feat/hte-* engine PR?", "hte/integration")],
      [est("Heartbeats in an 80-year life at 70 beats per minute?", "2940000000"), est("How many queries at $0.005 each earn $1,000?", "200000")],
    ] as const;
    for (const [a, b] of pairs) expect({ a: a.prompt, dup: nearDuplicate(a, b) }).toEqual({ a: a.prompt, dup: false });
  });

  test("numbers lose their thousands commas and units fold to one token", () => {
    expect(promptTokens("Gigabytes for 6,564,942 vectors?")).toEqual(new Set(["gb", "6564942", "vector"]));
  });

  test("dropRepeats checks history and the new set itself", () => {
    const history = [est("Seconds to copy 57 GB at 500 MB/s?", "114")];
    const fresh = [est("Seconds to copy 57 GB at 100 Mbit/s?", "4560"), est("Heartbeats in an 80-year life at 70 bpm?", "2.9e9"), est("Heartbeats over an 80-year life at 70 bpm?", "2.9e9")];
    const { kept, dropped } = dropRepeats(fresh, history);
    expect(kept.map((q) => q.prompt)).toEqual(["Heartbeats in an 80-year life at 70 bpm?"]);
    expect(dropped.length).toBe(2);
  });

  test("priorDays lists the 30 days before a day, newest first", () => {
    const d = priorDays("2026-11-06");
    expect(d.length).toBe(30);
    expect(d[0]).toBe("2026-11-05");
    expect(d[29]).toBe("2026-10-07");
  });
});
