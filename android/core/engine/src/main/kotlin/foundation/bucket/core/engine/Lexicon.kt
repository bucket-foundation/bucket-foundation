package foundation.bucket.core.engine

import foundation.bucket.core.model.Lang
import java.text.Normalizer
import java.util.zip.Inflater

data class LexEntry(val word: String, val english: List<String>, val gloss: String?, val lemma: String?, val roman: String?) {
    val meaning: String? get() = if (english.isNotEmpty()) english.take(3).joinToString("; ") else gloss
}

enum class LexMatch { Word, Form, Roman }

class Lexicon(val lang: String, tsv: String) {
    private val entries = mutableListOf<LexEntry>()
    private val exact = HashMap<String, MutableList<Int>>()
    private val loose = HashMap<String, MutableList<Int>>()
    private val fromEnglish = HashMap<String, MutableList<String>>()
    private val roman = HashMap<String, MutableList<Int>>()

    init {
        val marks = lang in foldsMarks
        for (line in tsv.split('\n')) {
            if (line.isEmpty()) continue
            val cols = line.split('\t')
            if (cols.size < 2 || cols[0].isEmpty()) continue
            if (cols[0].startsWith("=")) {
                fromEnglish.getOrPut(key(cols[0].drop(1))) { mutableListOf() } += cols[1].split('|').filter { it.isNotEmpty() }
                continue
            }
            val entry = if (cols[1].startsWith(">")) LexEntry(cols[0], emptyList(), null, cols[1].drop(1), null) else LexEntry(
                cols[0], cols[1].split('|').filter { it.isNotEmpty() },
                cols.getOrNull(2)?.takeIf { it.isNotEmpty() }, null, cols.getOrNull(3)?.takeIf { it.isNotEmpty() },
            )
            val i = entries.size
            entries += entry
            exact.getOrPut(key(entry.word)) { mutableListOf() } += i
            if (marks) loose.getOrPut(fold(entry.word)) { mutableListOf() } += i
            entry.roman?.split(',')?.forEach { roman.getOrPut(romanKey(it)) { mutableListOf() } += i }
        }
    }

    val count: Int get() = entries.size

    private fun resolve(ids: List<Int>): List<LexEntry> = ids.flatMap { i ->
        val e = entries[i]
        if (e.lemma != null) exact[key(e.lemma)].orEmpty().map { entries[it] }.filter { it.lemma == null } else listOf(e)
    }

    private fun stripped(k: String): List<String> {
        val rule = clitics[lang] ?: return emptyList()
        val out = mutableListOf<String>()
        val pres = listOf("") + rule.first.filter { k.startsWith(it) }
        val sufs = listOf("") + rule.second.filter { k.endsWith(it) }
        for (p in pres) for (s in sufs) {
            if (p.isEmpty() && s.isEmpty()) continue
            if (k.length - p.length - s.length < 2) continue
            val core = k.substring(p.length, k.length - s.length)
            out += core
            if (lang == "he" && s == "ות") out += core + "ה"
            if (lang == "ar" && s == "ات") out += core + "ة"
        }
        return out
    }

    fun lookup(query: String): Pair<LexMatch, List<LexEntry>>? {
        val k = key(query)
        if (k.isEmpty()) return null
        exact[k]?.let { ids ->
            val direct = ids.map { entries[it] }.filter { it.lemma == null }
            if (direct.isNotEmpty()) return LexMatch.Word to direct
            val via = resolve(ids)
            if (via.isNotEmpty()) return LexMatch.Form to via
        }
        if (lang in foldsMarks) loose[fold(query)]?.let { ids -> resolve(ids).takeIf { it.isNotEmpty() }?.let { return LexMatch.Form to it } }
        for (core in stripped(k)) exact[core]?.let { ids -> resolve(ids).takeIf { it.isNotEmpty() }?.let { return LexMatch.Form to it } }
        val latin = Lang.info[lang]?.latin ?: true
        if ((roman.isNotEmpty() || !latin) && query.all { it.code < 128 }) {
            val rk = romanKey(query.lowercase())
            if (rk.length >= 2) roman[rk]?.let { ids -> resolve(ids).takeIf { it.isNotEmpty() }?.let { return LexMatch.Roman to it } }
        }
        return null
    }

