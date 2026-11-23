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

    fun balanced(words: List<GameWord>): List<GameWord> = Kernels.active.balanced(words)
}

class GameDeck(corpus: LangCorpus, val root: String, val targets: List<String>) {
    data class Entry(val itemId: String, val form: String, val gloss: String, val category: String)

    val pools: Map<String, List<Entry>>
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

    private val kernel: DeckKernel by lazy { Kernels.active.deck(this) }

    fun entry(itemId: String, lang: String): Entry? = index[lang]?.get(itemId)

    fun foils(word: GameWord, also: List<String> = emptyList(), count: Int = 3, rng: SeededRandom): List<String> = kernel.foils(word, also, count, rng)

    fun daily(count: Int, rng: SeededRandom): List<GameWord> = kernel.daily(count, rng)

    fun dailyRound(day: String): List<GamePrompt> = kernel.dailyRound(day)

    fun sameWordRound(words: List<GameWord>, rng: SeededRandom): List<GamePrompt> = kernel.sameWord(words, rng)

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
    fun family(lang: String) = groups.firstOrNull { lang in it } ?: listOf(lang)

    fun distractors(lang: String, own: List<String>, excluding: Set<String> = emptySet(), count: Int = 3, rng: SeededRandom): List<String> =
        Kernels.active.distractors(lang, own, excluding, count, rng)
}

object GameRounds {
    const val DAILY_LENGTH = 6
    const val QUIZ_LENGTH = 10
    const val SAME_WORD_MEANINGS = 4
    const val SAME_WORD_LANGS = 3
    const val DAILY_POOL = 400

    fun daily(deck: GameDeck, day: String): List<GamePrompt> = deck.dailyRound(day)

    fun sameWord(deck: GameDeck, words: List<GameWord>, rng: SeededRandom): List<GamePrompt> = deck.sameWordRound(words, rng)

    fun flags(words: List<GameWord>, own: List<String>, mode: PromptMode, count: Int = QUIZ_LENGTH, sameForm: (GameWord, String) -> Boolean = { _, _ -> false }, rng: SeededRandom): List<GamePrompt> =
        Kernels.active.flags(words, own, mode, count, sameForm, rng)
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
