package com.polingual.app.play

import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangItem

data class FlagTile(val lang: String, val form: String, val meaning: String, val itemId: String)
data class FlagTilesDeck(val date: String, val langs: List<String>, val tiles: List<FlagTile>)
data class Ghost(val name: String, val flag: String, val skill: String, val score: Int)

enum class RunPhase { Ready, Running, Missed, Over }

data class RunState(val phase: RunPhase = RunPhase.Ready, val index: Int = 0, val score: Int = 0, val continued: Boolean = false, val missed: Int? = null, val picked: Int? = null)

sealed interface RunEvent {
    data object Start : RunEvent
    data class Tap(val lane: Int, val answer: Int) : RunEvent
    data object Timeout : RunEvent
    data object Continue : RunEvent
    data object End : RunEvent
}

object FlagTilesRules {
    const val LANES = 4
    const val DECK = 240
    const val STEP = 10
    const val FALL_START_MS = 3400
    const val FALL_MIN_MS = 1100
    const val FALL_FACTOR = 0.88
    val POOL = listOf("es", "fr", "de", "it", "pt", "nl", "sv", "ja", "zh", "ko", "ru", "ar", "hi", "el", "tr")

    fun step(s: RunState, e: RunEvent): RunState = when {
        e is RunEvent.Start -> RunState(phase = RunPhase.Running)
        e is RunEvent.Tap && s.phase == RunPhase.Running ->
            if (e.lane == e.answer) s.copy(index = s.index + 1, score = s.score + 1) else s.copy(phase = RunPhase.Missed, missed = s.index, picked = e.lane)
        e is RunEvent.Timeout && s.phase == RunPhase.Running -> s.copy(phase = RunPhase.Missed, missed = s.index, picked = null)
        e is RunEvent.Continue && s.phase == RunPhase.Missed && !s.continued -> s.copy(phase = RunPhase.Running, continued = true, index = s.index + 1, picked = null)
        e is RunEvent.End && s.phase == RunPhase.Missed -> s.copy(phase = RunPhase.Over)
        else -> s
    }

    fun fallMs(index: Int): Int = maxOf(FALL_MIN_MS, Math.round(FALL_START_MS * Math.pow(FALL_FACTOR, (index / STEP).toDouble())).toInt())

    fun deck(items: List<LangItem>, date: String, root: String = PlayDecks.ROOT): FlagTilesDeck {
        val rand = WebRandom(WebRandom.seedOf("flag-tiles:$date"))
        val words = items.filter { it.kind == ItemKind.Word && it.form(root) != null }
        val usable = POOL.filter { l -> words.count { it.form(l) != null } >= 40 }
        val langs = rand.shuffled(usable).take(LANES).sorted()
        val tiles = mutableListOf<FlagTile>()
        val seen = HashSet<String>()
        for (item in rand.shuffled(words.take(3000))) {
            if (tiles.size >= DECK) break
            val options = langs.filter { l -> val f = item.form(l); f != null && f != item.form(root) && langs.all { o -> o == l || item.form(o) != f } }
            if (options.isEmpty()) continue
            val lang = options[rand.below(options.size)]
            val form = item.form(lang)!!
            val key = "$lang:$form"
            if (key in seen || form.length > 24) continue
            seen += key
            tiles += FlagTile(lang, form, item.form(root)!!, item.id)
        }
        return FlagTilesDeck(date, langs, tiles)
    }

    fun ghosts(date: String, count: Int = 5): List<Ghost> {
        val span = mapOf("easy" to (6 to 18), "medium" to (14 to 34), "hard" to (28 to 60))
        return Bots.all.sortedBy { WebRandom.unit("ghost:$date:${it.userId}") }.take(count).map { b ->
            val (lo, hi) = span.getValue(b.skill)
            Ghost(b.name, b.flag, b.skill, lo + kotlin.math.floor(WebRandom.unit("ghost-score:$date:${b.userId}") * (hi - lo + 1)).toInt())
        }.sortedByDescending { it.score }
    }
}
