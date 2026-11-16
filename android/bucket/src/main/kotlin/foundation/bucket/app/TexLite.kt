package foundation.bucket.app

object TexLite {
    private val symbols = mapOf(
        "alpha" to "α", "beta" to "β", "gamma" to "γ", "delta" to "δ", "epsilon" to "ε", "theta" to "θ", "lambda" to "λ", "mu" to "μ", "nu" to "ν",
        "pi" to "π", "rho" to "ρ", "sigma" to "σ", "tau" to "τ", "phi" to "φ", "omega" to "ω", "Delta" to "Δ", "Sigma" to "Σ", "Omega" to "Ω", "Psi" to "Ψ", "psi" to "ψ",
        "hbar" to "ħ", "cdot" to "·", "times" to "×", "approx" to "≈", "neq" to "≠", "leq" to "≤", "geq" to "≥", "infty" to "∞", "partial" to "∂", "nabla" to "∇",
        "to" to "→", "rightarrow" to "→", "leftarrow" to "←", "pm" to "±", "sum" to "Σ", "int" to "∫", "sqrt" to "√", "propto" to "∝", "in" to "∈", "ln" to "ln", "log" to "log",
    )
    private val sup = mapOf('0' to '⁰', '1' to '¹', '2' to '²', '3' to '³', '4' to '⁴', '5' to '⁵', '6' to '⁶', '7' to '⁷', '8' to '⁸', '9' to '⁹', '-' to '⁻', '+' to '⁺', 'n' to 'ⁿ')
    private val sub = mapOf('0' to '₀', '1' to '₁', '2' to '₂', '3' to '₃', '4' to '₄', '5' to '₅', '6' to '₆', '7' to '₇', '8' to '₈', '9' to '₉')

    fun render(tex: String): String {
        var s = tex
        repeat(4) {
            s = s.replace(Regex("""\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}""")) { "(${it.groupValues[1]})/(${it.groupValues[2]})".replace(Regex("""\((\w)\)"""), "$1") }
            s = s.replace(Regex("""\\vec\{([^{}]*)\}""")) { it.groupValues[1] + "\u20D7" }
            s = s.replace(Regex("""\\(?:mathrm|text|mathbf|operatorname)\{([^{}]*)\}""")) { it.groupValues[1] }
            s = s.replace(Regex("""\\sqrt\{([^{}]*)\}""")) { "√(${it.groupValues[1]})" }
        }
        s = s.replace(Regex("""\\([A-Za-z]+)( (?=[A-Za-z]))?""")) { symbols[it.groupValues[1]] ?: it.groupValues[1] }
        s = s.replace(Regex("""\^\{([^{}]*)\}|\^(.)""")) { m -> val t = m.groupValues[1].ifEmpty { m.groupValues[2] }; if (t.all { it in sup }) t.map { sup.getValue(it) }.joinToString("") else "^($t)" }
        s = s.replace(Regex("""_\{([^{}]*)\}|_(.)""")) { m -> val t = m.groupValues[1].ifEmpty { m.groupValues[2] }; if (t.all { it in sub }) t.map { sub.getValue(it) }.joinToString("") else "_$t" }
        return s.replace("{", "").replace("}", "").replace(Regex("""\\[,;! ]"""), " ").replace(Regex(" +"), " ").trim()
    }
}
