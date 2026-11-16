package foundation.bucket.core.engine

import foundation.bucket.core.model.Lang
import kotlinx.serialization.Serializable

@Serializable
data class GameWord(
    val itemId: String,
    val lang: String,
    val form: String,
    val gloss: String,
    val root: String,
    val rank: Int = GameWords.HELD_RANK,
) {
    val id: String get() = "$lang:$itemId"
}

object GameWords {
    const val MISSED_RANK = 0
    const val DUE_RANK = 1
    const val HELD_RANK = 2
    const val STARTER_RANK = 3

    fun starter(root: String, targets: List<String>, corpus: LangCorpus, perLang: Int = 12): List<GameWord> = targets.flatMap { l ->
        corpus.items.asSequence()
            .filter { it.kind == ItemKind.Word || it.kind == ItemKind.Phrase }
            .filter { usable(it, root, l) }
            .mapNotNull { i ->
                val f = i.form(l) ?: return@mapNotNull null
                val g = i.form(root) ?: i.gloss
                if (f == g) null else GameWord(i.id, l, f, g, root, STARTER_RANK)
            }
            .take(perLang).toList()
    }

    fun balanced(words: List<GameWord>): List<GameWord> {
        val langs = mutableListOf<String>()
        val queues = linkedMapOf<String, ArrayDeque<GameWord>>()
        for (w in words) {
            if (w.lang !in queues) langs += w.lang
            queues.getOrPut(w.lang) { ArrayDeque() }.addLast(w)
        }
        val turns = mutableListOf<GameWord>()
        while (turns.size < words.size) for (l in langs) queues[l]?.removeFirstOrNull()?.let(turns::add)
        return turns.withIndex().sortedWith(compareBy<IndexedValue<GameWord>> { minOf(it.value.rank, HELD_RANK) }.thenBy { it.index }).map { it.value }
    }
}

class GameDeck(corpus: LangCorpus, val root: String, val targets: List<String>) {
    data class Entry(val itemId: String, val form: String, val gloss: String, val category: String)

    private val pools: Map<String, List<Entry>>
    private val index: Map<String, Map<String, Entry>>

    init {
        val p = mutableMapOf<String, List<Entry>>()
        val ix = mutableMapOf<String, Map<String, Entry>>()
        for (l in targets) {
            val entries = corpus.items.filter { it.kind == ItemKind.Word && usable(it, root, l) }.mapNotNull { i ->
                val f = i.form(l)!!
                val g = i.form(root)!!
                if (f == g) null else Entry(i.id, f, g, i.category)
            }
            p[l] = entries
            val m = linkedMapOf<String, Entry>()
            for (e in entries) m.putIfAbsent(e.itemId, e)
            ix[l] = m
        }
        pools = p
        index = ix
    }

    fun pool(lang: String): List<Entry> = pools[lang].orEmpty()

    fun word(itemId: String, lang: String): GameWord? = index[lang]?.get(itemId)?.let { GameWord(it.itemId, lang, it.form, it.gloss, root) }

    fun foils(word: GameWord, also: List<String> = emptyList(), count: Int = 3, rng: SeededRandom): List<String> {
        val pool = pools[word.lang].orEmpty()
        val category = index[word.lang]?.get(word.itemId)?.category
        val form = word.form.lowercase()
        val gloss = word.gloss.lowercase()
        val size = word.form.length
        val first = word.form.firstOrNull()
        val close = pool.asSequence()
            .filter { it.gloss.lowercase() != gloss && it.form.lowercase() != form }
            .map { e -> ((if (e.category == category) 0 else 4) + minOf(3, kotlin.math.abs(e.form.length - size)) + (if (e.form.firstOrNull() == first) 0 else 1)) to e }
            .sortedWith(compareBy<Pair<Int, Entry>> { it.first }.thenBy { it.second.itemId })
            .take(16).map { it.second }.toList()
        val taken = (listOf(form) + also.map { it.lowercase() }).toMutableSet()
        val out = also.filter { it.lowercase() != form }.toMutableList()
        for (e in mixed(close, rng)) {
            if (out.size >= count) break
            if (taken.add(e.form.lowercase())) out += e.form
        }
        return out.take(count)
    }

