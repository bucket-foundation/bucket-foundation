package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class GamesTest {
    private val corpus = CorpusFixture.corpus
    private val deck = GameDeck(corpus, "en", listOf("fr", "es", "it"))

    @Test
    fun corpusLoadsWordsAndPhrases() {
        assertTrue(corpus.items.count { it.kind == ItemKind.Word } >= 200)
        assertTrue(corpus.items.any { it.kind == ItemKind.Phrase })
        assertEquals("eight", corpus.byId.getValue("eight").form("en"))
    }

    @Test
    fun dailySetIsSixPromptsAndStableForTheDay() {
        val a = GameRounds.daily(deck, "2026-11-12")
        val b = GameRounds.daily(GameDeck(corpus, "en", listOf("it", "es", "fr")), "2026-11-12")
        assertEquals(GameRounds.DAILY_LENGTH, a.size)
        assertEquals(a, b)
        a.forEach { p ->
            assertTrue(p.answer in p.choices)
            assertEquals(p.choices.size, p.choices.toSet().size)
            assertEquals(4, p.choices.size)
        }
        assertEquals(a.map { it.word.itemId }.size, a.map { it.word.itemId }.toSet().size)
    }

    @Test
    fun dailySetChangesByDay() {
        assertTrue(GameRounds.daily(deck, "2026-11-12") != GameRounds.daily(deck, "2026-11-13"))
    }

    @Test
    fun sameWordGroupsOneMeaningAcrossLanguages() {
        val prompts = GameRounds.sameWord(deck, emptyList(), SeededRandom(3uL))
        assertTrue(prompts.isNotEmpty())
        prompts.groupBy { it.group }.values.forEach { g -> assertEquals(1, g.map { it.word.itemId }.toSet().size) }
    }

    @Test
    fun flagsAskForTheLanguage() {
        val words = GameWords.starter("en", listOf("fr", "es", "it"), corpus)
        val prompts = GameRounds.flags(words, listOf("fr", "es", "it"), PromptMode.Flag, rng = SeededRandom(5uL))
        assertEquals(GameRounds.QUIZ_LENGTH, prompts.size)
        prompts.forEach { assertEquals(it.word.lang, it.answer); assertTrue(it.answer in it.choices) }
    }

    @Test
    fun quizRoundScores() {
        val round = QuizRound(GameRounds.daily(deck, "2026-11-12"))
        while (!round.finished) {
            val p = round.current!!
            round.answer(if (round.index % 2 == 0) p.answer else p.choices.first { it != p.answer })
            round.advance()
        }
        assertEquals(3, round.score)
    }

    @Test
    fun wordGroupsBuildsFourGroupsOfFour() {
        val words = GameWords.starter("en", listOf("fr", "es", "it", "de"), corpus, perLang = 60)
        val puzzle = assertNotNull(WordGroupsPuzzle.daily(words, "2026-11-12", "en", listOf("fr", "es", "it", "de"), theme = { corpus.byId[it.itemId]?.category }))
        assertEquals(4, puzzle.groups.size)
        assertEquals(16, puzzle.tiles.size)
        val round = WordGroupsRound(puzzle)
        puzzle.groups.forEach { g ->
            g.words.forEach { round.toggle(it.id) }
            assertTrue(round.submit() is WordGroupsRound.Outcome.Solved)
        }
        assertTrue(round.won)
    }

    @Test
    fun wordGroupsCountsOneAway() {
        val words = GameWords.starter("en", listOf("fr", "es", "it", "de"), corpus, perLang = 60)
        val puzzle = WordGroupsPuzzle.daily(words, "2026-11-12", "en", listOf("fr", "es", "it", "de"), theme = { corpus.byId[it.itemId]?.category })!!
        val round = WordGroupsRound(puzzle)
        (puzzle.groups[0].words.take(3) + puzzle.groups[1].words.take(1)).forEach { round.toggle(it.id) }
        assertEquals(WordGroupsRound.Outcome.OneAway, round.submit())
        assertEquals(3, round.mistakesLeft)
    }

    @Test
    fun miniCrosswordEntriesCross() {
        val words = GameWords.starter("en", listOf("es", "it"), corpus, perLang = 80)
        val mini = assertNotNull(MiniPuzzle.daily(words, "2026-11-12", "en", listOf("es", "it")))
        assertTrue(mini.entries.size >= 3)
        assertTrue(mini.rows <= MiniPuzzle.SIDE && mini.cols <= MiniPuzzle.SIDE)
        val answers = mini.answers
        mini.entries.forEach { e -> e.cells.zip(e.letters).forEach { (c, l) -> assertEquals(l, answers[c]) } }
        assertTrue(mini.entries.flatMap { it.letters }.all { it in mini.keys })
    }

    @Test
    fun speedBoardMatchesAndPenalizes() {
        val words = GameWords.starter("en", listOf("fr"), corpus, perLang = 20)
        val board = SpeedBoard(words, SeededRandom(2uL))
        val a = board.meanings[0]
        val other = board.forms.first { it.id != a.id }
        board.tapMeaning(a.id)
        assertTrue(board.tapForm(other.id) is SpeedBoard.Outcome.Missed)
        board.tapMeaning(a.id)
        assertTrue(board.tapForm(a.id) is SpeedBoard.Outcome.Matched)
        assertEquals(1, board.matched)
        assertEquals(SpeedBoard.MISS_PENALTY, board.penalty)
    }
}
