package com.polingual.app

import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.Exercise
import foundation.bucket.core.engine.ExerciseKind
import foundation.bucket.core.engine.ItemKind
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.engine.Scheduler
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.engine.usable
import foundation.bucket.core.model.Lang
import kotlin.math.ceil

data class Letter(val ch: String, val sound: String, val name: String? = null)

data class AlphabetUnit(val lang: String, val title: String, val letters: List<Letter>)

object Letters {
    const val BATCH = 5

    fun unit(lang: String): AlphabetUnit? {
        val raw = LetterData.raw[lang] ?: return null
        val letters = raw.split(" ").filter { it.isNotBlank() }.map { p ->
            val parts = p.split("=", limit = 2)
            val rest = parts.getOrElse(1) { "" }.split(":", limit = 2)
            Letter(parts[0], rest[0], rest.getOrNull(1)?.replace("_", " "))
        }
        return AlphabetUnit(lang, LetterData.titles[lang].orEmpty(), letters)
    }

    fun itemId(ch: String) = "abc:$ch"
    fun cardId(lang: String, ch: String) = "$lang:${itemId(ch)}"
    fun isBase(ch: String) = ch.none { it == '◌' || it.code in 0x30A0..0x30FF }

    private fun blocks(u: AlphabetUnit) = u.letters.filter { isBase(it.ch) } to u.letters.filterNot { isBase(it.ch) }

    fun blockDone(state: StudyState, lang: String, block: List<Letter>, share: Double = 0.8): Boolean {
        val seen = block.count { (state.cards[cardId(lang, it.ch)]?.reps ?: 0) > 0 }
        return seen >= ceil(block.size * share)
    }

    fun done(state: StudyState, lang: String): Boolean {
        val u = unit(lang) ?: return false
        val (core, extras) = blocks(u)
        return blockDone(state, lang, core) && blockDone(state, lang, extras)
    }

    fun next(state: StudyState, lang: String, n: Int = BATCH): List<Letter> {
        val u = unit(lang) ?: return emptyList()
        val fresh = { ls: List<Letter> -> ls.filter { cardId(lang, it.ch) !in state.cards } }
        val (core, extras) = blocks(u)
        val pool = if (blockDone(state, lang, core)) fresh(extras) + fresh(core) else fresh(core)
        return pool.take(n)
    }

    fun due(state: StudyState, lang: String, now: Long): List<Letter> =
        unit(lang)?.letters.orEmpty().filter { (state.cards[cardId(lang, it.ch)]?.due ?: Long.MAX_VALUE) <= now }

    fun queue(state: StudyState, lang: String, now: Long): List<Letter> = due(state, lang, now) + next(state, lang)

    fun question(lang: String, letter: Letter, unit: AlphabetUnit, rng: SeededRandom, hear: Boolean): Question {
        val others = rng.shuffled(unit.letters.filter { it.sound != letter.sound && it.ch != letter.ch })
        return if (hear) {
            val opts = rng.shuffled(listOf(letter.ch) + others.map { it.ch }.distinct().take(3))
            Question(QuestionKind.Sound, itemId(letter.ch), letter.sound, lang, letter.ch, lang, opts, speak = letter.ch.replace("◌", ""), speakLang = lang)
        } else {
            val opts = rng.shuffled(listOf(letter.sound) + others.map { it.sound }.distinct().take(3))
            Question(QuestionKind.Letter, itemId(letter.ch), letter.ch, lang, letter.sound, "en", opts, speak = letter.ch.replace("◌", ""), speakLang = lang, hint = letter.name)
        }
    }

    fun grade(state: StudyState, lang: String, ch: String, correct: Boolean, now: Long): StudyState {
        val id = cardId(lang, ch)
        return state.copy(cards = state.cards + (id to Scheduler.grade(state.cards[id] ?: CardState(), correct, now)))
    }
}

object SoundDrills {
    fun distance(a: String, b: String): Int {
        val d = IntArray(b.length + 1) { it }
        for (i in 1..a.length) {
            var prev = d[0]
            d[0] = i
            for (j in 1..b.length) {
                val t = d[j]
                d[j] = minOf(d[j] + 1, d[j - 1] + 1, prev + if (a[i - 1] == b[j - 1]) 0 else 1)
                prev = t
            }
        }
        return d[b.length]
    }

    fun pair(corpus: LangCorpus, root: String, lang: String, state: StudyState, rng: SeededRandom): Question? {
        val words = corpus.items.filter { it.kind == ItemKind.Word && usable(it, root, lang) }
        val known = words.filter { state.started("$lang:${it.id}") }.ifEmpty { words.filter { it.tier <= 2 } }
        val target = rng.element(known) ?: return null
        val form = target.form(lang)!!
        val near = words.asSequence().filter { it.id != target.id && it.form(lang) != form }
            .map { it.form(lang)!! }.distinct().sortedBy { distance(it.lowercase(), form.lowercase()) }.take(3).toList()
        if (near.size < 3) return null
        return Question(QuestionKind.Sound, target.id, form, lang, form, lang, rng.shuffled(listOf(form) + near), speak = form, speakLang = lang)
    }
}

object StudyMix {
    fun kindFor(reps: Int, speech: Boolean): QuestionKind? = when {
        reps < 2 -> null
        reps % 3 == 2 -> QuestionKind.Translate
        reps % 3 == 0 && speech -> QuestionKind.Listen
        else -> null
    }

    fun question(ex: Exercise, reps: Int, speech: Boolean, root: String): Question? {
        if (ex.isNew) return null
        val w = ex.word
        return when (kindFor(reps, speech)) {
            QuestionKind.Translate -> Question(QuestionKind.Translate, w.id, w.gloss, root, w.form, w.lang)
            QuestionKind.Listen -> {
                val opts = if (ex.kind == ExerciseKind.Recognize) ex.options else null
                opts?.let { Question(QuestionKind.Listen, w.id, "", w.lang, w.gloss, root, it, speak = w.form, speakLang = w.lang) }
            }
            else -> null
        }
    }

}
