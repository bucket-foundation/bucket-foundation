package com.polingual.app.play

import java.text.Normalizer
import java.time.LocalDate
import java.time.temporal.ChronoUnit

enum class Mark(val rank: Int) { Miss(1), Near(2), Hit(3) }

data class Hint(val lang: String, val word: String, val roman: String? = null)

data class PolyPuzzle(val lang: String, val day: Int, val slug: String, val word: String, val answer: String, val gloss: String, val roman: String?, val hints: List<Hint>)

sealed interface GuessCheck {
    data class Ok(val guess: String) : GuessCheck
    data class Bad(val reason: String) : GuessCheck
}

data class PolyGame(val guesses: List<String>, val done: Boolean, val won: Boolean, val archive: Boolean = false)

data class PolyStats(val played: Int, val won: Int, val streak: Int, val best: Int, val dist: List<Int>)

object Polyword {
    const val MAX_GUESSES = 6
    val EPOCH: LocalDate = LocalDate.of(2026, 11, 1)
    private val LETTERS = Regex("^[a-z]*$")

    fun fold(raw: String): String = Normalizer.normalize(raw, Normalizer.Form.NFD).replace(Regex("\\p{M}"), "").lowercase()

    fun playable(word: String): Boolean = fold(word).let { Regex("^[a-z]+$").matches(it) && it.length in setOf(5, 6) }

    fun dayNumber(date: LocalDate): Int = ChronoUnit.DAYS.between(EPOCH, date).toInt() + 1

    fun dateOfDay(day: Int): LocalDate = EPOCH.plusDays((day - 1).toLong())

    fun hintsFor(forms: Map<String, HintForm>, lang: String, order: List<String>, count: Int = MAX_GUESSES - 1): List<Hint> =
        order.filter { it != lang && forms[it] != null }.take(count).map { l -> forms.getValue(l).let { Hint(l, it.word, it.roman) } }

    fun puzzleFor(bank: PolywordBank, lang: String, day: Int): PolyPuzzle? {
        val list = bank.langs[lang]
        if (list.isNullOrEmpty() || day < 1) return null
        val slug = list[(day - 1) % list.size]
        val entry = bank.words[slug] ?: return null
        val form = entry.forms[lang] ?: return null
        return PolyPuzzle(lang, day, slug, form.word, fold(form.word), entry.gloss, form.roman, hintsFor(entry.forms, lang, bank.reveal))
    }

    fun score(guess: String, answer: String): List<Mark> {
        val marks = MutableList(answer.length) { Mark.Miss }
        val left = HashMap<Char, Int>()
        for (i in answer.indices) {
            if (guess.getOrNull(i) == answer[i]) marks[i] = Mark.Hit else left[answer[i]] = (left[answer[i]] ?: 0) + 1
        }
        for (i in answer.indices) {
            if (marks[i] == Mark.Hit) continue
            val c = guess.getOrNull(i) ?: continue
            val n = left[c] ?: 0
            if (n > 0) { marks[i] = Mark.Near; left[c] = n - 1 }
        }
        return marks
    }

    fun keyMarks(guesses: List<String>, answer: String): Map<Char, Mark> {
        val out = HashMap<Char, Mark>()
        guesses.forEach { g -> score(g, answer).forEachIndexed { i, m -> val k = g[i]; if ((out[k]?.rank ?: 0) < m.rank) out[k] = m } }
        return out
    }

    fun checkGuess(raw: String, answer: String, previous: List<String>): GuessCheck {
        val guess = fold(raw.trim())
        if (!LETTERS.matches(guess)) return GuessCheck.Bad("letters")
        if (guess.length != answer.length) return GuessCheck.Bad("short")
        if (guess in previous) return GuessCheck.Bad("repeat")
        return GuessCheck.Ok(guess)
    }

    fun solved(guesses: List<String>, answer: String) = answer in guesses

    fun finished(guesses: List<String>, answer: String) = solved(guesses, answer) || guesses.size >= MAX_GUESSES

    fun revealedHints(hints: List<Hint>, answer: String, guesses: List<String>): List<Hint> =
        if (finished(guesses, answer)) hints else hints.take(guesses.count { it != answer })

    fun stats(games: Map<Int, PolyGame>, today: Int): PolyStats {
        val daily = games.filter { (_, g) -> g.done && !g.archive }
        val dist = MutableList(MAX_GUESSES) { 0 }
        var won = 0
        daily.values.filter { it.won }.forEach { won++; dist[minOf(it.guesses.size, MAX_GUESSES) - 1]++ }
        val wins = daily.filter { it.value.won }.keys
        var best = 0
        var run = 0
        wins.sorted().forEach { d -> run = if (d - 1 in wins) run + 1 else 1; best = maxOf(best, run) }
        var streak = 0
        var cursor = if (today in wins) today else if (games[today]?.done == true) 0 else today - 1
        while (cursor > 0 && cursor in wins) { streak++; cursor-- }
        return PolyStats(daily.size, won, streak, best, dist)
    }

    private val SQUARE = mapOf(Mark.Hit to "🟩", Mark.Near to "🟨", Mark.Miss to "⬜")

    fun shareText(lang: String, day: Int, answer: String, hints: List<Hint>, guesses: List<String>, url: String, flag: (String) -> String): String {
        val head = "Polyword ${flag(lang)} #$day ${if (solved(guesses, answer)) guesses.size else "X"}/$MAX_GUESSES"
        var miss = 0
        val rows = guesses.map { g ->
            val sq = score(g, answer).joinToString("") { SQUARE.getValue(it) }
            if (g == answer) sq else hints.getOrNull(miss++)?.let { "$sq ${flag(it.lang)}" } ?: sq
        }
        return (listOf(head, "") + rows + listOf("", url)).joinToString("\n")
    }
}
