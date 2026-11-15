package foundation.bucket.core.engine

data class Letter(val ch: String, val sound: String)
data class LetterPrompt(val lang: String, val ch: String, val sound: String, val choices: List<String>)

object DailyGames {
    const val SPEED_PAIRS = 15
    const val LETTER_ROUND = 8
    const val LETTER_SECONDS = 90

    private fun sorted(targets: List<String>) = targets.sorted().joinToString(",")

    fun speedDeck(deck: GameDeck, day: String, targets: List<String>): List<GameWord> {
        val rng = SeededRandom(GameSeed.hash("speed|$day|${deck.root}|${sorted(targets)}"))
        return GameWords.balanced(targets.flatMap { l -> mixed(deck.pool(l).take(200), rng).take(12).map { deck.word(it.itemId, l)!! } })
    }

    fun speedBoardSeed(day: String): ULong = GameSeed.hash("speed-board|$day")

    fun voicePrompts(deck: GameDeck, day: String, targets: List<String>, sameForm: (GameWord, String) -> Boolean): List<GamePrompt> {
        val rng = SeededRandom(GameSeed.hash("voice|$day|${deck.root}|${sorted(targets)}"))
        val words = targets.flatMap { l -> mixed(deck.pool(l).take(200), rng).take(6).map { deck.word(it.itemId, l)!! } }
        return GameRounds.flags(words, targets, PromptMode.Voice, sameForm = sameForm, rng = rng)
    }

    fun letterLang(day: String, targets: List<String>, alphabets: Map<String, List<Letter>>, heritage: List<String>): String? {
        val own = targets.sorted().filter { alphabets[it] != null }
        val pool = own.ifEmpty { heritage.filter { alphabets[it] != null }.sorted() }
        if (pool.isEmpty()) return null
        return pool[(GameSeed.hash("letters-lang|$day") % pool.size.toULong()).toInt()]
    }

    fun letters(day: String, targets: List<String>, alphabets: Map<String, List<Letter>>, heritage: List<String>): List<LetterPrompt> {
        val lang = letterLang(day, targets, alphabets, heritage) ?: return emptyList()
        val letters = alphabets.getValue(lang).filter { "◌" !in it.ch }
        val rng = SeededRandom(GameSeed.hash("letters|$day|$lang"))
        return mixed(letters, rng).take(LETTER_ROUND).map { l ->
            val foils = mixed(letters.filter { it.ch != l.ch && it.sound != l.sound }, rng).take(3).map { it.ch }
            LetterPrompt(lang, l.ch, l.sound, mixed(listOf(l.ch) + foils, rng))
        }
    }
}

class DailySpeed(private val deck: List<GameWord>, seed: ULong, slots: Int = 5) {
    sealed interface Outcome {
        data object Picked : Outcome
        data class Matched(val word: GameWord) : Outcome
        data class Missed(val word: GameWord) : Outcome
        data object Ignored : Outcome
    }

    private val rng = SeededRandom(seed)
    val meanings = MutableList<GameWord?>(slots) { null }
    val forms = MutableList<GameWord?>(slots) { null }
    var pickedMeaning: String? = null; private set
    var pickedForm: String? = null; private set
    var points = 0; private set
    var hits = 0; private set
    var combo = 0; private set
    var bestCombo = 0; private set
    val missed = mutableListOf<GameWord>()
    val seen = mutableListOf<GameWord>()
    private var next = 0

    init { refill(true) }

    val playable: Boolean get() = meanings.count { it != null } >= 3

    private fun held(): MutableList<GameWord> = (meanings + forms).filterNotNull().toMutableList()

    private fun draw(avoid: List<GameWord>): GameWord? {
        if (deck.isEmpty()) return null
        repeat(deck.size) {
            val w = deck[next % deck.size]
            next += 1
            val clash = avoid.any { h -> h.id == w.id || h.gloss.lowercase() == w.gloss.lowercase() || h.form.lowercase() == w.form.lowercase() }
            if (!clash) return w
        }
        return null
    }

    private fun refill(force: Boolean = false) {
        val open = meanings.indices.filter { meanings[it] == null }
        val live = meanings.size - open.size
        if (!force && open.size < 2 && live > 1) return
        val held = held()
        val fresh = mutableListOf<GameWord>()
        repeat(open.size) {
            val w = draw(held) ?: return@repeat
            held += w
            fresh += w
        }
        fresh.forEach { w -> if (seen.none { it.id == w.id }) seen += w }
        mixed(open, rng).forEachIndexed { n, i -> if (n < fresh.size) meanings[i] = fresh[n] }
        val gaps = forms.indices.filter { forms[it] == null }
        mixed(gaps, rng).forEachIndexed { n, i -> if (n < fresh.size) forms[i] = fresh[n] }
    }

    fun tapMeaning(id: String): Outcome {
        if (meanings.none { it?.id == id }) return Outcome.Ignored
        pickedMeaning = id
        return resolve()
    }

    fun tapForm(id: String): Outcome {
        if (forms.none { it?.id == id }) return Outcome.Ignored
        pickedForm = id
        return resolve()
    }

    private fun resolve(): Outcome {
        val m = pickedMeaning ?: return Outcome.Picked
        val f = pickedForm ?: return Outcome.Picked
        pickedMeaning = null
        pickedForm = null
        val word = meanings.firstOrNull { it?.id == m } ?: return Outcome.Ignored
        if (m != f) {
            combo = 0
            if (missed.none { it.id == m }) missed += word
            return Outcome.Missed(word)
        }
        hits += 1
        combo += 1
        bestCombo = maxOf(bestCombo, combo)
        points += if (combo >= HOT_COMBO) 2 else 1
        meanings[meanings.indexOfFirst { it?.id == m }] = null
        forms[forms.indexOfFirst { it?.id == m }] = null
        refill()
        return Outcome.Matched(word)
    }

    companion object {
        const val SECONDS = 60
        const val MISS_PENALTY = 2
        const val HOT_COMBO = 5
    }
}
