package foundation.bucket.app

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.Scheduler
import foundation.bucket.core.model.Atom
import foundation.bucket.core.model.Deck
import kotlinx.serialization.Serializable

@Serializable
data class ScienceState(val cards: Map<String, CardState> = emptyMap(), val days: List<String> = emptyList(), val newToday: Int = 0, val newDay: String = "")

data class StudyCard(val deckId: String, val atom: Atom, val prompt: String, val answer: String, val isNew: Boolean) {
    val id: String get() = "$deckId:${atom.id}"
}

object ScienceStudy {
    const val NEW_PER_DAY = 5

    fun queue(decks: Map<String, Deck>, state: ScienceState, day: String, now: Long, maxReviews: Int = 30): List<StudyCard> {
        val newLeft = if (state.newDay == day) NEW_PER_DAY - state.newToday else NEW_PER_DAY
        val all = decks.flatMap { (id, d) -> d.atoms.filter(::studyable).map { id to it } }
        val due = all.filter { (id, a) -> state.cards["$id:${a.id}"]?.let { it.due <= now } == true }
            .sortedBy { (id, a) -> state.cards.getValue("$id:${a.id}").due }.take(maxReviews)
        val fresh = all.filter { (id, a) -> "$id:${a.id}" !in state.cards }
            .filter { (id, a) -> a.requires.all { r -> state.cards["$id:$r"]?.reps?.let { it > 0 } ?: decks[id]?.atoms?.firstOrNull { it.id == r }?.let { !studyable(it) } ?: true } }
            .take(maxOf(0, newLeft))
        return due.map { (id, a) -> card(id, a, false) } + fresh.map { (id, a) -> card(id, a, true) }
    }

    fun studyable(a: Atom) = a.quiz.isNotEmpty() || a.summary.isNotBlank()

    private fun card(deckId: String, atom: Atom, isNew: Boolean): StudyCard {
        val q = atom.quiz.firstOrNull { it.level == "recall" } ?: atom.quiz.firstOrNull()
        return if (q != null) StudyCard(deckId, atom, q.prompt, q.answer, isNew) else StudyCard(deckId, atom, "What is ${atom.title}?", atom.summary, isNew)
    }

    fun grade(state: ScienceState, card: StudyCard, correct: Boolean, day: String, now: Long): ScienceState {
        val prev = state.cards[card.id] ?: CardState()
        val sameDay = state.newDay == day
        val newCount = (if (sameDay) state.newToday else 0) + if (card.isNew && card.id !in state.cards) 1 else 0
        return state.copy(
            cards = state.cards + (card.id to Scheduler.grade(prev, correct, now)),
            days = if (day in state.days) state.days else (state.days + day).takeLast(400),
            newToday = newCount,
            newDay = day,
        )
    }
}
