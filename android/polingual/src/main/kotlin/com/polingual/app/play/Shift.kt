package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem
import java.text.Normalizer

data class ShiftTarget(val lang: String, val form: String, val meaning: String)
data class ShiftBoard(val date: String, val langs: List<String>, val length: Int, val columns: List<List<String>>, val targets: List<ShiftTarget>, val valid: Map<String, List<String>>)

object Shift {
    val LANGS = listOf("es", "fr", "it", "pt", "de", "nl", "sv")
    const val LENGTH = 4
    const val PER_LANG = 3
    private val LETTERS = Regex("^\\p{Ll}+$")

    fun letters(s: String): List<String> = s.codePoints().toArray().map { String(Character.toChars(it)) }

    fun clean(form: String?, length: Int): String? {
        if (form == null) return null
        val f = Normalizer.normalize(form, Normalizer.Form.NFC).lowercase()
        return if (letters(f).size == length && LETTERS.matches(f)) f else null
    }

    fun spellable(word: String, columns: List<List<String>>): Boolean {
        val l = letters(word)
        return l.size == columns.size && l.withIndex().all { (i, ch) -> ch in columns[i] }
    }

    fun centerWord(columns: List<List<String>>, offsets: List<Int>): String =
        columns.mapIndexed { i, col -> col[((offsets[i] % col.size) + col.size) % col.size] }.joinToString("")

    fun rotate(offsets: List<Int>, column: Int, by: Int): List<Int> = offsets.mapIndexed { i, o -> if (i == column) o + by else o }

    fun hintFor(target: String, revealed: Int): String = letters(target).mapIndexed { i, ch -> if (i < revealed) ch else "_" }.joinToString(" ")

    fun board(items: List<LangItem>, date: String, root: String = "en", length: Int = LENGTH): ShiftBoard? {
        val rand = WebRandom(WebRandom.seedOf("shift:$date"))
        val words = items.filter { it.kind == ItemKind.Word && it.form(root) != null }
        val pairs = rand.shuffled(LANGS.flatMapIndexed { i, a -> LANGS.drop(i + 1).map { b -> listOf(a, b) } })
        for (langs in pairs) {
            val targets = mutableListOf<ShiftTarget>()
            val seen = HashSet<String>()
            for (lang in langs) {
                val pool = rand.shuffled(words.filter { clean(it.form(lang), length) != null })
                for (w in pool) {
                    if (targets.count { it.lang == lang } >= PER_LANG) break
                    val f = clean(w.form(lang), length)!!
                    if (!seen.add(f)) continue
                    targets += ShiftTarget(lang, f, w.form(root)!!)
                }
            }
            if (targets.size < PER_LANG * 2) continue
            val columns = (0 until length).map { i -> rand.shuffled(targets.map { letters(it.form)[i] }.distinct()) }
            val valid = LinkedHashMap<String, List<String>>()
            for (w in words) for (lang in langs) {
                val f = clean(w.form(lang), length)
                if (f != null && spellable(f, columns)) valid[f] = ((valid[f] ?: emptyList()) + lang).distinct()
            }
            return ShiftBoard(date, langs, length, columns, targets, valid)
        }
        return null
    }
}
