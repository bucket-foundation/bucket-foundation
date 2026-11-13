package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals


class DeckRootTest {
    private val items = TestCorpus.corpus.items
    private val byId = TestCorpus.corpus.byId

    @Test
    fun decksStayOnEnglishUntilTheWebAcceptsARoot() {
        assertEquals("en", PlayDecks.root("es"))
        assertEquals("en", PlayDecks.root(null, webAcceptsRoot = true))
        assertEquals("es", PlayDecks.root("es", webAcceptsRoot = true))
    }

    @Test
    fun aSpanishRootGivesSpanishMeaningsInEveryDeck() {
        val shift = Shift.board(items, "2026-11-13", root = "es")!!
        val en = Shift.board(items, "2026-11-13")!!
        assertNotEquals(en.targets.map { it.meaning }, shift.targets.map { it.meaning })
        val tiles = FlagTilesRules.deck(items, "2026-11-13", root = "de")
        tiles.tiles.take(20).forEach { t -> assertEquals(byId.getValue(t.itemId).form("de"), t.meaning) }
        val atlas = Atlas.rounds(items, "2026-11-13", root = "fr")
        atlas.forEach { r -> assertEquals(byId.getValue(r.itemId).form("fr"), r.meaning) }
    }
}
