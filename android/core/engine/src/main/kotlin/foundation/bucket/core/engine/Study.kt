package foundation.bucket.core.engine

import kotlinx.serialization.Serializable

@Serializable
data class CardState(val reps: Int = 0, val lapses: Int = 0, val intervalDays: Double = 0.0, val due: Long = 0, val last: Long = 0)

@Serializable
data class StudyState(
    val cards: Map<String, CardState> = emptyMap(),
    val days: List<String> = emptyList(),
    val newToday: Map<String, Int> = emptyMap(),
    val newDay: String = "",
) {
    fun started(id: String) = cards[id]?.let { it.reps > 0 || it.lapses > 0 } ?: false

    val streak: Int get() = Streak.count(days)
}

object Streak {
    fun count(days: List<String>, today: String? = null): Int {
        if (days.isEmpty()) return 0
        val set = days.toSet()
        var d = java.time.LocalDate.parse(today ?: days.max())
        if (d.toString() !in set) d = d.minusDays(1)
        var n = 0
        while (d.toString() in set) { n += 1; d = d.minusDays(1) }
        return n
    }
}

enum class ExerciseKind { Recognize, Produce }

data class Exercise(val word: GameWord, val kind: ExerciseKind, val prompt: String, val answer: String, val options: List<String>, val isNew: Boolean)

object Scheduler {
    const val DAY_MS = 86_400_000L
    const val RELEARN_MS = 10 * 60_000L

    fun grade(state: CardState, correct: Boolean, now: Long): CardState = if (correct) {
        val interval = if (state.reps == 0) 1.0 else maxOf(1.0, state.intervalDays * (if (state.lapses > 2) 1.8 else 2.5))
        state.copy(reps = state.reps + 1, intervalDays = interval, due = now + (interval * DAY_MS).toLong(), last = now)
    } else {
        state.copy(lapses = state.lapses + 1, intervalDays = 0.0, due = now + RELEARN_MS, last = now)
    }
}

class StudySession(
    corpus: LangCorpus,
    private val root: String,
    private val targets: List<String>,
    state: StudyState,
    private val day: String,
    private val now: Long,
    private val rng: SeededRandom,
    newPerLang: Int = 5,
    maxReviews: Int = 30,
) {
    private val deck = GameDeck(corpus, root, targets)
    var state: StudyState = if (state.newDay == day) state else state.copy(newDay = day, newToday = emptyMap())
        private set
    private val queue = ArrayDeque<Exercise>()
    var answered = 0
        private set
    var correct = 0
        private set
    val total: Int

    init {
        val due = this.state.cards.filter { (id, c) -> c.due <= now && id.substringBefore(':') in targets }
            .entries.sortedBy { it.value.due }.take(maxReviews)
            .mapNotNull { (id, _) -> deck.word(id.substringAfter(':'), id.substringBefore(':')) }
        val fresh = targets.flatMap { l ->
            val left = newPerLang - (this.state.newToday[l] ?: 0)
            deck.pool(l).asSequence().filter { "$l:${it.itemId}" !in this.state.cards }.take(maxOf(0, left))
                .map { GameWord(it.itemId, l, it.form, it.gloss, root, GameWords.STARTER_RANK) }.toList()
        }
        val ordered = GameWords.balanced(due) + GameWords.balanced(fresh)
        ordered.forEach { queue.addLast(exercise(it, isNew = it.rank == GameWords.STARTER_RANK)) }
        total = queue.size
    }

    private fun exercise(w: GameWord, isNew: Boolean): Exercise {
        val produce = !isNew && rng.next() % 2uL == 0uL
        return if (produce) {
            Exercise(w, ExerciseKind.Produce, w.gloss, w.form, mixed(listOf(w.form) + deck.foils(w, rng = rng), rng), false)
        } else {
            val wrong = mixed(deck.pool(w.lang).filter { it.gloss != w.gloss }, rng).map { it.gloss }.distinct().take(3)
            Exercise(w, ExerciseKind.Recognize, w.form, w.gloss, mixed(listOf(w.gloss) + wrong, rng), isNew)
        }
    }

    val current: Exercise? get() = queue.firstOrNull()
    val finished: Boolean get() = queue.isEmpty()
    val remaining: Int get() = queue.size

    fun answer(choice: String): Boolean {
        val ex = queue.removeFirst()
        val ok = choice == ex.answer
        answered += 1
        if (ok) correct += 1
        val id = ex.word.id
        val prev = state.cards[id] ?: CardState()
        val graded = Scheduler.grade(prev, ok, now)
        val newCount = if (ex.isNew && id !in state.cards) mapOf(ex.word.lang to (state.newToday[ex.word.lang] ?: 0) + 1) else emptyMap()
        state = state.copy(
            cards = state.cards + (id to graded),
            newToday = state.newToday + newCount,
            days = if (day in state.days) state.days else (state.days + day).takeLast(400),
        )
        if (!ok) queue.addLast(exercise(ex.word.copy(rank = GameWords.MISSED_RANK), isNew = false))
        return ok
    }

    fun learnedWords(): List<GameWord> = state.cards.keys.mapNotNull { deck.word(it.substringAfter(':'), it.substringBefore(':')) }
}
