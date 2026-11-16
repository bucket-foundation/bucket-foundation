package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LexiconTest {
    @Test
    fun parsesEntriesLemmasAndEnglishIndex() {
        val lex = Lexicon("es", "casa\thouse|home\n=house\tcasa|hogar\ncasas\t>casa\n")
        assertEquals(LexMatch.Word, lex.lookup("Casa")?.first)
        assertEquals("casa", lex.lookup("casas")?.second?.single()?.word)
        assertEquals(listOf("casa", "hogar"), lex.words("house"))
        assertEquals(listOf("casa", "hogar"), lex.words("to house"))
    }

    @Test
    fun foldsAccents() {
        val lex = Lexicon("es", "canción\tsong\n")
        assertEquals(LexMatch.Form, lex.lookup("cancion")?.first)
        assertNull(lex.lookup(""))
    }

    @Test
    fun bundledLexiconInflates() {
        val es = assertNotNull(CorpusFixture.shelf.lexicon("es"))
        assertTrue(es.count > 1000)
        assertTrue(es.lookup("bien")!!.second.first().english.contains("well"))
    }

    @Test
    fun translatesDeckWordsAcrossTargets() {
        val answer = assertNotNull(TranslateEngine.answer("eight", listOf("en"), listOf("es", "fr"), CorpusFixture.corpus, CorpusFixture.shelf))
        assertEquals(TranslateLayer.Deck, answer.layer)
        assertEquals("ocho", answer.rows["es"])
        assertEquals("huit", answer.rows["fr"])
    }

    @Test
    fun translatesFromAnotherSourceThroughTheLexicon() {
        val answer = assertNotNull(TranslateEngine.answer("bien", listOf("es"), listOf("en", "fr"), null, CorpusFixture.shelf))
        assertTrue(answer.rows.getValue("en").contains("well"))
    }

    @Test
    fun searchRanksExactBeforePrefix() {
        val hits = translateSearch(CorpusFixture.corpus, "ocho", setOf("es"))
        assertEquals("eight", hits.first().itemId)
        assertTrue(hits.first().exact)
    }
}
