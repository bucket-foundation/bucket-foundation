package com.polingual.app.play

import kotlin.test.Test
import kotlin.test.assertEquals

class SharedTest {
    @Test
    fun boardsRankYouAmongGhosts() {
        val rows = Boards.fromGhosts(listOf(Ghost("Ana", "ES", "easy", 10), Ghost("Kai", "NZ", "hard", 30)), 20)
        assertEquals(listOf(30, 20, 10), rows.map { it.score })
        assertEquals("You", rows.single { it.me }.name)
    }

    @Test
    fun lookupMatchesBySlugOrFormIgnoringCase() {
        val w = PlayWord("dog", "dog", "dog", forms = listOf(PlayForm("es", "Perro")))
        assertEquals(w, PlayLookup.word(listOf(w), "es", "perro"))
        assertEquals(w, PlayLookup.word(listOf(w), "fr", "chien", slug = "dog"))
        assertEquals(null, PlayLookup.word(listOf(w), "fr", "chien"))
    }
}
