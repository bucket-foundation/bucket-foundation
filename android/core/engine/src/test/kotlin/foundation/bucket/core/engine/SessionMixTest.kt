package foundation.bucket.core.engine

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SessionMixTest {
    private val corpus = CorpusFixture.corpus
    private fun freq(langs: List<String>) = FrequencyRank.parse(langs.associateWith { File(CorpusFixture.dir, "top1000/$it.json").readText() })
    private val masteredCard = CardState(reps = 8, intervalDays = 200.0)

    @Test
    fun curriculumFollowsTheTop1000Rank() {
        val f = freq(listOf("es"))
        val list = SessionMix.curriculum(corpus, "en", "es", f)
        val ranks = list.map { f.rank(it, "es") }
        assertEquals(ranks.sorted(), ranks)
        assertTrue(ranks.any { it < 1000 })
        assertTrue(list.any { it.kind == ItemKind.Phrase } && list.any { it.kind == ItemKind.Word })
        val ranked = list.first { f.ranks["es"]!![it.form("es")!!.lowercase()] != null }
        assertEquals(f.ranks["es"]!![ranked.form("es")!!.lowercase()], f.rank(ranked, "es"))
    }

    @Test
    fun masteryIsTrackedPerWordPhraseAndSentence() {
        val word = corpus.items.first { it.kind == ItemKind.Word && usable(it, "en", "es") }
        val phrase = corpus.items.first { it.kind == ItemKind.Phrase && usable(it, "en", "es") }
        var state = StudyState()
        assertEquals(CurriculumStage.Word, SessionMix.stage(word, state, "es"))
        val graded = Scheduler.grade(CardState(), true, 0)
        state = state.copy(cards = mapOf("es:${word.id}" to graded, "es:${phrase.id}" to graded, "es:${SessionMix.sentenceItemId("s1")}" to graded))
        val table = SessionMix.masteryTable(corpus, "en", state, "es")
        assertTrue(table.any { it.id == word.id && it.stage == CurriculumStage.Word && it.mastery > 0 })
        assertTrue(table.any { it.id == phrase.id && it.stage == CurriculumStage.Phrase && it.mastery > 0 })
        assertTrue(table.any { it.id == "sent:s1" && it.stage == CurriculumStage.Sentence && it.mastery > 0 })
        state = state.copy(cards = state.cards + ("es:${word.id}" to masteredCard))
        assertEquals(CurriculumStage.Sentence, SessionMix.stage(word, state, "es"))
    }

    @Test
    fun soundCapHoldsAcrossTheRealSessionBuilder() {
        val s = StudySession(corpus, "en", listOf("ru", "es", "fr"), StudyState(), "2026-11-12", 0, SeededRandom(7uL), heritage = setOf("ru"), freq = freq(listOf("ru", "es", "fr")))
        repeat(3) { while (!s.finished) s.answer(s.current!!.answer) }
        val later = StudySession(corpus, "en", listOf("ru", "es", "fr"), s.state, "2026-11-20", 8 * Scheduler.DAY_MS, SeededRandom(7uL), heritage = setOf("ru"), freq = freq(listOf("ru", "es", "fr")))
        assertTrue(later.tally.asked >= 10)
        assertTrue(later.tally.sounds <= SessionMix.soundShare(0) * later.tally.asked)
    }

    @Test
    fun tallyCountsAKeyOnce() {
        val t = SoundTally()
        t.record(ExerciseKind.Listen, "0")
        t.record(ExerciseKind.Listen, "0")
        assertEquals(1, t.asked)
        assertEquals(1, t.sounds)
    }

    @Test
    fun blockedSoundNeverYieldsSoundKinds() {
        for (reps in listOf(1, 2, 5)) for (latin in listOf(true, false)) for (k in 0 until 20) {
            val kind = ExercisePicker.kind(false, reps, false, latin, k / 20.0, heritage = true, sound = false)
            assertFalse(kind.needsSound)
        }
    }

    @Test
    fun openMixReproducesTheDefaultExercise() {
        for (reps in listOf(0, 1, 2, 5)) for (latin in listOf(true, false)) for (h in listOf(true, false)) for (k in 0 until 20) {
            assertEquals(ExercisePicker.kind(reps == 0, reps, false, latin, k / 20.0, h), ExercisePicker.kind(reps == 0, reps, false, latin, k / 20.0, h, sound = true))
        }
    }

    @Test
    fun alternateBreaksRunsAndKeepsOrderPerLanguage() {
        val q = (0 until 6).map { QueueEntry("a$it", "es") } + (0 until 6).map { QueueEntry("b$it", "fr") }
        val out = SessionMix.alternate(q)
        assertEquals(1, SessionMix.longestRun(out))
        assertEquals((0 until 6).map { "a$it" }, out.filter { it.lang == "es" }.map { it.itemId })
    }

    @Test
    fun sessionAlternates() {
        val s = StudySession(corpus, "en", listOf("fr", "es", "it"), StudyState(), "2026-11-12", 0, SeededRandom(1uL), freq = freq(listOf("fr", "es", "it")))
        val langs = mutableListOf<String>()
        while (!s.finished) { langs += s.current!!.word.lang; s.answer(s.current!!.answer) }
        assertEquals(15, langs.size)
        assertEquals(1, SessionMix.longestRun(langs) { it })
    }

    @Test
    fun comparisonsWaitForMastery() {
        val item = corpus.items.first { it.form("fr") != null && it.form("es") != null && it.form("en") != null }
        val match = listOf(QueueEntry(item.id, "fr", Stage.Match))
        var state = StudyState(cards = mapOf("fr:${item.id}" to masteredCard))
        assertTrue(SessionMix.gateComparisons(match, listOf("fr", "es"), corpus, state).isEmpty())
        state = state.copy(cards = state.cards + ("es:${item.id}" to masteredCard))
        assertEquals(match, SessionMix.gateComparisons(match, listOf("fr", "es"), corpus, state))
    }

    @Test
    fun falseFriendsOpenAtHalfMastery() {
        val card = CardState(reps = 3, intervalDays = 16.0)
        val m = SessionMix.mastery(card)
        assertTrue(m >= SessionMix.FALSE_FRIEND_BAR && m < SessionMix.MASTERY_BAR)
        val state = StudyState(cards = mapOf("fr:x" to card))
        assertTrue(SessionMix.mastered(state, "fr", "x", SessionMix.FALSE_FRIEND_BAR))
        assertFalse(SessionMix.mastered(StudyState(), "fr", "x", SessionMix.FALSE_FRIEND_BAR))
    }

    @Test
    fun sentenceCardsStayOutOfCounts() {
        val c = Scheduler.grade(CardState(), true, 0)
        val state = StudyState(cards = (0 until 70).associate { "es:${SessionMix.sentenceItemId("s$it")}" to c })
        assertTrue(SessionMix.isSentenceCard("es:sent:s1") && !SessionMix.isSentenceCard("es:w-1"))
        assertEquals(0, SessionMix.startedCount(state, listOf("es")))
    }

    @Test
    fun soundShareStepsAtFortyAndOneFifty() {
        assertEquals(listOf(0.1, 0.25, 0.25, 0.4), listOf(39, 40, 149, 150).map { SessionMix.soundShare(it) })
    }

    private fun capRun(started: Int, n: Int): String {
        val t = SoundTally()
        return (0 until n).joinToString("") { k ->
            val yes = SessionMix.soundAllowed(t, started)
            t.record(if (yes) ExerciseKind.Listen else ExerciseKind.Produce, "$k")
            if (yes) "T" else "F"
        }
    }

    @Test
    fun soundAllowedFollowsTheCapOverASequence() {
        assertEquals("FFFFFFFFFTFFFFFFFFFT", capRun(0, 20))
        assertEquals("FFFTFFFT", capRun(40, 8))
        assertEquals("FFTFTFFTFT", capRun(150, 10))
    }

    @Test
    fun masteryBarSitsBetween079And081() {
        val at = { m: Double -> StudyState(cards = mapOf("fr:x" to CardState(reps = 5, intervalDays = -21 * kotlin.math.ln(1 - m)), "es:x" to CardState(reps = 5, intervalDays = -21 * kotlin.math.ln(1 - m)))) }
        assertFalse(SessionMix.mastered(at(0.79), "fr", "x"))
        assertTrue(SessionMix.mastered(at(0.81), "fr", "x"))
        val item = corpus.items.first { it.form("fr") != null && it.form("es") != null }
        val match = listOf(QueueEntry(item.id, "fr", Stage.Match))
        val state = { m: Double -> StudyState(cards = listOf("fr", "es").associate { "$it:${item.id}" to CardState(reps = 5, intervalDays = -21 * kotlin.math.ln(1 - m)) }) }
        assertTrue(SessionMix.gateComparisons(match, listOf("fr", "es"), corpus, state(0.79)).isEmpty())
        assertEquals(match, SessionMix.gateComparisons(match, listOf("fr", "es"), corpus, state(0.81)))
    }

    @Test
    fun aForcedSoundRollIsCappedInTheRealSession() {
        val due = StudyState(cards = GameDeck(corpus, "en", listOf("fr")).pool("fr").take(20).associate { "fr:${it.itemId}" to CardState(reps = 2, intervalDays = 1.0) })
        val s = StudySession(corpus, "en", listOf("fr"), due, "2026-11-13", Scheduler.DAY_MS * 2, SeededRandom(1uL), newPerLang = 0, roll = { 0.0 })
        val kinds = generateSequence { s.current?.also { s.answer(it.answer) } }.map { it.kind }.toList()
        assertEquals(20, kinds.size)
        assertEquals(listOf(9, 19), kinds.withIndex().filter { it.value.needsSound }.map { it.index })
    }
}