    fun daily(count: Int, rng: SeededRandom): List<GameWord> {
        val langs = targets.sorted()
        if (langs.isEmpty()) return emptyList()
        val used = mutableSetOf<String>()
        val out = mutableListOf<GameWord>()
        var i = 0
        val common = langs.map { l -> mixed(pools[l].orEmpty().take(GameRounds.DAILY_POOL), rng) }
        val cursors = IntArray(langs.size)
        while (out.size < count && cursors.indices.any { cursors[it] < common[it].size }) {
            val k = i % langs.size
            i += 1
            while (cursors[k] < common[k].size) {
                val e = common[k][cursors[k]]
                cursors[k] += 1
                if (used.add(e.itemId)) {
                    out += GameWord(e.itemId, langs[k], e.form, e.gloss, root)
                    break
                }
            }
        }
        return out
    }

    fun shared(): List<String> = targets.firstOrNull()?.let { pools[it].orEmpty().map(Entry::itemId) }.orEmpty()
}

enum class PromptMode { Form, Flag, Voice }

data class GamePrompt(
    val id: Int,
    val mode: PromptMode,
    val word: GameWord,
    val choices: List<String>,
    val answer: String,
    val group: Int = 0,
)

object GameFamilies {
    private val groups = listOf(
        listOf("es", "pt", "it", "fr", "en", "de", "nl", "sv", "pl", "cs", "fi", "tr", "id", "vi", "la", "ang"),
        listOf("ru", "el", "grc"),
        listOf("ar", "fa", "he"),
        listOf("hi", "sa", "ta", "th"),
        listOf("ja", "zh", "ko"),
    )
    private val classical = setOf("la", "ang", "grc", "sa")

    fun family(lang: String) = groups.firstOrNull { lang in it } ?: listOf(lang)

    fun distractors(lang: String, own: List<String>, excluding: Set<String> = emptySet(), count: Int = 3, rng: SeededRandom): List<String> {
        val blocked = excluding + lang + (classical - own.toSet())
        val kin = family(lang).filter { it !in blocked }
        val near = mixed(kin.filter { it in own }, rng) + mixed(kin.filter { it !in own }, rng)
        if (near.size >= 2) return near.take(count)
        val far = mixed(own.filter { it !in blocked && it !in near }, rng) +
            mixed(Lang.codes.filter { it !in blocked && it !in near && it !in own }, rng)
        return (near + far).take(count)
    }
}

object GameRounds {
    const val DAILY_LENGTH = 6
    const val QUIZ_LENGTH = 10
    const val SAME_WORD_MEANINGS = 4
    const val SAME_WORD_LANGS = 3
    const val DAILY_POOL = 400

    private fun formPrompt(id: Int, word: GameWord, deck: GameDeck, also: List<String> = emptyList(), group: Int = 0, rng: SeededRandom): GamePrompt {
        val foils = deck.foils(word, also, rng = rng)
        return GamePrompt(id, PromptMode.Form, word, mixed(listOf(word.form) + foils, rng), word.form, group)
    }

    fun daily(deck: GameDeck, day: String): List<GamePrompt> {
        val rng = SeededRandom(GameSeed.daily(day, deck.root, deck.targets))
        return deck.daily(DAILY_LENGTH, rng).mapIndexed { i, w -> formPrompt(i, w, deck, rng = rng) }
    }

