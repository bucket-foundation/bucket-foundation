import Foundation

public enum TeXLite {
    static let symbols: [(String, String)] = [
        ("\\mapsto", "↦"), ("\\to", "→"), ("\\rightarrow", "→"), ("\\leftarrow", "←"), ("\\Rightarrow", "⇒"), ("\\iff", "⇔"),
        ("\\implies", "⇒"), ("\\infty", "∞"), ("\\partial", "∂"), ("\\nabla", "∇"), ("\\sum", "∑"), ("\\prod", "∏"),
        ("\\int", "∫"), ("\\oint", "∮"), ("\\sqrt", "√"), ("\\cdot", "·"), ("\\times", "×"), ("\\pm", "±"), ("\\mp", "∓"),
        ("\\leq", "≤"), ("\\le", "≤"), ("\\geq", "≥"), ("\\ge", "≥"), ("\\neq", "≠"), ("\\approx", "≈"), ("\\equiv", "≡"),
        ("\\propto", "∝"), ("\\sim", "∼"), ("\\in", "∈"), ("\\notin", "∉"), ("\\subseteq", "⊆"), ("\\subset", "⊂"),
        ("\\cup", "∪"), ("\\cap", "∩"), ("\\emptyset", "∅"), ("\\forall", "∀"), ("\\exists", "∃"), ("\\neg", "¬"),
        ("\\land", "∧"), ("\\lor", "∨"), ("\\wedge", "∧"), ("\\vee", "∨"), ("\\langle", "⟨"), ("\\rangle", "⟩"),
        ("\\hbar", "ħ"), ("\\ell", "ℓ"), ("\\mathbb{R}", "ℝ"), ("\\mathbb{N}", "ℕ"), ("\\mathbb{Z}", "ℤ"), ("\\mathbb{Q}", "ℚ"),
        ("\\mathbb{C}", "ℂ"), ("\\alpha", "α"), ("\\beta", "β"), ("\\gamma", "γ"), ("\\Gamma", "Γ"), ("\\delta", "δ"),
        ("\\Delta", "Δ"), ("\\epsilon", "ε"), ("\\varepsilon", "ε"), ("\\zeta", "ζ"), ("\\eta", "η"), ("\\theta", "θ"),
        ("\\Theta", "Θ"), ("\\kappa", "κ"), ("\\lambda", "λ"), ("\\Lambda", "Λ"), ("\\mu", "μ"), ("\\nu", "ν"), ("\\xi", "ξ"),
        ("\\pi", "π"), ("\\Pi", "Π"), ("\\rho", "ρ"), ("\\sigma", "σ"), ("\\Sigma", "Σ"), ("\\tau", "τ"), ("\\phi", "φ"),
        ("\\varphi", "φ"), ("\\Phi", "Φ"), ("\\chi", "χ"), ("\\psi", "ψ"), ("\\Psi", "Ψ"), ("\\omega", "ω"), ("\\Omega", "Ω"),
        ("\\colon", ":"), ("\\quad", " "), ("\\qquad", "   "), ("\\,", " "), ("\\;", " "), ("\\!", ""), ("\\left", ""),
        ("\\right", ""), ("\\{", "{"), ("\\}", "}"), ("\\ldots", "…"), ("\\dots", "…"), ("\\cdots", "⋯"),
    ]

    static let superscripts: [Character: Character] = [
        "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
        "+": "⁺", "-": "⁻", "n": "ⁿ", "i": "ⁱ",
    ]

    static let subscripts: [Character: Character] = [
        "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
        "+": "₊", "-": "₋", "i": "ᵢ", "j": "ⱼ", "n": "ₙ", "k": "ₖ", "x": "ₓ",
    ]

    public static func render(_ tex: String) -> String {
        var s = tex
        for (k, v) in symbols.sorted(by: { $0.0.count > $1.0.count }) { s = s.replacingOccurrences(of: k, with: v) }
        s = replaceCommand("\\frac", in: s) { "(\($0[0]))⁄(\($0[1]))" }
        for cmd in ["\\mathrm", "\\mathbf", "\\mathit", "\\text", "\\operatorname", "\\mathcal", "\\vec", "\\hat", "\\bar"] {
            s = replaceCommand(cmd, in: s, arity: 1) { $0[0] }
        }
        s = scripts(s, marker: "^", table: superscripts)
        s = scripts(s, marker: "_", table: subscripts)
        return s.replacingOccurrences(of: "{", with: "").replacingOccurrences(of: "}", with: "")
    }

    static func replaceCommand(_ cmd: String, in s: String, arity: Int = 2, _ make: ([String]) -> String) -> String {
        var out = s
        while let r = out.range(of: cmd + "{") {
            var args: [String] = []
            var i = out.index(before: r.upperBound)
            for _ in 0..<arity {
                guard i < out.endIndex, out[i] == "{", let close = matching(out, from: i) else { return out }
                args.append(String(out[out.index(after: i)..<close]))
                i = out.index(after: close)
            }
            out.replaceSubrange(r.lowerBound..<i, with: make(args))
        }
        return out
    }

    static func matching(_ s: String, from open: String.Index) -> String.Index? {
        var depth = 0
        var i = open
        while i < s.endIndex {
            if s[i] == "{" { depth += 1 }
            if s[i] == "}" { depth -= 1; if depth == 0 { return i } }
            i = s.index(after: i)
        }
        return nil
    }

    static func scripts(_ s: String, marker: Character, table: [Character: Character]) -> String {
        var out = ""
        var i = s.startIndex
        while i < s.endIndex {
            let c = s[i]
            guard c == marker else { out.append(c); i = s.index(after: i); continue }
            let next = s.index(after: i)
            guard next < s.endIndex else { out.append(c); break }
            if s[next] == "{", let close = matching(s, from: next) {
                let body = s[s.index(after: next)..<close]
                out += body.allSatisfy({ table[$0] != nil }) ? String(body.compactMap { table[$0] }) : String(marker) + "(" + body + ")"
                i = s.index(after: close)
            } else {
                out += table[s[next]].map { String($0) } ?? String(marker) + String(s[next])
                i = s.index(after: next)
            }
        }
        return out
    }
}
