import { describe, expect, test } from "bun:test";
import { HIDDEN, LogGuard } from "../src/log-guard";

describe("log guard", () => {
  const input = "Rowan Hale studies coherent water near membranes at Harbor College.";

  test("hides a line that repeats any 20 characters of an input, even cut mid-word", () => {
    const g = new LogGuard([input]);
    expect(g.line("error near oherent water near membra here")).toBe(HIDDEN);
    expect(g.line("KeyError: ROWAN   HALE studies coherent")).toBe(HIDDEN);
    expect(g.line("fitted 160 of 160 people in 1.2 s")).toBe("fitted 160 of 160 people in 1.2 s");
  });

  test("hides emails even when the inputs never held them", () => {
    expect(new LogGuard([]).line("mail rowan (at) harbor.example")).toBe(HIDDEN);
  });

  test("an input too large to index keeps only traceback shape lines", () => {
    const g = new LogGuard([input.repeat(10)], 5);
    expect(g.strict).toBe(true);
    expect(g.line("Traceback (most recent call last):")).toBe("Traceback (most recent call last):");
    expect(g.line(`  File "/x/y.py", line 3`)).toBe(`  File "/x/y.py", line 3`);
    expect(g.line("ValueError")).toBe("ValueError");
    expect(g.line("ValueError: row 3 has Rowan")).toBe(HIDDEN);
    expect(g.line("anything else")).toBe(HIDDEN);
  });
});
