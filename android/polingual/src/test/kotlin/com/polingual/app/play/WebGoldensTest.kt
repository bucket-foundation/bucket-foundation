package com.polingual.app.play

import java.io.File
import java.security.MessageDigest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class WebGoldensTest {
    private val golden: JsonObject = Json.parseToJsonElement(javaClass.classLoader!!.getResource("web-goldens.json")!!.readText()).jsonObject
    private fun list(k: String) = golden.getValue(k).jsonArray.map { it.jsonPrimitive.content }
    private fun str(k: String) = golden.getValue(k).jsonPrimitive.content
    private val meanings = listOf("dog", "cat", "sun", "sea", "tree").map { m -> Meaning(m, m, mapOf("es" to "$m-es", "fr" to "$m-fr", "de" to "$m-de")) }
    private fun deal(seed: Int) = XorRng(seed).let { Dealer(meanings, listOf("es", "fr", "de"), it::next) }

    @Test
    fun babelDealsMatchTheWeb() {
        assertEquals(list("babelFresh7"), Babel.fresh(deal(7)).map { "${it.meaning}:${it.lang}" })
        assertEquals(list("babelPlayable42"), Babel.playable(deal(42)).map { "${it.key}:${it.meaning}:${it.lang}" })
        assertEquals(list("babelMeanings"), Babel.meanings(TestCorpus.corpus.items, listOf("es", "fr", "it"), 3).map { it.id })
    }

    @Test
    fun shiftBoardMatchesTheWeb() {
        val b = Shift.board(TestCorpus.corpus.items, "2026-11-13")!!
        assertEquals(list("shiftLangs"), b.langs)
        assertEquals(list("shiftColumns"), b.columns.map { it.joinToString("") })
        assertEquals(list("shiftTargets"), b.targets.map { "${it.lang}:${it.form}:${it.meaning}" })
    }

    @Test
    fun flagTilesDeckMatchesTheWeb() {
        val d = FlagTilesRules.deck(TestCorpus.corpus.items, "2026-11-13")
        assertEquals(list("flagTilesLangs"), d.langs)
        assertEquals(list("flagTilesFirst"), d.tiles.take(8).map { "${it.lang}:${it.form}" })
    }

    @Test
    fun polywordBankMatchesTheWebHash() {
        val bank: PolywordBank = PlayAssets.json.decodeFromString(File(TestCorpus.repo, "android/polingual/src/main/assets/play/polyword-bank.json").readText())
        val canon = bank.langs.keys.sorted().joinToString(";") { k -> "$k=${bank.langs.getValue(k).joinToString(",")}" }
        val sha = MessageDigest.getInstance("SHA-256").digest(canon.toByteArray()).joinToString("") { "%02x".format(it) }
        assertEquals(str("polywordBankSha256"), sha)
        assertEquals(str("polywordEs13"), Polyword.puzzleFor(bank, "es", 13)!!.slug)
        assertEquals(str("polywordFr40"), Polyword.puzzleFor(bank, "fr", 40)!!.slug)
    }
}
