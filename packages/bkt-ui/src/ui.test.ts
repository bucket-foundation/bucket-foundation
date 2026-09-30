import { describe, expect, test } from "bun:test";
import { href, parseHash } from "./router";
import { blocks } from "./views/Lesson";

describe("hash router", () => {
  test("parses every view and round trips", () => {
    expect(parseHash("")).toEqual({ name: "learn" });
    expect(parseHash("#/quiz")).toEqual({ name: "quiz" });
    expect(parseHash("#/review")).toEqual({ name: "review" });
    expect(parseHash("#/import")).toEqual({ name: "import" });
    expect(parseHash("#/learn/05-biophysics")).toEqual({ name: "deck", deck: "05-biophysics" });
    expect(parseHash(href({ name: "deck", deck: "a b" }))).toEqual({ name: "deck", deck: "a b" });
    expect(parseHash("#/nope")).toEqual({ name: "learn" });
    expect(parseHash("#/learn/02-physics/entropy")).toEqual({ name: "deck", deck: "02-physics", atom: "entropy" });
    expect(parseHash("#/path")).toEqual({ name: "path" });
    expect(parseHash(href({ name: "path", to: "first law" }))).toEqual({ name: "path", to: "first law" });
    for (const n of ["advisors", "primes", "jobs"] as const) expect(parseHash(`#/${n}`)).toEqual({ name: n });
  });
});

describe("lesson blocks", () => {
  test("splits headings, lists and paragraphs inside one block", () => {
    expect(blocks("### Intuition\nline one\nline two\n\n- a\n- b\ntail")).toEqual([
      { kind: "h", text: "Intuition" },
      { kind: "p", text: "line one line two" },
      { kind: "ul", items: ["a", "b"] },
      { kind: "p", text: "tail" },
    ]);
  });
});
