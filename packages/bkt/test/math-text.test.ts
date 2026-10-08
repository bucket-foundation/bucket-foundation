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

  test("exact outputs for the shipped conversions", () => {
    const cases: [string, string][] = [
      ["\\binom{6}{3} = \\frac{6!}{3!\\,3!} = 20", "C(6,3) = (6!)/(3! 3!) = 20"],
      ["A = U\\Sigma V^{\\top}", "A = UΣ Vᵀ"],
      ["H^2 = (\\dot a/a)^2", "H² = (a\u0307/a)²"],
      ["k_BT/\\langle x^2\\rangle", "k_BT/⟨x²⟩"],
      ["\\Delta(\\frac{1}{2}mv^2)", "Δ(1/2mv²)"],
      ["E_n = -13.6\\ \\text{eV}/n^2", "E_n = -13.6 eV/n²"],
      ["c = 1/\\sqrt{\\mu_0\\varepsilon_0}", "c = 1/√(μ₀ε₀)"],
      ["n_1\\sin\\theta_1 = n_2\\sin\\theta_2", "n₁sinθ₁ = n₂sinθ₂"],
      ["6.022\\times10^{23}", "6.022×10²³"],
      ["1.0\\times10^{-14}", "1.0×10⁻¹⁴"],
      ["\\mathrm{Ca}^{2+}", "Ca²⁺"],
      ["p \\to -i\\hbar\\nabla", "p → -iħ∇"],
    ];
    for (const [tex, text] of cases) expect(texToText(tex)).toBe(text);
  });
});
