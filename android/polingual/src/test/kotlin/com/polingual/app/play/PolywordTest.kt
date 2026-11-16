package com.polingual.app.play

import com.polingual.app.play.Mark.Hit
import com.polingual.app.play.Mark.Miss
import com.polingual.app.play.Mark.Near
import java.io.File
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PolywordTest {
    private val bank: PolywordBank = PlayAssets.json.decodeFromString(
        generateSequence(File("").absoluteFile) { it.parentFile }.map { File(it, "polingual/src/main/assets/play/polyword-bank.json") }.first { it.exists() }.readText(),
    )

    @Test
    fun foldStripsAccents() {
        assertEquals("arbol", Polyword.fold("Árbol"))
        assertEquals("nino", Polyword.fold("niño"))
        assertEquals("große", Polyword.fold("Größe"))
        assertFalse(Polyword.playable("Größe"))
        assertTrue(Polyword.playable("perro"))
        assertFalse(Polyword.playable("sol"))
    }

    @Test
    fun everyTargetHasAMonthOfPlayableWords() {
        bank.targets.forEach { lang ->
            val list = bank.langs.getValue(lang)
            assertTrue(list.size >= 30, lang)
            list.forEach { assertTrue(Polyword.playable(bank.words.getValue(it).forms.getValue(lang).word)) }
            assertEquals(list.size, list.map { Polyword.fold(bank.words.getValue(it).forms.getValue(lang).word) }.toSet().size)
        }
    }

    @Test
    fun dayNumbersCountFromNovemberFirst() {
        assertEquals(1, Polyword.dayNumber(LocalDate.of(2026, 11, 1)))
        assertEquals(13, Polyword.dayNumber(LocalDate.of(2026, 11, 13)))
        assertEquals(62, Polyword.dayNumber(LocalDate.of(2027, 1, 1)))
        assertEquals(LocalDate.of(2026, 11, 13), Polyword.dateOfDay(13))
    }

    @Test
    fun puzzleIsStablePerDay() {
        val a = Polyword.puzzleFor(bank, "es", 13)!!
        assertEquals(a, Polyword.puzzleFor(bank, "es", 13))
        assertNotEquals(a.slug, Polyword.puzzleFor(bank, "es", 14)!!.slug)
        assertEquals(Polyword.fold(a.word), a.answer)
        assertTrue(a.hints.size in 3..5)
        assertEquals("en", a.hints[0].lang)
        assertTrue(a.hints.none { it.lang == "es" })
        assertNull(Polyword.puzzleFor(bank, "es", 0))
        assertNull(Polyword.puzzleFor(bank, "xx", 3))
        assertEquals("es", Polyword.puzzleFor(bank, "en", 5)!!.hints[0].lang)
    }

    @Test
    fun scoreFollowsWordleRules() {
        assertEquals(listOf(Hit, Hit, Hit, Hit, Hit), Polyword.score("perro", "perro"))
        assertEquals(listOf(Near, Near, Near, Hit, Miss), Polyword.score("opera", "perro"))
        assertEquals(listOf(Near, Near, Miss, Miss, Miss), Polyword.score("rrxxx", "perro"))
        assertEquals(listOf(Near, Miss, Hit, Hit, Miss), Polyword.score("errrr", "perro"))
        assertEquals(listOf(Miss, Hit, Miss, Miss, Miss), Polyword.score("aabbb", "xaxxx"))
    }

    @Test
    fun keyMarksKeepTheBest() {
        val k = Polyword.keyMarks(listOf("opera", "perro"), "perro")
        assertEquals(Hit, k['p'])
        assertEquals(Miss, k['a'])
        assertEquals(Near, Polyword.keyMarks(listOf("rrxxx"), "perro")['r'])
    }

    @Test
    fun guessesFoldAndReject() {
        assertEquals(GuessCheck.Ok("arbol"), Polyword.checkGuess("Árbol", "arbol", emptyList()))
        assertEquals(GuessCheck.Bad("short"), Polyword.checkGuess("arb", "arbol", emptyList()))
        assertEquals(GuessCheck.Bad("letters"), Polyword.checkGuess("ab1ol", "arbol", emptyList()))
        assertEquals(GuessCheck.Bad("repeat"), Polyword.checkGuess("arbol", "arbol", listOf("arbol")))
    }

    @Test
    fun eachMissOpensOneHint() {
        val hints = listOf(Hint("en", "dog"), Hint("fr", "chien"), Hint("de", "Hund"))
        assertEquals(0, Polyword.revealedHints(hints, "perro", emptyList()).size)
        assertEquals(1, Polyword.revealedHints(hints, "perro", listOf("gatos")).size)
        assertEquals(2, Polyword.revealedHints(hints, "perro", listOf("gatos", "lunes")).size)
        assertEquals(3, Polyword.revealedHints(hints, "perro", listOf("gatos", "perro")).size)
        assertTrue(Polyword.finished(listOf("a", "b", "c", "d", "e", "f"), "perro"))
    }

    @Test
    fun shareCardTagsMissesWithHintFlags() {
        val flags = mapOf("es" to "🇪🇸", "en" to "🇬🇧", "fr" to "🇫🇷")
        val hints = listOf(Hint("en", "dog"), Hint("fr", "chien"))
        val text = Polyword.shareText("es", 13, "perro", hints, listOf("gatos", "pesar", "perro"), "https://www.polingual.com/play/polyword") { flags.getValue(it) }
        assertEquals("Polyword 🇪🇸 #13 3/6", text.lines()[0])
        assertTrue("⬜⬜⬜🟨⬜ 🇬🇧\n🟩🟩⬜⬜🟨 🇫🇷\n🟩🟩🟩🟩🟩\n" in text)
        assertEquals("Polyword 🇪🇸 #13 X/6", Polyword.shareText("es", 13, "perro", hints, List(6) { "aaaaa" }, "u") { flags.getValue(it) }.lines()[0])
    }

    @Test
    fun streaksCountDailyWinsAndSkipArchive() {
        val win = PolyGame(listOf("x"), done = true, won = true)
        var g = mapOf(8 to win, 9 to win, 11 to win, 12 to win, 10 to PolyGame(List(6) { "a" }, true, false), 3 to win.copy(archive = true))
        assertEquals(PolyStats(5, 4, 2, 2, listOf(4, 0, 0, 0, 0, 0)), Polyword.stats(g, 13))
        g = g + (13 to win)
        assertEquals(3, Polyword.stats(g, 13).streak)
        assertEquals(0, Polyword.stats(g + (14 to PolyGame(List(6) { "a" }, true, false)), 14).streak)
        assertEquals(0, Polyword.stats(g, 15).streak)
    }
}
