package com.polingual.app

import foundation.bucket.core.model.LobbyPrompt
import foundation.bucket.core.model.LobbyPromptMode
import kotlin.test.Test
import kotlin.test.assertEquals

class ResultLineTest {
    @Test
    fun tilesResultsListTheRightWordsInsteadOfIndices() {
        val p = LobbyPrompt(0, LobbyPromptMode.Tiles, null, "cloud", listOf("sv:björn", "el:νέφος", "de:Wolke"), "1,2")
        assertEquals("cloud: νέφος, Wolke", resultLine(p))
    }

    @Test
    fun formAndFlagLinesKeepTheirShape() {
        assertEquals("ocho: eight", resultLine(LobbyPrompt(0, LobbyPromptMode.Form, "es", "eight", listOf("ocho"), "ocho")))
        assertEquals("perro: Spanish", resultLine(LobbyPrompt(0, LobbyPromptMode.Flag, null, "perro", listOf("es"), "es")))
    }
}
