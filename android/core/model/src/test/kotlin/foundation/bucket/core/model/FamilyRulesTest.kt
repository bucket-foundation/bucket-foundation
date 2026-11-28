package foundation.bucket.core.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FamilyRulesTest {
    @Test
    fun foreheadSeedMatchesTheWeb() {
        assertEquals("42100000", FamilyRules.foreheadSeed("42", "2026-11-27T10:00:00Z"))
        assertEquals("42", FamilyRules.foreheadSeed("42", null))
    }

    @Test
    fun onlyAdultsWithAHomeLanguageTeach() {
        val adult = PlayerCard(SeatBand.Adult).withSpoken("it", 4).withSpoken("en", 3)
        assertEquals(listOf("it"), FamilyRules.teacherHomes(adult))
        assertEquals(emptyList(), FamilyRules.teacherHomes(adult.copy(band = SeatBand.Teen)))
        assertEquals(emptyList(), FamilyRules.teacherHomes(null))
    }

    @Test
    fun teachRecordNeedsAClipAndTwoAnswers() {
        assertNull(FamilyRules.teachRecord(null, listOf("dog", "cat"), 0))
        assertNull(FamilyRules.teachRecord("data:x", listOf("dog", ""), 0))
        assertNull(FamilyRules.teachRecord("data:x", listOf("", "cat", "sun"), 0))
        assertNull(FamilyRules.teachRecord("data:x", listOf("Dog", "dog"), 0))
        assertEquals(FamilyRules.TeachRecord(listOf("cat", "sun"), 1), FamilyRules.teachRecord("data:x", listOf("", "cat", " sun "), 2))
    }

    @Test
    fun triviaSetChecks() {
        assertTrue(FamilyRules.triviaReady(listOf(TriviaQuestion("Q", listOf("a", "b"), 1))))
        assertFalse(FamilyRules.triviaReady(emptyList()))
        assertFalse(FamilyRules.triviaReady(listOf(TriviaQuestion(" ", listOf("a", "b"), 0))))
        assertFalse(FamilyRules.triviaReady(listOf(TriviaQuestion("Q", listOf("a", "A"), 0))))
        assertFalse(FamilyRules.triviaReady(listOf(TriviaQuestion("Q", listOf("a", "b"), 2))))
    }

    @Test
    fun clipRoundTrips() {
        val url = FamilyRules.clipDataUrl(byteArrayOf(1, 2, 3))
        assertTrue(url.startsWith("data:audio/mp4;base64,"))
        assertEquals(listOf<Byte>(1, 2, 3), FamilyRules.clipBytes(url)!!.toList())
        assertNull(FamilyRules.clipBytes("nope"))
    }
}
