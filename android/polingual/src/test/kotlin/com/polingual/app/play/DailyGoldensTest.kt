package com.polingual.app.play

import com.polingual.app.GameWordPool
import foundation.bucket.core.engine.DailyGames
import foundation.bucket.core.engine.DailySpeed
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GameRounds
import foundation.bucket.core.engine.GameWords
import foundation.bucket.core.engine.Letter
import foundation.bucket.core.engine.MiniPuzzle
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.WordGroupsPuzzle
import foundation.bucket.core.engine.GroupLink
import foundation.bucket.core.engine.GameSeed
import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class DailyGoldensTest {
    private val golden: JsonObject = Json.parseToJsonElement(javaClass.classLoader!!.getResource("daily-goldens.json")!!.readText()).jsonObject
    private val corpus = TestCorpus.corpus
    private val alpha = Json.parseToJsonElement(File(TestCorpus.repo, "android/polingual/src/main/assets/play/alphabets.json").readText()).jsonObject
    private val heritage = alpha.getValue("heritage").jsonArray.map { it.jsonPrimitive.content }
    private val letters = alpha.getValue("letters").jsonObject.mapValues { (_, v) -> v.jsonArray.map { o -> o.jsonObject.let { Letter(it.getValue("ch").jsonPrimitive.content, it.getValue("sound").jsonPrimitive.content) } } }
    private val cases = golden.keys.filter { '|' in it }

    private fun each(block: (List<String>, String, JsonObject) -> Unit) = cases.forEach { k ->
        val (t, day) = k.split('|')
        block(t.split(','), day, golden.getValue(k).jsonObject)
    }

    private fun JsonObject.s(k: String) = getValue(k).jsonPrimitive.content

    @Test
    fun rngMatchesTheWeb() {
        val rng = golden.getValue("rng").jsonObject
        val r = SeededRandom(4uL)
        assertEquals(rng.getValue("next").jsonArray.map { it.jsonPrimitive.content }, List(3) { r.next().toString() })
        assertEquals(rng.s("fnv"), GameSeed.hash("2026-11-12|en|es,fr").toString())
    }

    @Test
    fun dailySetMatchesTheWeb() = each { targets, day, g ->
        assertEquals(g.s("daily"), GameRounds.daily(GameDeck(corpus, "en", targets), day).joinToString(";") { p -> "${p.word.lang}:${p.word.itemId}:${p.choices.joinToString("/")}" })
    }

    @Test
    fun miniMatchesTheWeb() = each { targets, day, g ->
        val m = MiniPuzzle.daily(GameWords.starter("en", targets, corpus), day, "en", targets)
        assertEquals(g.s("mini"), "${m?.lang} ${m?.entries?.joinToString(";") { e -> "${e.number}${if (e.across) "a" else "d"}@${e.row},${e.col}:${e.letters.joinToString("")}" }} keys=${m?.keys?.joinToString("")}")
    }

    @Test
    fun wordGroupsMatchTheWeb() = each { targets, day, g ->
        val p = WordGroupsPuzzle.daily(GameWords.starter("en", targets, corpus, 60), day, "en", targets, theme = { corpus.byId[it.itemId]?.category }, sameForm = GameWordPool.sameForm(corpus))
        val desc = p?.groups?.joinToString(";") { x ->
            val head = when (val l = x.link) { is GroupLink.Theme -> l.theme; is GroupLink.Language -> l.lang; is GroupLink.LanguageTheme -> l.lang }
            val kind = when (val l = x.link) { is GroupLink.LanguageTheme -> l.theme; is GroupLink.Theme -> "theme"; is GroupLink.Language -> "language" }
            "$head/$kind=${x.words.joinToString(",") { it.itemId }}"
        }
        assertEquals(g.s("groups"), "$desc tiles=${p?.tiles?.joinToString(",") { it.itemId }}")
    }

    @Test
    fun speedMatchDealsAndPlaysLikeTheWeb() = each { targets, day, g ->
        val deck = DailyGames.speedDeck(GameDeck(corpus, "en", targets), day, targets)
        assertEquals(g.s("speedDeck"), deck.joinToString(",") { it.id })
        val s = DailySpeed(deck, DailyGames.speedBoardSeed(day))
        fun board() = "${s.meanings.joinToString(",") { it?.id ?: "-" }}/${s.forms.joinToString(",") { it?.id ?: "-" }}"
        val steps = mutableListOf(board())
        repeat(4) { n ->
            val first = s.meanings.firstNotNullOf { it }
            val other = s.forms.first { it != null && it.id != first.id }!!
            if (n == 1) { s.tapMeaning(first.id); s.tapForm(other.id) }
            s.tapMeaning(first.id); s.tapForm(first.id)
            steps += "${board()}|${s.points}|${s.missed.size}"
        }
        assertEquals(g.getValue("speedSteps").jsonArray.map { it.jsonPrimitive.content }, steps)
    }

    @Test
    fun whichVoiceMatchesTheWeb() = each { targets, day, g ->
        val prompts = DailyGames.voicePrompts(GameDeck(corpus, "en", targets), day, targets) { w, l -> l != w.lang && GameWordPool.sameForm(corpus)(w, l) }
        assertEquals(g.s("voice"), prompts.joinToString(";") { "${it.word.id}:${it.choices.joinToString("/")}" })
    }

    @Test
    fun letterSprintMatchesTheWeb() = each { targets, day, g ->
        assertEquals(g.s("lettersLang"), DailyGames.letterLang(day, targets, letters, heritage))
        assertEquals(g.s("letters"), DailyGames.letters(day, targets, letters, heritage).joinToString(";") { "${it.ch}=${it.sound}:${it.choices.joinToString("")}" })
    }
}
