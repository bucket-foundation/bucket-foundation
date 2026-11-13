package foundation.bucket.core.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LobbyTilesTest {
    @Test
    fun aLaneTapTakesTheLowestLiveTile() {
        val choices = listOf("es:gato", "fr:chat", "de:Katze", "it:gatto", "pt:gato", "nl:kat")
        val schedule = listOf(TileSlot(0, 0, 0, 2000), TileSlot(1, 0, 500, 2000), TileSlot(2, 1, 3000, 2000))
        assertEquals(0, LobbyTiles.laneTarget(choices, schedule, 0, 1000, emptySet()))
        assertEquals(1, LobbyTiles.laneTarget(choices, schedule, 0, 1000, setOf(0)))
        assertNull(LobbyTiles.laneTarget(choices, schedule, 1, 1000, emptySet()))
        assertNull(LobbyTiles.laneTarget(choices, schedule, 0, 2600, emptySet()))
        assertNull(LobbyTiles.laneTarget(choices.take(1), schedule, 0, 1000, setOf(0)))
        assertEquals(0, LobbyTiles.laneTarget(choices, LobbyTiles.schedule(6, 0, 8, 6), 0, 0, emptySet()))
    }

    @Test
    fun scheduleMatchesTheWebGolden() {
        assertEquals(listOf(TileSlot(0, 0, 0, 5580), TileSlot(1, 3, 484, 5580), TileSlot(2, 2, 968, 5580), TileSlot(3, 1, 1452, 5580), TileSlot(4, 0, 1936, 5580), TileSlot(5, 3, 2420, 5580)), LobbyTiles.schedule(6, 0, 8, 9))
        assertEquals(listOf(0, 528, 1055, 1583, 2110, 2638, 3165, 3693, 4220), LobbyTiles.schedule(9, 7, 8, 9).map { it.spawnMs })
        assertEquals(3780, LobbyTiles.schedule(9, 7, 8, 9)[0].fallMs)
        assertEquals(listOf(5, 6, 9), listOf(0, 3, 7).map { LobbyTiles.count(it, 8) })
    }

    @Test
    fun tappedChoicesRoundTripAndScore() {
        assertEquals(TileOutcome(1, 1, 1, false), LobbyTiles.outcome("1,3", listOf(1, 2)))
        assertEquals(listOf(1, 3), LobbyTiles.parseTapped("3,1,1", 5))
        assertEquals(emptyList(), LobbyTiles.parseTapped("-", 5))
        assertNull(LobbyTiles.parseTapped("7", 5))
        assertNull(LobbyTiles.parseTapped("a", 5))
        assertEquals("1,3", LobbyTiles.tappedChoice(listOf(3, 1, 3)))
        assertEquals("-", LobbyTiles.tappedChoice(emptyList()))
        assertEquals(Tile("es", "gato:x"), LobbyTiles.parse("es:gato:x"))
    }
}

class LobbyGamesTest {
    @Test
    fun duelShowsOnlyWhenTheServerOffersIt() {
        assertEquals(listOf(LobbyGame.Daily, LobbyGame.SameWord, LobbyGame.Flags, LobbyGame.Live, LobbyGame.Tiles), LobbyGames.offered(listOf("daily", "same-word", "flags", "live", "tiles", "spy")))
        assertEquals(LobbyGames.native, LobbyGames.offered(listOf("daily", "same-word", "flags", "live", "tiles", "spy", "duel")))
        assertEquals(false, LobbyGame.Duel in LobbyGames.offered(emptyList()))
        assertEquals(true, LobbyGame.Tiles in LobbyGames.offered(emptyList()))
    }
}

class LobbyTilesVisibleTest {
    private val schedule = LobbyTiles.schedule(6, 0, 8, 9)

    @Test
    fun tilesAreInFlightMidRound() {
        val v = LobbyTiles.visible(schedule, 6, 2_000, emptySet(), reveal = false)
        assertEquals(listOf(0, 1, 2, 3, 4), v.map { it.slot.index })
        assertEquals(2000f / 5580f, v.first().progress)
        assertEquals(true, v.all { it.progress in 0f..1f })
    }

    @Test
    fun beforeSpawnAfterLandingAndTappedTilesHide() {
        assertEquals(listOf(0), LobbyTiles.visible(schedule, 6, 100, emptySet(), false).map { it.slot.index })
        assertEquals(emptyList(), LobbyTiles.visible(schedule, 6, 9_000, emptySet(), false).map { it.slot.index })
        assertEquals(listOf(1, 2, 3, 4), LobbyTiles.visible(schedule, 6, 2_000, setOf(0), false).map { it.slot.index })
        assertEquals(6, LobbyTiles.visible(schedule, 6, 9_000, setOf(0), true).size)
        assertEquals(3, LobbyTiles.visible(schedule, 3, 2_000, emptySet(), false).size)
    }

    @Test
    fun roundStartsStepBySlotLength() {
        assertEquals(1_000L + 2 * 13_000L, LobbyTiles.roundStartMs(2, 1_000L, 9, 4))
    }
}

class LobbyTilesFrameTest {
    @Test
    fun frameClockCountsFromTheServerRoundStart() {
        val start = LobbyTiles.roundStartMs(1, 10_000L, 9, 4)
        assertEquals(23_000L, start)
        assertEquals(2_500L, LobbyTiles.frameElapsed(nowMs = 25_000L, offsetMs = 500L, roundStartMs = start))
        assertEquals(6, LobbyTiles.visible(LobbyTiles.schedule(6, 1, 8, 9), 6, LobbyTiles.frameElapsed(25_000L, 500L, start), emptySet(), false).size)
    }

    @Test
    fun revealShowsTheSubmittedTapsOverLocalOnes() {
        assertEquals(setOf(1, 3), LobbyTiles.shownTaps("3,1", setOf(0), 5))
        assertEquals(setOf(0), LobbyTiles.shownTaps(null, setOf(0), 5))
        assertEquals(emptySet(), LobbyTiles.shownTaps("-", setOf(2), 5))
        assertEquals(setOf(2), LobbyTiles.shownTaps("9", setOf(2), 5))
    }
}
