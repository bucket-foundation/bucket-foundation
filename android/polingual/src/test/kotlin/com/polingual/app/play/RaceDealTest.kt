package com.polingual.app.play

import com.polingual.app.RaceDeal
import foundation.bucket.core.model.LobbyGame
import foundation.bucket.core.model.LobbyGames
import foundation.bucket.core.model.LobbyRace
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RaceDealTest {
    private val items = TestCorpus.corpus.items

    @Test
    fun dealSeedMatchesTheIphoneDerivation() {
        assertEquals("43", LobbyRace.deal("42"))
        assertEquals("73709551616", LobbyRace.deal("18446744073709551615"))
        assertEquals("1", LobbyRace.deal("1000000000000"))
    }

    @Test
    fun twoClientsInOneRoomDealTheSameDecks() {
        val race = LobbyRace.deal("9876543210123")
        val a = DealSeeds.fresh(race) { 0.1 }
        val b = DealSeeds.ensure("555", race) { 0.9 }
        assertEquals(a, b)
        val targets = listOf("es", "fr")
        assertEquals(ForeheadDeck.deck(items, RaceDeal.langs(listOf("de"), targets), a), ForeheadDeck.deck(items, RaceDeal.langs(listOf("ja"), targets), b))
        val pa = RaceDeal.lang("de", targets)
        val pb = RaceDeal.lang("it", targets)
        assertEquals(Snakes.deck(items, pa, listOf("fr", "it"), a), Snakes.deck(items, pb, listOf("fr", "it"), b))
        assertEquals(ISpy.rounds(items, a, "en", RaceDeal.langs(listOf("zh"), targets), ISpy.ROUNDS), ISpy.rounds(items, b, "en", RaceDeal.langs(listOf("ru"), targets), ISpy.ROUNDS))
    }

    @Test
    fun soloKeepsARandomDeal() {
        assertEquals("100000000001", DealSeeds.fresh(null) { 0.1 })
        assertEquals("555", DealSeeds.ensure("555", null) { 0.9 })
        assertEquals(listOf("de"), RaceDeal.langs(listOf("de"), null))
    }

    @Test
    fun flagDuelRacesStayOffAndroidAndFamilyNightGamesRender() {
        assertFalse(LobbyGames.playable(LobbyGame.FlagDuel))
        val night = foundation.bucket.core.model.FamilyNight.games.map { it.first }
        assertEquals(listOf("daily", "tiles", "same-word"), night)
        night.forEach { wire ->
            val game = LobbyGame.entries.first { it.wire == wire }
            assertTrue(LobbyGames.playable(game) && game in LobbyGames.prompt, wire)
        }
        assertTrue("tiles" in LobbyGames.plays.split(","))
    }
}