    fun sameWord(deck: GameDeck, words: List<GameWord>, rng: SeededRandom): List<GamePrompt> {
        val ids = LinkedHashSet<String>()
        words.filter { it.root == deck.root }.forEach { ids += it.itemId }
        deck.shared().forEach { ids += it }
        val out = mutableListOf<GamePrompt>()
        var group = 0
        for (id in ids) {
            if (group >= SAME_WORD_MEANINGS) break
            val family = deck.targets.mapNotNull { deck.word(id, it) }.take(SAME_WORD_LANGS)
            if (family.size < 2 || family.map { it.form }.toSet().size != family.size) continue
            for (w in family) {
                val other = family.firstOrNull { it.lang != w.lang }?.form
                out += formPrompt(out.size, w, deck, listOfNotNull(other), group, rng)
            }
            group += 1
        }
        return out
    }

    fun flags(words: List<GameWord>, own: List<String>, mode: PromptMode, count: Int = QUIZ_LENGTH, sameForm: (GameWord, String) -> Boolean = { _, _ -> false }, rng: SeededRandom): List<GamePrompt> {
        val seen = mutableSetOf<String>()
        val unique = GameWords.balanced(words).filter { seen.add(it.form.lowercase()) }
        return unique.take(count).mapIndexed { i, w ->
            val clash = Lang.codes.filter { sameForm(w, it) }.toSet()
            val wrong = GameFamilies.distractors(w.lang, own, clash, rng = rng)
            GamePrompt(i, mode, w, mixed(listOf(w.lang) + wrong, rng), w.lang)
        }
    }
}

class QuizRound(val prompts: List<GamePrompt>) {
    var index = 0
        private set
    val results = mutableListOf<Boolean>()
    var picked: String? = null
        private set

    val current: GamePrompt? get() = prompts.getOrNull(index)
    val finished: Boolean get() = index >= prompts.size
    val score: Int get() = results.count { it }

    fun answer(choice: String): Boolean? {
        val p = current ?: return null
        if (picked != null) return null
        picked = choice
        val ok = choice == p.answer
        results += ok
        return ok
    }

    fun advance() {
        if (picked == null) return
        picked = null
        index += 1
    }
}

class SpeedBoard(words: List<GameWord>, private val rng: SeededRandom, val columns: Int = 4) {
    sealed interface Outcome {
        data object Picked : Outcome
        data class Matched(val word: GameWord) : Outcome
        data class Missed(val word: GameWord) : Outcome
        data object Ignored : Outcome
    }

    private val deck = ArrayDeque(mixed(words.distinctBy { it.id }, rng))
    var held: List<GameWord> = emptyList()
        private set
    var meanings: List<GameWord> = emptyList()
        private set
    var forms: List<GameWord> = emptyList()
        private set
    var selectedMeaning: String? = null
        private set
    var selectedForm: String? = null
        private set
    var matched = 0
        private set
    var missed = 0
        private set
    var combo = 0
        private set
    var penalty = 0.0
        private set

    init { refill() }

    private fun refill() {
        var tries = deck.size
        while (held.size < columns && deck.isNotEmpty() && tries > 0) {
            tries -= 1
            val next = deck.removeFirst()
            if (held.none { it.gloss.equals(next.gloss, true) || it.form.equals(next.form, true) }) held = held + next else deck.addLast(next)
        }
        meanings = mixed(held, rng)
        forms = mixed(held, rng)
    }

    val done: Boolean get() = held.isEmpty()

    fun tapMeaning(id: String): Outcome { selectedMeaning = id; return resolve() }
    fun tapForm(id: String): Outcome { selectedForm = id; return resolve() }

    private fun resolve(): Outcome {
        val m = selectedMeaning ?: return Outcome.Picked
        val f = selectedForm ?: return Outcome.Picked
        selectedMeaning = null
        selectedForm = null
        val word = held.first { it.id == m }
        return if (m == f) {
            matched += 1
            combo += 1
            held = held.filterNot { it.id == m }
            refill()
            Outcome.Matched(word)
        } else {
            missed += 1
            combo = 0
            penalty += MISS_PENALTY
            Outcome.Missed(word)
        }
    }

    companion object {
        const val SECONDS = 60.0
        const val MISS_PENALTY = 2.0
        const val HOT_COMBO = 5
    }
}
