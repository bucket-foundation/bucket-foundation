package foundation.bucket.core.engine

import java.text.Normalizer

enum class MarkPolicy { Strip, Lenient, Keep }

object Spelled {
    private data class Script(val marks: MarkPolicy, val width: Boolean = false)

    private val scripts = mapOf(
        "ru" to Script(MarkPolicy.Strip), "el" to Script(MarkPolicy.Lenient), "grc" to Script(MarkPolicy.Lenient),
        "ar" to Script(MarkPolicy.Strip), "fa" to Script(MarkPolicy.Strip), "he" to Script(MarkPolicy.Strip),
        "hi" to Script(MarkPolicy.Keep), "sa" to Script(MarkPolicy.Keep), "ta" to Script(MarkPolicy.Keep), "th" to Script(MarkPolicy.Keep),
        "ja" to Script(MarkPolicy.Keep, true), "zh" to Script(MarkPolicy.Keep, true), "ko" to Script(MarkPolicy.Keep, true),
    )
    private val punct = ".,;:!?¿¡\"'«»()-־،؟。、！？".codePoints().toArray().toSet()

    private fun cps(s: String) = s.codePoints().toArray()
    private fun str(cs: List<Int>) = cs.joinToString("") { String(Character.toChars(it)) }

    fun policy(lang: String): MarkPolicy = scripts[lang]?.marks ?: MarkPolicy.Keep

    fun base(s: String, lang: String): String {
        val n = Normalizer.normalize(s, if (scripts[lang]?.width == true) Normalizer.Form.NFKC else Normalizer.Form.NFC).lowercase()
        val out = mutableListOf<Int>()
        var gap = false
        for (c in cps(n)) {
            if (Character.isWhitespace(c) || Character.isSpaceChar(c) || c in punct) { gap = true; continue }
            if (gap && out.isNotEmpty()) out += ' '.code
            gap = false
            out += c
        }
        return str(out)
    }

    fun foldableMarks(s: String): String {
        val out = mutableListOf<Int>()
        var prev: Int? = null
        for (v in cps(s)) {
            val afterCyrillic = prev?.let { it in 0x0400..0x04FF } ?: false
            val drop = ((v == 0x0306 || v == 0x0308) && !afterCyrillic) || v in 0x0300..0x0305 || v == 0x0307 || v in 0x0309..0x036F
            if (!drop) out += v
            prev = v
        }
        return str(out)
    }

    private fun arabicMark(v: Int) = v in 0x064B..0x0670 || v == 0x065F || v in 0x06D6..0x06ED || v == 0x0640
    private fun hebrewMark(v: Int) = v in 0x0591..0x05C7

    fun foldMarks(s: String, lang: String, keepYo: Boolean = false): String {
        var t = base(s, lang)
        if (lang == "ar" || lang == "fa") t = str(cps(t).filterNot(::arabicMark))
        if (lang == "fa") t = t.replace("ي", "ی").replace("ك", "ک")
        if (lang == "he") t = str(cps(t).filterNot(::hebrewMark))
        if (lang == "ru" && !keepYo) t = t.replace("ё", "е")
        if (policy(lang) != MarkPolicy.Keep) t = Normalizer.normalize(foldableMarks(Normalizer.normalize(t, Normalizer.Form.NFD)), Normalizer.Form.NFC)
        return t
    }

    fun distance(a: String, b: String): Int {
        val x = cps(a)
        val y = cps(b)
        if (x.isEmpty()) return y.size
        if (y.isEmpty()) return x.size
        var prev = IntArray(y.size + 1) { it }
        for (i in 1..x.size) {
            val row = IntArray(y.size + 1)
            row[0] = i
            for (j in 1..y.size) row[j] = minOf(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + if (x[i - 1] == y[j - 1]) 0 else 1)
            prev = row
        }
        return prev[y.size]
    }

    fun judge(given: String, expected: List<String>, lang: String): Verdict {
        val g = base(given, lang)
        if (g.isEmpty()) return Verdict.Wrong
        var best = Verdict.Wrong
        for (exp in expected) {
            if (g == base(exp, lang)) return Verdict.Exact
            val gf = foldMarks(given, lang)
            val ef = foldMarks(exp, lang)
            if (gf == ef) {
                if (policy(lang) == MarkPolicy.Strip && foldMarks(given, lang, keepYo = true) == foldMarks(exp, lang, keepYo = true)) return Verdict.Exact
                best = Verdict.Close
                continue
            }
            if (cps(ef).size >= 4 && distance(gf, ef) <= 1) best = Verdict.Close
        }
        return best
    }
}
