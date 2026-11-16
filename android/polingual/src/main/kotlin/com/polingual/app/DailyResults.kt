package com.polingual.app

import foundation.bucket.core.engine.GamePrompt
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.LetterPrompt
import foundation.bucket.core.engine.MiniEntry
import foundation.bucket.core.engine.WordGroup

object DailyResults {
    private fun word(w: GameWord, right: Boolean) = DailyWord(w.lang, w.itemId, w.form, w.gloss, right)
    private fun bits(xs: List<Boolean>) = xs.joinToString("") { if (it) "1" else "0" }

    fun quiz(game: DailyGame, day: String, prompts: List<GamePrompt>, right: List<Boolean>, at: Long): DailyResult {
        val r = prompts.indices.map { right.getOrNull(it) == true }
        return DailyResult(game.wire, day, r.count { it }, prompts.size, bits(r), at, prompts.mapIndexed { k, q -> word(q.word, r[k]) })
    }

    fun mini(day: String, entries: List<MiniEntry>, right: List<Boolean>, at: Long): DailyResult =
        DailyResult(DailyGame.Mini.wire, day, right.count { it }, right.size, bits(right), at, entries.mapIndexed { i, e -> word(e.word, right.getOrNull(i) == true) })

    fun groups(day: String, groups: List<WordGroup>, solved: List<WordGroup>, pattern: String, at: Long): DailyResult =
        DailyResult(DailyGame.WordGroups.wire, day, solved.size, groups.size, pattern, at, groups.flatMap { g -> g.words.map { word(it, g in solved) } })

    fun speed(day: String, seen: List<GameWord>, missed: List<GameWord>, hits: Int, pairs: Int, at: Long): DailyResult {
        val miss = missed.map { it.id }.toSet()
        return DailyResult(DailyGame.SpeedMatch.wire, day, hits, pairs, "1".repeat(minOf(hits, pairs)).padEnd(pairs, '0'), at, seen.map { word(it, it.id !in miss) })
    }

    fun letters(day: String, prompts: List<LetterPrompt>, right: List<Boolean>, at: Long): DailyResult {
        val r = prompts.indices.map { right.getOrNull(it) == true }
        return DailyResult(DailyGame.LetterSprint.wire, day, r.count { it }, prompts.size, bits(r), at, prompts.mapIndexed { k, q -> DailyWord(q.lang, "abc:${q.ch}", q.ch, q.sound, r[k]) })
    }
}
