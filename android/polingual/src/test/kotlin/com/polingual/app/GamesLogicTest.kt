package com.polingual.app

import foundation.bucket.core.data.AppState
import foundation.bucket.core.engine.CardState
import foundation.bucket.core.engine.CorpusLoader
import foundation.bucket.core.engine.GameWord
import foundation.bucket.core.engine.GameWords
import foundation.bucket.core.engine.SeededRandom
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GamesLogicTest {
    private val corpus by lazy {
        val dir = File("../../apple/Shared/Corpus")
        CorpusLoader.parse(File(dir, "lang-core.json").readText(), File(dir, "lang-cognates.json").readText(), File(dir, "lang-phrases.json").readText(), File(dir, "lang-layers.json").readText())
    }

    @Test
    fun gamePoolPutsStudiedWordsFirstWithMissRanks() {
        val system = LangSystem("s", "Romance", "en", listOf("fr"), 0.0)
        val study = StudyState(cards = mapOf("fr:eight" to CardState(lapses = 1, intervalDays = 0.0, due = Long.MAX_VALUE)))
        val words = GameWordPool.words(system, AppState(study = mapOf("s" to study)), corpus)
        assertEquals("eight", words.first().itemId)
        assertEquals(GameWords.MISSED_RANK, words.first().rank)
        assertEquals(1, words.count { it.itemId == "eight" })
    }
}
