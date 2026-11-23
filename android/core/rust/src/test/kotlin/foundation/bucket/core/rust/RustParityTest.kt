package foundation.bucket.core.rust

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.CorpusLoader
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.KotlinKernel
import foundation.bucket.core.engine.PromptMode
import foundation.bucket.core.engine.SeededRandom
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class RustParityTest {
    private val dir = File(System.getProperty("corpusDir"))
    private fun read(name: String) = File(dir, name).takeIf { it.exists() }?.readText()
    private val corpus = CorpusLoader.parse(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"))
    private val targets = listOf("es", "pt", "it", "nl")
    private val deck = GameDeck(corpus, "en", targets)
    private val rust = assertNotNull(RustKernel.load())
    private val words = targets.flatMap { l -> deck.pool(l).mapIndexed { i, e -> GameWord(e.itemId, l, e.form, e.gloss, "en", i % 4) } }
    private val sameForm: (GameWord, String) -> Boolean = { w, l -> l != w.lang && deck.word(w.itemId, l)?.form?.lowercase() == w.form.lowercase() }
    private val theme: (GameWord) -> String? = { w -> deck.entry(w.itemId, w.lang)?.category }

    @Test
    fun scalarRulesMatch() {
        var c = CardState()
        for ((i, ok) in listOf(true, false, true, true, false, true).withIndex()) {
            val now = 1_700_000_000_000L + i * 9_000_000L
            assertEquals(KotlinKernel.grade(c, ok, now), rust.grade(c, ok, now))
            c = KotlinKernel.grade(c, ok, now)
        }
        val days = listOf("2026-11-20", "2026-11-21", "2026-11-23")
        assertEquals(KotlinKernel.streak(days, null), rust.streak(days, null))
        assertEquals(KotlinKernel.streak(days, "2026-11-22"), rust.streak(days, "2026-11-22"))
    }

    @Test
    fun gamesMatchAndCarryRngState() {
        val kd = KotlinKernel.deck(deck)
        val rd = rust.deck(deck)
        for (day in listOf("2026-11-23", "2026-12-25")) assertEquals(kd.dailyRound(day), rd.dailyRound(day))
        val a = SeededRandom(5uL)
        val b = SeededRandom(5uL)
        assertEquals(kd.sameWord(words.take(40), a), rd.sameWord(words.take(40), b))
        assertEquals(a.state, b.state)
        assertEquals(KotlinKernel.flags(words, targets, PromptMode.Voice, 10, sameForm, a), rust.flags(words, targets, PromptMode.Voice, 10, sameForm, b))
        assertEquals(a.state, b.state)
        assertEquals(KotlinKernel.balanced(words), rust.balanced(words))
    }

    @Test
    fun puzzlesMatch() {
        for (day in listOf("2026-11-23", "2026-12-25", "2027-01-09")) {
            assertEquals(KotlinKernel.wordGroups(words, day, "en", targets, theme, sameForm), rust.wordGroups(words, day, "en", targets, theme, sameForm))
            assertEquals(KotlinKernel.mini(words, day, "en", targets), rust.mini(words, day, "en", targets))
        }
    }
}
