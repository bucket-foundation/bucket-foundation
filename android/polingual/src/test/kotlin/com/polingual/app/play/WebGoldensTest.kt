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
import kotlin.test.assertTrue

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
    fun sessionMixMatchesTheWeb() {
        val m = foundation.bucket.core.engine.SessionMix
        assertEquals(list("sessionMixSoundShare"), listOf(0, 39, 40, 149, 150, 500).map { m.soundShare(it).toString() })
        assertEquals(list("sessionMixMastery"), listOf(0.0, 16.0, 34.0, 200.0).map { "%.6f".format(java.util.Locale.ROOT, m.mastery(foundation.bucket.core.engine.CardState(reps = 1, intervalDays = it))) })
        val q = listOf(foundation.bucket.core.engine.QueueEntry("a", "es", foundation.bucket.core.engine.Stage.Intro), foundation.bucket.core.engine.QueueEntry("a", "es", foundation.bucket.core.engine.Stage.Check)) +
            listOf("b", "c", "d", "e").map { foundation.bucket.core.engine.QueueEntry(it, "es") } + listOf("f", "g").map { foundation.bucket.core.engine.QueueEntry(it, "fr") }
        assertEquals(list("sessionMixAlternate"), m.alternate(q).map { "${it.lang}:${it.itemId}:${it.stage.name.lowercase()}" })
        val f = foundation.bucket.core.engine.FrequencyRank.parse(mapOf("es" to File(TestCorpus.repo, "apple/Shared/Corpus/top1000/es.json").readText()))
        var card = foundation.bucket.core.engine.CardState()
        val ms = (1..8).map { card = foundation.bucket.core.engine.Scheduler.grade(card, true, 0); m.mastery(card) }
        val android = listOf(0.5, 0.8).map { bar -> ms.indexOfFirst { it >= bar } + 1 }
        assertEquals(listOf(4, 5), android)
        val web = list("sessionMixHistoryGates").map { it.substringAfter(':').toInt() }
        assertEquals(listOf(3, 3), web)
        assertTrue(android.zip(web).all { (a, w) -> a - w in 0..2 })
        assertEquals(list("sessionMixCurriculumEs"), m.curriculum(TestCorpus.corpus, "en", "es", f).take(40).map { "${it.id}:${f.rank(it, "es")}" })
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

class DayKeyGoldensTest {
    private val golden = kotlinx.serialization.json.Json.parseToJsonElement(javaClass.classLoader!!.getResource("web-goldens.json")!!.readText()).jsonObject
    private fun list(k: String) = golden.getValue(k).jsonArray.map { it.jsonPrimitive.content }
    private val items = TestCorpus.corpus.items

    @Test
    fun deckGamesUseTheUtcIsoDayLikeTheWebRoutes() {
        assertEquals("2027-01-05", com.polingual.app.deckDay(java.time.Instant.parse("2027-01-05T23:30:00Z")))
        assertEquals("2027-01-05", com.polingual.app.deckDay(java.time.Instant.parse("2027-01-05T00:10:00Z")))
        assertEquals(list("shift20270105"), Shift.board(items, "2027-01-05")!!.targets.map { "${it.lang}:${it.form}" })
        assertEquals(list("flagTiles20270105"), FlagTilesRules.deck(items, "2027-01-05").tiles.take(8).map { "${it.lang}:${it.form}" })
        assertEquals(list("atlas20270105"), Atlas.rounds(items, "2027-01-05").map { "${it.lang}:${it.itemId}" })
    }

    @Test
    fun polywordCountsLocalDaysForASingleDigitDate() {
        val bank: PolywordBank = PlayAssets.json.decodeFromString(java.io.File(TestCorpus.repo, "android/polingual/src/main/assets/play/polyword-bank.json").readText())
        val day = Polyword.dayNumber(java.time.LocalDate.of(2027, 1, 5))
        assertEquals(golden.getValue("polywordDay20270105").jsonPrimitive.content.toInt(), day)
        assertEquals(golden.getValue("polywordEs20270105").jsonPrimitive.content, Polyword.puzzleFor(bank, "es", day)!!.slug)
    }

    @Test
    fun dailyGamesUseTheUnpaddedLocalDay() = assertEquals("2027-1-5", com.polingual.app.dayKey(java.time.LocalDate.of(2027, 1, 5)))
}
