package foundation.bucket.core.engine

import foundation.bucket.core.model.Lang
import java.text.Normalizer

data class TranslateHit(val itemId: String, val matchedLang: String, val exact: Boolean)

enum class TranslateLayer { Deck, Word, Form, Roman, Phrase, Gloss }

data class TranslateAnswer(
    val layer: TranslateLayer,
    val source: String,
    val headword: String,
    val rows: Map<String, String>,
    val itemId: String? = null,
)

private val articles = mapOf(
    "es" to listOf("el", "la"), "fr" to listOf("le", "la"), "it" to listOf("il", "la"), "pt" to listOf("o", "a"),
    "de" to listOf("der", "die", "das"), "nl" to listOf("de", "het"),
)

fun foldForSearch(s: String): String = Normalizer.normalize(s.lowercase(), Normalizer.Form.NFD)
    .filter { Character.getType(it) != Character.NON_SPACING_MARK.toInt() }
    .trim { it.isWhitespace() || (!it.isLetterOrDigit() && Character.getType(it) != Character.MATH_SYMBOL.toInt()) }

fun translateSearch(corpus: LangCorpus, query: String, langs: Set<String>? = null, limit: Int = 8): List<TranslateHit> {
    val q = foldForSearch(query)
    if (q.isEmpty()) return emptyList()
    val buckets = List(3) { mutableListOf<TranslateHit>() }
    for (item in corpus.items) {
        var bestRank = 3
        var bestLang = ""
        for ((lang, form) in item.forms.toSortedMap()) {
            if (langs != null && lang !in langs) continue
            val f = foldForSearch(form)
            val parts = f.split(" ", limit = 2)
            val bare = if (parts.size == 2 && articles[lang]?.any { foldForSearch(it) == parts[0] } == true) parts[1] else f
            val rank = when {
                f == q || bare == q -> 0
                f.startsWith(q) || bare.startsWith(q) -> 1
                q.length >= 3 && q in f -> 2
                else -> 3
            }
            if (rank < bestRank) { bestRank = rank; bestLang = lang }
        }
        if (bestRank < 3) buckets[bestRank] += TranslateHit(item.id, bestLang, bestRank == 0)
    }
    val order = compareBy<TranslateHit>({ corpus.byId[it.itemId]?.tier ?: 99.0 }, { corpus.byId[it.itemId]?.form(it.matchedLang)?.length ?: 0 })
    return buckets.flatMap { it.sortedWith(order) }.take(limit)
}

fun translateSources(corpus: LangCorpus, mine: List<String>): List<String> {
    val present = corpus.items.flatMap { it.forms.keys }.toSet()
    return mine.filter { it in present } + Lang.codes.filter { it in present && it !in mine }
}

object TranslateEngine {
    fun answer(query: String, sources: List<String>, targets: List<String>, corpus: LangCorpus?, shelf: LexiconShelf): TranslateAnswer? {
        val q = query.trim()
        if (q.isEmpty()) return null
        if (corpus != null) {
            val hit = translateSearch(corpus, q, sources.toSet(), 1).firstOrNull()
            val item = hit?.takeIf { it.exact }?.let { corpus.byId[it.itemId] }
            if (hit != null && item != null) {
                val rows = linkedMapOf<String, String>()
                for (t in targets) if (t != hit.matchedLang) item.form(t)?.let { rows[t] = it }
                if (targets.any { it != hit.matchedLang && it !in rows }) {
                    lexical(q, listOf(hit.matchedLang), targets, shelf)?.rows?.forEach { (t, f) -> rows.putIfAbsent(t, f) }
                }
                if (rows.isNotEmpty()) return TranslateAnswer(TranslateLayer.Deck, hit.matchedLang, item.form(hit.matchedLang) ?: q, rows, item.id)
            }
        }
        lexical(q, sources, targets, shelf)?.let { return it }
        return gloss(q, sources, targets, shelf)
    }

