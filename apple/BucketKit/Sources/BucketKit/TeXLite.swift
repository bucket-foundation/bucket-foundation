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
        ("\\colon", ":"), ("\\cos", " cos "), ("\\sin", " sin "), ("\\tan", " tan "), ("\\log", " log "), ("\\ln", " ln "), ("\\exp", " exp "), ("\\lim", " lim "), ("\\max", " max "), ("\\min", " min "), ("\\det", " det "), ("\\ ", " "), ("\\quad", " "), ("\\qquad", "   "), ("\\,", " "), ("\\;", " "), ("\\!", ""), ("\\left", ""),
        ("\\right", ""), ("\\mid", "∣"), ("\\ne", "≠"), ("\\ll", "≪"), ("\\gg", "≫"), ("\\gtrsim", "≳"), ("\\lesssim", "≲"),
        ("\\odot", "⊙"), ("\\div", "÷"), ("\\uparrow", "↑"), ("\\downarrow", "↓"), ("\\dagger", "†"), ("\\ddagger", "‡"), ("\\oplus", "⊕"),
        ("\\otimes", "⊗"), ("\\cong", "≅"), ("\\simeq", "≃"), ("\\perp", "⊥"), ("\\parallel", "∥"), ("\\angle", "∠"), ("\\prime", "′"),
        ("\\circ", "∘"), ("\\sinh", " sinh "), ("\\cosh", " cosh "), ("\\tanh", " tanh "), ("\\ker", " ker "), ("\\deg", " deg "),
        ("\\dim", " dim "), ("\\arg", " arg "), ("\\sup", " sup "), ("\\inf", " inf "), ("\\bmod", " mod "), ("\\top", "⊤"), ("\\bot", "⊥"),
        ("\\leftrightarrow", "↔"), ("\\Leftrightarrow", "⇔"), ("\\Leftarrow", "⇐"), ("\\vdots", "⋮"), ("\\ddots", "⋱"), ("\\star", "⋆"),
        ("\\ast", "∗"), ("\\bullet", "•"), ("\\lfloor", "⌊"), ("\\rfloor", "⌋"), ("\\lceil", "⌈"), ("\\rceil", "⌉"), ("\\lvert", "|"),
        ("\\rvert", "|"), ("\\vert", "|"), ("\\Vert", "‖"), ("\\varrho", "ρ"), ("\\vartheta", "θ"), ("\\upsilon", "υ"), ("\\Xi", "Ξ"),
        ("\\Upsilon", "Υ"), ("\\big", ""), ("\\Big", ""), ("\\bigg", ""), ("\\Bigg", ""), ("\\bigl", ""), ("\\bigr", ""), ("\\Bigl", ""),
        ("\\Bigr", ""), ("\\rm", ""), ("\\displaystyle", ""), ("\\limits", ""), ("\\nolimits", ""), ("\\{", "{"), ("\\}", "}"), ("\\ldots", "…"), ("\\dots", "…"), ("\\cdots", "⋯"),
    ]

    static let superscripts: [Character: Character] = [
        "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
        "+": "⁺", "-": "⁻", "n": "ⁿ", "i": "ⁱ",
    ]

    static let subscripts: [Character: Character] = [
        "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
        "+": "₊", "-": "₋", "i": "ᵢ", "j": "ⱼ", "n": "ₙ", "k": "ₖ", "x": "ₓ", "a": "ₐ", "e": "ₑ", "h": "ₕ", "l": "ₗ",
        "m": "ₘ", "o": "ₒ", "p": "ₚ", "r": "ᵣ", "s": "ₛ", "t": "ₜ", "u": "ᵤ", "v": "ᵥ", "=": "₌", "(": "₍", ")": "₎",
    ]

    static let marks: [String: String] = [
        "vec": "\u{20D7}", "hat": "\u{0302}", "widehat": "\u{0302}", "bar": "\u{0304}", "overline": "\u{0305}", "tilde": "\u{0303}",
        "widetilde": "\u{0303}", "dot": "\u{0307}", "ddot": "\u{0308}",
    ]
    static let plain = ["mathrm", "mathbf", "mathit", "mathsf", "mathtt", "text", "textrm", "textbf", "textit", "operatorname", "mathcal", "boldsymbol", "bm", "mathbb", "underbrace", "overbrace"]
    static let blackboard: [String: String] = ["R": "ℝ", "N": "ℕ", "Z": "ℤ", "Q": "ℚ", "C": "ℂ", "E": "𝔼", "P": "ℙ"]
    static let lookup: [String: String] = Dictionary(symbols.map { (String($0.0.dropFirst()), $0.1) }, uniquingKeysWith: { a, _ in a })

    public static func render(_ tex: String) -> String {
        var s = tex
        for (k, v) in [("^\\circ", "°"), ("^{\\circ}", "°"), ("\\%", "%"), ("\\_", "_"), ("\\&", "&"), ("\\#", "#"), ("\\|", "‖"), ("\\{", "{"), ("\\}", "}"),
                       ("\\ ", " "), ("\\,", " "), ("\\;", " "), ("\\:", " "), ("\\!", "")] {
            s = s.replacingOccurrences(of: k, with: v)
        }
        s = matrices(s)
        s = replaceCommand("\\pmod", in: s, arity: 1) { " (mod \($0[0]))" }
        s = s.replacingOccurrences(of: #"\\pmod\s*([A-Za-z0-9]+)"#, with: " (mod $1)", options: .regularExpression)
        s = replaceCommand("\\binom", in: s) { "C(\($0[0]), \($0[1]))" }
        s = s.replacingOccurrences(of: #"\\[dtc]?frac\s*([A-Za-z0-9])([A-Za-z0-9])"#, with: "$1⁄$2", options: .regularExpression)
        for f in ["\\frac", "\\dfrac", "\\tfrac", "\\cfrac"] {
            s = replaceCommand(f, in: s) { a in a.allSatisfy(simple) ? "\(a[0])⁄\(a[1])" : "(\(a[0]))⁄(\(a[1]))" }
        }
        s = replaceCommand("\\sqrt", in: s, arity: 1) { simple($0[0]) ? "√\($0[0])" : "√(\($0[0]))" }
        s = replaceCommand("\\mathbb", in: s, arity: 1) { blackboard[$0[0]] ?? $0[0] }
        for cmd in plain { s = replaceCommand("\\" + cmd, in: s, arity: 1) { $0[0] } }
        s = commands(s)
        s = scripts(s, marker: "^", table: superscripts)
        s = scripts(s, marker: "_", table: subscripts)
        return s.replacingOccurrences(of: "{", with: "").replacingOccurrences(of: "}", with: "")
    }

    static func simple(_ x: String) -> Bool { x.count <= 3 && x.allSatisfy { $0.isLetter || $0.isNumber } }

    static func commands(_ s: String) -> String {
        var out = ""
        var pending: String?
        var i = s.startIndex
        func emit(_ text: String) {
            guard let mark = pending, let first = text.first, !first.isWhitespace else { out += text; return }
            out += String(first) + mark + text.dropFirst()
            pending = nil
        }
        while i < s.endIndex {
            guard s[i] == "\\" else {
                if s[i] == " ", pending != nil { i = s.index(after: i); continue }
                emit(String(s[i]))
                i = s.index(after: i)
                continue
            }
            var j = s.index(after: i)
            while j < s.endIndex, s[j].isLetter { j = s.index(after: j) }
            let name = String(s[s.index(after: i)..<j])
            i = j
            if name.isEmpty { emit("\\"); continue }
            if let mark = marks[name] {
                if i < s.endIndex, s[i] == "{", let close = matching(s, from: i) {
                    let inner = commands(String(s[s.index(after: i)..<close]))
                    emit(inner.isEmpty ? "" : String(inner.first!) + mark + inner.dropFirst())
                    i = s.index(after: close)
                } else {
                    pending = mark
                }
                continue
            }
            emit(lookup[name] ?? name)
        }
        return out
    }

    static func matrices(_ s: String) -> String {
        var out = s
        let envs = ["pmatrix", "bmatrix", "vmatrix", "matrix", "cases", "aligned", "array"]
        for env in envs {
            let open = "\\begin{\(env)}", close = "\\end{\(env)}"
            while let a = out.range(of: open), let b = out.range(of: close, range: a.upperBound..<out.endIndex) {
                var inner = out[a.upperBound..<b.lowerBound]
                if env == "array", inner.hasPrefix("{"), let end = inner.firstIndex(of: "}") { inner = inner[inner.index(after: end)...] }
                let rows = inner.components(separatedBy: "\\\\")
                    .map { $0.replacingOccurrences(of: "&", with: " ").trimmingCharacters(in: .whitespaces) }
                    .filter { !$0.isEmpty }
                let body = rows.joined(separator: "; ")
                out.replaceSubrange(a.lowerBound..<b.upperBound, with: env == "cases" || env == "aligned" ? "{ \(body) }" : "(\(body))")
            }
        }
        return out
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
                out += body.allSatisfy({ table[$0] != nil }) ? String(body.compactMap { table[$0] })
                    : marker == "_" && body.count <= 3 && !body.contains(" ") ? String(marker) + body : String(marker) + "(" + body + ")"
                i = s.index(after: close)
            } else {
                out += table[s[next]].map { String($0) } ?? String(marker) + String(s[next])
                i = s.index(after: next)
            }
        }
        return out
    }
}
