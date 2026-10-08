import { describe, expect, test } from "bun:test";
import { mathToText, texToText } from "../../../src/lib/research-os/work-quiz/math";

describe("CLI math fallback", () => {
  test("strips delimiters and keeps surrounding text", () => {
    expect(mathToText("What is $E = mc^2$ for a mass?")).toBe("What is E = mc² for a mass?");
    expect(mathToText("no math here")).toBe("no math here");
    expect(mathToText("costs $5 and $10")).toBe("costs $5 and $10");
  });

  test("maps the common commands", () => {
    expect(texToText("\\alpha \\ge \\pi")).toBe("α ≥ π");
    expect(texToText("a \\pm b \\to \\infty")).toBe("a ± b → ∞");
    expect(texToText("\\sqrt{x+1}")).toBe("√(x+1)");
    expect(texToText("\\frac{x+1}{2}")).toBe("(x+1)/2");
    expect(texToText("x^{10} + y_2")).toBe("x¹⁰ + y₂");
    expect(texToText("a^{b+c}")).toBe("a^(b+c)");
  });

  test("renders the converted corpus formulas as readable text", () => {
    expect(texToText("\\binom{6}{3} = \\frac{6!}{3!\\,3!} = 20")).toContain("= 20");
    expect(texToText("\\Delta x \\cdot \\Delta p \\ge \\hbar/2")).toBe("Δ x · Δ p ≥ ħ/2");
  });
});
