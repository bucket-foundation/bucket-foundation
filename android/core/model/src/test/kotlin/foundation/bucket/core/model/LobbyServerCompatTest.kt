package foundation.bucket.core.model

import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LobbyServerCompatTest {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    private fun player(id: String, ready: Boolean, me: Boolean = false, bot: Boolean = false, online: Boolean = true) =
        """{"userId":"$id","name":"$id","handle":null,"ready":$ready,"score":0,"total":40,"isHost":false,"isMe":$me,"online":$online,"answered":false,"bot":$bot,"skill":null,"flag":null,"firstRound":0,"continues":0}"""

    private fun lobby(
        game: String = "daily",
        status: String = "lobby",
        players: List<String> = emptyList(),
        prompts: String = "[]",
        extra: String = "",
        startedAt: String = "null",
    ) = json.decodeFromString<Lobby>(
        """{"id":"L1","code":"ABC123","name":"Room","game":"$game","root":"en","targets":["es"],"seed":"42","status":"$status","listed":true,"rounds":3,"roundSeconds":10,"revealSeconds":0,"startedAt":$startedAt,"version":1,"now":"2026-11-27T10:00:00Z","isHost":true,"players":[${players.joinToString(",")}],"messages":[],"round":null,"prompts":$prompts,"results":[],"standing":false,"botFill":false,"botsEnabled":false,"nextStartAt":null,"coins":0,"powers":[]$extra}""",
    )

    @Test
    fun unknownEnumValuesDecodeToFallbacks() {
        val l = lobby(game = "pictionary", status = "archived", prompts = """[{"round":0,"mode":"hum","lang":null,"gloss":"x","choices":["a"],"answer":null}]""", extra = ""","powers":[{"round":0,"kind":"triple"}]""")
        assertEquals(LobbyGame.Unknown, l.game)
        assertEquals(LobbyStatus.Done, l.status)
        assertEquals(LobbyPromptMode.Unknown, l.prompts.single().mode)
        assertEquals(PowerKind.Unknown, l.powers.single().kind)
        assertFalse(LobbyGames.playable(l.game))
    }

    @Test
    fun voicePromptAndLicenceDecode() {
        val l = lobby(status = "playing", prompts = """[{"round":0,"mode":"voice","lang":"es","licence":"cc-by","gloss":"x","choices":["es","fr"],"answer":null}]""")
        assertEquals(LobbyPromptMode.Voice, l.prompts.single().mode)
        assertEquals("cc-by", l.prompts.single().licence)
    }

    @Test
    fun newStateFieldsDecode() {
        val l = lobby(extra = ""","ended":true,"canEnd":true,"setup":"sequence","playlist":["daily","tiles","zzz"],"guestsWatch":true,"bonusVotes":[{"round":2,"choices":[{"choice":"a","votes":3},{"choice":"b","votes":1}],"total":4}]""")
        assertTrue(l.ended && l.canEnd)
        assertEquals("sequence", l.setup)
        assertEquals(listOf("daily", "tiles", "zzz"), l.playlist)
        assertEquals(true, l.guestsWatch)
        assertEquals("a", l.bonus(2)?.leader)
        assertEquals(0.75, l.bonus(2)!!.share("a"))
    }

    @Test
    fun summaryWithSetupAndUnknownGameDecodes() {
        val s = json.decodeFromString<LobbySummary>("""{"id":"L","code":"C","name":"N","game":"new-thing","root":"en","targets":["es"],"status":"lobby","players":1,"bots":0,"standing":false,"setup":"mix","playlist":["daily"],"host":"h","hostHandle":null,"isMember":false}""")
        assertEquals(LobbyGame.Unknown, s.game)
        assertEquals("mix", s.setup)
    }

    @Test
    fun hostOnTheScreenHasNoSeat() {
        val l = lobby(players = listOf(player("a", true), player("b", true)))
        assertNull(l.me)
        assertFalse(l.seated)
        assertTrue(l.canStart)
    }

    @Test
    fun startNeedsEveryOnlineHumanReady() {
        assertFalse(lobby(players = listOf(player("a", true, me = true), player("b", true), player("c", false))).canStart)
        assertTrue(lobby(players = listOf(player("a", true, me = true), player("b", true), player("c", false, online = false))).canStart)
        assertTrue(lobby(players = listOf(player("a", true, me = true), player("bot", false, bot = true))).canStart)
        assertFalse(lobby(players = listOf(player("bot1", false, bot = true), player("bot2", false, bot = true))).canStart)
        assertEquals(listOf("c"), lobby(players = listOf(player("a", true), player("c", false))).waitingOn.map { it.userId })
    }

    @Test
    fun nextGameCountdownRunsFromNextStartAt() {
        val l = lobby(status = "done").copy(nextStartAt = "2026-11-27T10:01:00Z")
        val now = parseInstantMs("2026-11-27T10:00:00.500Z")!!
        assertEquals(60, l.nextGameSeconds(now))
        assertEquals(0, l.nextGameSeconds(now + 120_000))
        assertNull(l.copy(ended = true).nextGameSeconds(now))
    }

    @Test
    fun familyNightRoundsAndInterludes() {
        val start = "\"2026-11-27T10:00:00Z\""
        val warm = lobby(status = "done", startedAt = start, extra = ""","setup":"sequence","playlist":["daily","tiles","same-word"]""")
        assertEquals(NightRound(0, "Warm Up", false, 3), warm.night)
        val end = parseInstantMs("2026-11-27T10:00:30Z")!!
        assertNull(warm.interlude(end - 1))
        assertEquals(Interlude.VoiceAtlas(0, end + 12_000), warm.interlude(end))
        assertEquals(Interlude.VoiceAtlas(4, end + 60_000), warm.interlude(end + 59_000))
        assertEquals(Interlude.FamilyTeach, warm.interlude(end + 60_000))
        val race = warm.copy(game = LobbyGame.Tiles)
        assertEquals(Interlude.Forehead(1, end + 30_000), race.interlude(end + 16_000))
        assertEquals(Interlude.OurTrivia, race.interlude(end + 90_000))
        assertNull(warm.copy(game = LobbyGame.SameWord).interlude(end))
        assertNull(warm.copy(setup = "mix").night)
        assertNull(warm.copy(ended = true).interlude(end))
        assertTrue(FamilyNight.bonusRound(warm.copy(game = LobbyGame.SameWord, status = LobbyStatus.Playing), 2))
    }

    @Test
    fun foreheadHolderRotatesHumansById() {
        val l = lobby(players = listOf(player("b", true), player("a", true), player("z", true, bot = true)))
        assertEquals("a", FamilyNight.foreheadHolder(l.players, 0))
        assertEquals("b", FamilyNight.foreheadHolder(l.players, 1))
        assertEquals("a", FamilyNight.foreheadHolder(l.players, 2))
    }

    @Test
    fun playerCardRules() {
        var c = PlayerCard(SeatBand.Adult).withSpoken("en", 4).withSpoken("es", 2)
        assertEquals(true, c.speaks.first { it.lang == "en" }.reads)
        c = c.toggleLearn("es").toggleLearn("fr").toggleLearn("de").toggleLearn("it").toggleLearn("pt")
        assertEquals(listOf("fr", "de", "it"), c.learn)
        assertEquals(listOf("fr", "de"), c.toggleLearn("it").learn)
        assertEquals(listOf("de", "it"), c.withSpoken("fr", 1).learn)
        assertEquals(listOf("en"), c.withSpoken("es", 0).speaks.map { it.lang })
        assertFalse(PlayerCard(SeatBand.Under13).sendsCard)
        assertTrue(PlayerCard(SeatBand.Under13).complete)
        assertFalse(PlayerCard(SeatBand.Teen).complete)
        assertEquals(LeaveResult.Handoff, LeaveResult.of("handoff"))
        assertEquals(LeaveResult.Left, LeaveResult.of(null))
    }
}
