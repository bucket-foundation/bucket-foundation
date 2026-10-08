export interface MathSegment {
  kind: "text" | "math";
  value: string;
  display: boolean;
}

const SPAN = /(?<!\\)\$\$([^$]+?)\$\$|(?<!\\)\$(?!\s)([^$\n]*?[^$\s\\]|[^$\s\\])\$(?!\d)/g;

export function splitMath(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  const re = new RegExp(SPAN.source, "g");
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", value: text.slice(last, at), display: false });
    const display = m[1] !== undefined;
    out.push({ kind: "math", value: (display ? m[1] : m[2]).trim(), display });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last), display: false });
  return out;
}

export const hasMath = (text: string): boolean => splitMath(text).some((s) => s.kind === "math");

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", equiv: "≡", sim: "∼", propto: "∝",
  to: "→", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", Leftarrow: "⇐", leftrightarrow: "↔", Leftrightarrow: "⇔", mapsto: "↦",
  infty: "∞", pm: "±", mp: "∓", times: "×", cdot: "·", div: "÷", circ: "∘", ldots: "…", cdots: "⋯", partial: "∂", nabla: "∇",
  in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cap: "∩", cup: "∪", emptyset: "∅", forall: "∀", exists: "∃", neg: "¬",
  land: "∧", lor: "∨", sum: "∑", prod: "∏", int: "∫", hbar: "ħ", ell: "ℓ", degree: "°", angle: "∠", perp: "⊥", parallel: "∥",
  mathbb: "", mathrm: "", mathbf: "", mathcal: "", text: "", operatorname: "", left: "", right: "", ",": " ", ";": " ", ":": " ", "!": "",
};

const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", i: "ⁱ" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋" };

function group(s: string, at: number): { body: string; end: number } | null {
  if (s[at] !== "{") return null;
  let depth = 0;
  for (let i = at; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return { body: s.slice(at + 1, i), end: i + 1 };
  }
  return null;
}

function operand(s: string, at: number): { body: string; end: number } {
  const g = group(s, at);
  if (g) return g;
  if (s[at] === "\\") {
    const name = /^\\([A-Za-z]+)/.exec(s.slice(at));
    if (name) return { body: name[0], end: at + name[0].length };
  }
  return { body: s.slice(at, at + 1), end: at + 1 };
}

const WORD = /^[A-Za-z0-9.\u00C0-\u024F\u0370-\u03FF]+$/;

const wrap = (t: string) => (WORD.test(t) ? t : `(${t})`);

function script(body: string, table: Record<string, string>, marker: string): string {
  const chars = body.split("");
  return chars.every((c) => table[c]) ? chars.map((c) => table[c]).join("") : `${marker}${wrap(body)}`;
}

export function texToText(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === "\\") {
      const name = /^\\([A-Za-z]+|.)/.exec(tex.slice(i));
      if (!name) break;
      const cmd = name[1];
      i += name[0].length;
      if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
        const a = operand(tex, i);
        const b = operand(tex, a.end);
        out += `${wrap(texToText(a.body))}/${wrap(texToText(b.body))}`;
        i = b.end;
      } else if (cmd === "sqrt") {
        const a = operand(tex, i);
        const inner = texToText(a.body);
        out += `√${(inner.length === 1 && WORD.test(inner)) ? inner : `(${inner})`}`;
        i = a.end;
      } else if (cmd in SYMBOLS) {
        out += SYMBOLS[cmd];
      } else {
        out += cmd;
      }
    } else if (c === "^" || c === "_") {
      const a = operand(tex, i + 1);
      out += script(texToText(a.body), c === "^" ? SUPER : SUB, c);
      i = a.end;
    } else if (c === "{" || c === "}") {
      i += 1;
    } else {
      out += c;
      i += 1;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

export function mathToText(text: string): string {
  return splitMath(text)
    .map((s) => (s.kind === "math" ? texToText(s.value) : s.value))
    .join("");
}
