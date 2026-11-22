package com.polingual.app

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class VideoLogicTest {
    private val cues = listOf(VideoCue(0.0, 2.0), VideoCue(2.0, 4.0), VideoCue(5.0, 8.0))

    @Test fun activeCueFindsContainingCue() {
        assertEquals(0, VideoLogic.activeCue(cues, 0.0))
        assertEquals(1, VideoLogic.activeCue(cues, 3.9))
        assertEquals(-1, VideoLogic.activeCue(cues, 4.5))
        assertEquals(2, VideoLogic.activeCue(cues, 7.0))
        assertEquals(-1, VideoLogic.activeCue(cues, 9.0))
        assertEquals(-1, VideoLogic.activeCue(emptyList(), 1.0))
    }

    @Test fun parsesBundledSample() {
        val doc = VideoLogic.parseDoc(File("src/main/assets/videos/sample.json").readText())
        assertEquals(listOf("en", "es", "fr", "de"), doc.langs)
        assertTrue(doc.cues.all { it.text.keys.containsAll(doc.langs) })
        assertTrue(doc.cues.zipWithNext().all { (a, b) -> a.start <= b.start })
        val index = VideoLogic.parseIndex(File("src/main/assets/videos/index.json").readText())
        assertEquals(doc.id, index.videos.single().id)
    }

    @Test fun parsesBareArrayIndexAndUnknownKeys() {
        val index = VideoLogic.parseIndex("""[{"id":"a","title":"t","extra":1}]""")
        assertEquals("a", index.videos.single().id)
    }

    @Test fun defaultLangsKeepTwoToFour() {
        assertEquals(listOf("en", "es", "fr", "de"), VideoLogic.defaultLangs(listOf("en", "es", "fr", "de", "it"), listOf("es"), "en"))
        assertEquals(listOf("en", "it"), VideoLogic.defaultLangs(listOf("en", "it"), listOf("ja"), "en"))
        assertEquals(listOf("de", "fr", "en", "es"), VideoLogic.defaultLangs(listOf("en", "es", "fr", "de"), listOf("fr"), "de"))
    }

    @Test fun toggleLangRespectsBounds() {
        assertEquals(listOf("en", "es"), VideoLogic.toggleLang(listOf("en", "es"), "es"))
        assertEquals(listOf("en"), VideoLogic.toggleLang(listOf("en", "es", "fr"), "es").take(1))
        assertEquals(listOf("es", "fr", "de", "it"), VideoLogic.toggleLang(listOf("en", "es", "fr", "de"), "it"))
        assertEquals(listOf("en", "es", "fr"), VideoLogic.toggleLang(listOf("en", "es"), "fr"))
    }

    @Test fun cleanAndSaveWords() {
        assertEquals("palabra", VideoLogic.clean("¡Palabra!"))
        assertEquals("l'enregistrer", VideoLogic.clean("l'enregistrer."))
        val one = VideoLogic.addSaved(emptyList(), SavedWord("hola", "es", "v", 1.0))
        assertEquals(1, VideoLogic.addSaved(one, SavedWord("hola", "es", "v", 3.0)).size)
        assertEquals(1, VideoLogic.addSaved(one, SavedWord("", "es", "v", 3.0)).size)
        assertEquals("1:05", VideoLogic.clock(65.4))
    }

    @Test fun comboGrowsXpAndResets() {
        val c = Combo()
        assertEquals(10, c.hit())
        assertEquals(15, c.hit())
        c.hit(); c.hit(); c.hit()
        assertEquals(30, c.hit())
        c.miss()
        assertEquals(0, c.streak)
        assertEquals(6, c.best)
        assertEquals(10, c.hit())
    }

    @Test fun dayStreakCountsConsecutiveDays() {
        assertEquals(1, DayStreak.next(null, 0, "2026-11-22"))
        assertEquals(4, DayStreak.next("2026-11-21", 3, "2026-11-22"))
        assertEquals(3, DayStreak.next("2026-11-22", 3, "2026-11-22"))
        assertEquals(1, DayStreak.next("2026-11-19", 3, "2026-11-22"))
    }
}