    private fun lookup(q: String, source: String, shelf: LexiconShelf): Triple<LexMatch, List<LexEntry>, String>? {
        if (source == "en") {
            shelf.lexicon("en")?.lookup(q)?.let { return Triple(it.first, it.second, it.second.firstOrNull()?.word ?: q) }
            return Triple(LexMatch.Word, listOf(LexEntry(q, listOf(Lexicon.key(q)), null, null, null)), q)
        }
        val hit = shelf.lexicon(source)?.lookup(q) ?: return null
        return Triple(hit.first, hit.second, hit.second.firstOrNull()?.word ?: q)
    }

    private fun render(source: String, head: String, entries: List<LexEntry>, targets: List<String>, shelf: LexiconShelf): Map<String, String> {
        val rows = linkedMapOf<String, String>()
        val english = entries.flatMap { it.english }
        for (t in targets) {
            if (t == source) continue
            if (t == "en") {
                if (source != "en") entries.firstNotNullOfOrNull { it.meaning }?.let { rows[t] = it }
                continue
            }
            val lex = shelf.lexicon(t) ?: continue
            val pivots = if (source == "en") listOf(head) + english else english
            pivots.asSequence().map { lex.words(it) }.firstOrNull { it.isNotEmpty() }?.let { rows[t] = it.take(2).joinToString(", ") }
        }
        return rows
    }

    private fun lexical(q: String, sources: List<String>, targets: List<String>, shelf: LexiconShelf): TranslateAnswer? {
        var best: Pair<Int, TranslateAnswer>? = null
        for (source in sources) {
            val (match, entries, head) = lookup(q, source, shelf) ?: continue
            val first = entries.firstOrNull() ?: continue
            val rows = render(source, head, entries, targets, shelf)
            if (rows.isEmpty()) continue
            val multi = q.split(Regex("\\s+")).size > 1
            val layer = when {
                match == LexMatch.Roman -> TranslateLayer.Roman
                multi -> TranslateLayer.Phrase
                match == LexMatch.Word -> TranslateLayer.Word
                else -> TranslateLayer.Form
            }
            val rank = when (match) { LexMatch.Word -> 0; LexMatch.Form -> 1; LexMatch.Roman -> 2 }
            if (rank < (best?.first ?: 9)) best = rank to TranslateAnswer(layer, source, first.word, rows)
            if (rank == 0) break
        }
        return best?.second
    }

    private fun gloss(q: String, sources: List<String>, targets: List<String>, shelf: LexiconShelf): TranslateAnswer? {
        var best: Pair<Int, TranslateAnswer>? = null
        for (source in sources) {
            val toks = q.split(Regex("[\\s\\p{Punct}]+")).filter { it.isNotEmpty() }
            if (toks.size <= 1) continue
            val pieces = linkedMapOf<String, MutableList<String>>()
            var known = 0
            var i = 0
            while (i < toks.size) {
                var step = 1
                var rows: Map<String, String> = emptyMap()
                for (n in minOf(4, toks.size - i) downTo 1) {
                    val chunk = toks.subList(i, i + n).joinToString(if (source in setOf("ja", "zh", "th")) "" else " ")
                    val (_, entries, head) = lookup(chunk, source, shelf) ?: continue
                    val r = render(source, head, entries, targets, shelf)
                    if (r.isNotEmpty()) { rows = r; step = n; break }
                }
                if (rows.isNotEmpty()) known += step
                for (t in targets) if (t != source) pieces.getOrPut(t) { mutableListOf() } += rows[t]?.split(",", ";")?.first()?.trim() ?: toks.subList(i, i + step).joinToString(" ")
                i += step
            }
            if (known == 0) continue
            if (known > (best?.first ?: 0)) best = known to TranslateAnswer(TranslateLayer.Gloss, source, q, pieces.mapValues { it.value.joinToString(" ") })
        }
        return best?.second
    }
}
