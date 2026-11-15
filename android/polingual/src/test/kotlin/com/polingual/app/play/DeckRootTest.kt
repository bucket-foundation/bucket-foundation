package com.polingual.app.play

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class DeckRootTest {
    private val items = TestCorpus.corpus.items
    private val golden = Json.parseToJsonElement(javaClass.classLoader!!.getResource("web-goldens.json")!!.readText()).jsonObject
    private fun list(k: String) = golden.getValue(k).jsonArray.map { it.jsonPrimitive.content }

    @Test
    fun deckRootMatchesTheWebAndFallsBackToEnglish() {
        assertEquals(list("deckRoots"), listOf("es", "de", "la", "xx", "EN", null).map { PlayDecks.root(it, items) })
    }

    @Test
    fun aSpanishRootShiftMatchesTheWeb() =
        assertEquals(list("shiftEs"), Shift.board(items, "2026-11-13", root = "es")!!.targets.map { "${it.lang}:${it.form}:${it.meaning}" })

    @Test
    fun aGermanRootFlagTilesDeckMatchesTheWeb() {
        val d = FlagTilesRules.deck(items, "2026-11-13", root = "de")
        assertEquals(list("flagTilesDe"), listOf(d.langs.joinToString(",")) + d.tiles.take(8).map { "${it.lang}:${it.form}:${it.meaning}" })
    }

    @Test
    fun aFrenchRootAtlasMatchesTheWeb() =
        assertEquals(list("atlasFr"), Atlas.rounds(items, "2026-11-13", root = "fr").map { "${it.lang}:${it.itemId}:${it.meaning}" })
}