    fun words(forEnglish: String): List<String> {
        val k = key(forEnglish)
        fromEnglish[k]?.let { return it }
        if (k.startsWith("to ")) fromEnglish[k.drop(3)]?.let { return it }
        return emptyList()
    }

    companion object {
        val foldsMarks = setOf("en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "tr", "cs", "id", "vi", "la", "ang", "ru", "el", "grc", "ar", "he", "fa")

        private val clitics = mapOf(
            "ar" to (listOf("وبال", "وال", "بال", "فال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك", "س") to listOf("هما", "كما", "ها", "هم", "هن", "كم", "نا", "ني", "ه", "ك", "ي", "ات", "ون", "ين", "ة")),
            "he" to (listOf("וה", "שה", "וב", "ול", "ומ", "וש", "ה", "ו", "ב", "ל", "מ", "ש", "כ") to listOf("ים", "ות", "יך", "נו", "כם", "הם", "ה", "י", "ו")),
            "fa" to (listOf("نمی", "می", "ن", "ب") to listOf("هایی", "هایم", "های", "ها", "ترین", "تر", "ام", "ات", "اش", "ای", "ی", "م", "د", "ند", "یم", "ید")),
        )

        private fun trimmable(c: Char) = c.isWhitespace() || Character.getType(c).let {
            it == Character.CONNECTOR_PUNCTUATION.toInt() || it == Character.DASH_PUNCTUATION.toInt() || it == Character.START_PUNCTUATION.toInt() ||
                it == Character.END_PUNCTUATION.toInt() || it == Character.INITIAL_QUOTE_PUNCTUATION.toInt() || it == Character.FINAL_QUOTE_PUNCTUATION.toInt() ||
                it == Character.OTHER_PUNCTUATION.toInt() || it == Character.MATH_SYMBOL.toInt() || it == Character.CURRENCY_SYMBOL.toInt() ||
                it == Character.MODIFIER_SYMBOL.toInt() || it == Character.OTHER_SYMBOL.toInt()
        }

        fun key(s: String): String = s.lowercase().trim(::trimmable).replace("’", "'").replace("ς", "σ")

        fun fold(s: String): String = Normalizer.normalize(key(s), Normalizer.Form.NFD).filter { Character.getType(it) != Character.NON_SPACING_MARK.toInt() }

        fun romanKey(s: String): String = fold(s).filter { it.isLetter() }

        fun inflate(packed: ByteArray): String {
            val inflater = Inflater(true)
            inflater.setInput(packed)
            val out = java.io.ByteArrayOutputStream(packed.size * 4)
            val buf = ByteArray(64 * 1024)
            while (!inflater.finished()) {
                val n = inflater.inflate(buf)
                if (n == 0 && (inflater.needsInput() || inflater.needsDictionary())) break
                out.write(buf, 0, n)
            }
            inflater.end()
            return out.toString(Charsets.UTF_8.name())
        }
    }
}

class LexiconShelf(private val capacity: Int = 4, private val load: (String) -> ByteArray?) {
    private val cache = LinkedHashMap<String, Lexicon>()
    private val missing = mutableSetOf<String>()

    @Synchronized
    fun lexicon(lang: String): Lexicon? {
        cache.remove(lang)?.let { cache[lang] = it; return it }
        if (lang in missing) return null
        val packed = load(lang)
        if (packed == null) { missing += lang; return null }
        val lex = Lexicon(lang, Lexicon.inflate(packed))
        cache[lang] = lex
        while (cache.size > capacity) cache.remove(cache.keys.first())
        return lex
    }
}
