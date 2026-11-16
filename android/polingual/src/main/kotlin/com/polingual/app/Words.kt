package com.polingual.app

import foundation.bucket.core.data.AppState
import foundation.bucket.core.engine.GameDeck
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.GameWords
import foundation.bucket.core.engine.LangCorpus
import foundation.bucket.core.model.LangSystem

object GameWordPool {
    fun words(system: LangSystem, app: AppState, corpus: LangCorpus): List<GameWord> {
        val deck = GameDeck(corpus, system.root, system.targets)
        val state = app.study[system.id]
        val learned = state?.cards?.keys.orEmpty().mapNotNull { id ->
            val lang = id.substringBefore(':')
            if (lang !in system.targets) null else deck.word(id.substringAfter(':'), lang)?.let { w ->
                val c = state!!.cards.getValue(id)
                w.copy(rank = if (c.lapses > 0 && c.intervalDays == 0.0) GameWords.MISSED_RANK else if (c.due <= System.currentTimeMillis()) GameWords.DUE_RANK else GameWords.HELD_RANK)
            }
        }
        val seen = learned.map { it.id }.toSet()
        return learned + GameWords.starter(system.root, system.targets, corpus).filter { it.id !in seen }
    }

    fun sameForm(corpus: LangCorpus): (GameWord, String) -> Boolean = { w, lang -> corpus.byId[w.itemId]?.form(lang)?.equals(w.form, ignoreCase = true) == true }
}
