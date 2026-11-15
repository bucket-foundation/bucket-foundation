package foundation.bucket.core.engine

import java.text.Normalizer

enum class Verdict { Exact, Close, Wrong }

object Typed {
    private val answerPunct = "¿¡!?.,;:\"'«»()。、！？؟،".toSet()
    private val endPunct = ".!?。？！".toSet()
    private val foldable = Regex("(?<![\\u0400-\\u04ff])[\\u0306\\u0308]|[\\u0300-\\u0305\\u0307\\u0309-\\u036f]")

    private fun arabicVowel(c: Char) = c.code in 0x064B..0x0652 || c.code == 0x0670 || c.code == 0x0640

    private fun stripEnd(s: String) = s.trimEnd { it in endPunct }

    fun normalize(s: String, lang: String = ""): String {
        var t = s.trim().lowercase()
        t = if (lang == "ar") t.filterNot(::arabicVowel) else Normalizer.normalize(foldable.replace(Normalizer.normalize(t, Normalizer.Form.NFD), ""), Normalizer.Form.NFC)
        t = t.map { if (it in answerPunct) ' ' else it }.joinToString("")
        return t.trim().replace(Regex("\\s+"), " ")
    }

    fun editDistance(a: String, b: String): Int {
        val m = a.length
        val n = b.length
        val d = Array(m + 1) { i -> IntArray(n + 1) { j -> if (i == 0) j else if (j == 0) i else 0 } }
        for (i in 1..m) for (j in 1..n) {
            val cost = if (a[i - 1] == b[j - 1]) 0 else 1
            d[i][j] = minOf(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
            if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) d[i][j] = minOf(d[i][j], d[i - 2][j - 2] + 1)
        }
        return d[m][n]
    }

    fun judge(given: String, expected: List<String>, lang: String = ""): Verdict {
        val raw = stripEnd(given.trim().lowercase())
        if (raw.isEmpty()) return Verdict.Wrong
        var best = Verdict.Wrong
        for (exp in expected) {
            val e0 = stripEnd(exp.trim().lowercase())
            if (raw == e0) return Verdict.Exact
            if (lang == "ar" && raw.filterNot(::arabicVowel) == e0.filterNot(::arabicVowel)) return Verdict.Exact
            val g = normalize(given, lang)
            val e = normalize(exp, lang)
            if (g == e || (e.length >= 5 && editDistance(g, e) <= 1)) best = Verdict.Close
        }
        return best
    }
}
