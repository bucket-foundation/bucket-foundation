package foundation.bucket.core.engine

import kotlin.test.Test
import kotlin.test.assertEquals

class RandomTest {
    @Test
    fun xorshiftMatchesReferenceValues() {
        val rng = SeededRandom(4uL)
        assertEquals(listOf(4329079044uL, 4611971995335151878uL, 7816862149684023332uL), List(3) { rng.next() })
    }

    @Test
    fun zeroSeedUsesGoldenRatio() {
        assertEquals(SeededRandom(0x9E3779B97F4A7C15uL).next(), SeededRandom(0uL).next())
    }

    @Test
    fun fnvHashMatchesReference() {
        assertEquals(14495648844298516471uL, GameSeed.hash("2026-11-12|en|es,fr"))
        assertEquals(GameSeed.hash("2026-11-12|en|es,fr"), GameSeed.daily("2026-11-12", "en", listOf("fr", "es")))
    }

    @Test
    fun boundedDrawMatchesLemireReference() {
        val rng = SeededRandom(4uL)
        assertEquals(listOf(0, 2, 4, 9, 3), List(5) { rng.nextBelow(10) })
    }

    @Test
    fun fullWidthMultiply() {
        val (hi, lo) = SeededRandom.multiplyFull(ULong.MAX_VALUE, ULong.MAX_VALUE)
        assertEquals(ULong.MAX_VALUE - 1uL, hi)
        assertEquals(1uL, lo)
    }

    @Test
    fun mixedIsAPermutationAndDeterministic() {
        val a = mixed((1..20).toList(), SeededRandom(7uL))
        assertEquals((1..20).toList(), a.sorted())
        assertEquals(a, mixed((1..20).toList(), SeededRandom(7uL)))
    }
}
