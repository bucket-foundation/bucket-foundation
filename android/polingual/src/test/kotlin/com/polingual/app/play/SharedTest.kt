package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals

class SharedTest {
    @Test
    fun boardsRankYouAmongGhosts() {
        val rows = Boards.fromGhosts(listOf(Ghost("Ana", "ES", "easy", 10), Ghost("Kai", "NZ", "hard", 30)), 20)
        assertEquals(listOf(30, 20, 10), rows.map { it.score })
        assertEquals("You", rows.single { it.me }.name)
    }

    @Test
    fun lookupMatchesBySlugOrFormIgnoringCase() {
        val w = PlayWord("dog", "dog", "dog", forms = listOf(PlayForm("es", "Perro")))
        assertEquals(w, PlayLookup.word(listOf(w), "es", "perro"))
        assertEquals(w, PlayLookup.word(listOf(w), "fr", "chien", slug = "dog"))
        assertEquals(null, PlayLookup.word(listOf(w), "fr", "chien"))
    }
}

class DealSeedsTest {
    @Test
    fun aSavedSeedRedealsTheSameDeckAfterRecreation() {
        val seed = DealSeeds.fresh { 0.25 }
        assertEquals("250000000001", seed)
        val items = TestCorpus.corpus.items
        assertEquals(ForeheadDeck.deck(items, listOf("es"), seed), ForeheadDeck.deck(items, listOf("es"), seed))
        assertEquals(Snakes.deck(items, "es", listOf("fr"), seed), Snakes.deck(items, "es", listOf("fr"), seed))
        assertEquals(ISpy.rounds(items, seed, "en", listOf("es"), 10), ISpy.rounds(items, seed, "en", listOf("es"), 10))
    }
}

class ForeheadRulesTest {
    @Test
    fun toggleAddsRemovesAndCapsAtSix() {
        assertEquals(listOf("es", "fr"), ForeheadRules.toggle(listOf("es"), "fr"))
        assertEquals(listOf("es"), ForeheadRules.toggle(listOf("es", "fr"), "fr"))
        val six = listOf("a", "b", "c", "d", "e", "f")
        assertEquals(six, ForeheadRules.toggle(six, "g"))
    }
}
