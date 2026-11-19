import Foundation
import Testing
@testable import BucketKit

func lobbyJSON(status: String = "lobby", startedAt: String? = nil, version: Int = 3, ready: [Bool] = [true, false], isHost: Bool = true) -> [String: Any] {
    [
        "id": "L1", "code": "ABC123", "name": "Room", "game": "same-word", "root": "en", "targets": ["es", "fr"], "seed": "18446744073709551615",
        "status": status, "listed": true, "rounds": 3, "roundSeconds": 10, "startedAt": startedAt as Any? ?? NSNull(),
        "version": version, "now": "2026-11-12T10:00:00.000Z", "isHost": isHost,
        "players": [
            ["userId": "u1", "name": "Gia", "ready": ready[0], "score": 150, "isHost": true, "isMe": true, "online": true, "answered": false],
            ["userId": "u2", "name": "Ana", "ready": ready[1], "score": 300, "isHost": false, "isMe": false, "online": true, "answered": true],
        ],
        "messages": [["id": 1, "from": "u2", "name": "Ana", "body": "hola", "at": "2026-11-12T09:59:00Z"]],
        "round": NSNull(),
        "prompts": [["round": 0, "mode": "flag", "lang": NSNull(), "gloss": "gato", "choices": ["es", "it"], "answer": NSNull()], ["round": 1, "mode": "form", "lang": "es", "gloss": "cat", "choices": ["gato", "perro"], "answer": NSNull()]],
        "results": [["round": 0, "userId": "u2", "correct": true, "ms": 1000, "points": 190]],
    ]
}

let t0 = Date(timeIntervalSince1970: 1_793_268_000)

@Suite struct LobbyModelTests {
    @Test func lobbyDecodesAndRanks() throws {
        let l = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON()))
        #expect(l.seedValue == UInt64.max)
        #expect(l.me?.userId == "u1")
        #expect(l.standings.map(\.userId) == ["u2", "u1"])
        #expect(l.readyCount == 1 && !l.canStart)
        #expect(l.results(for: 0).count == 1 && l.messages.first?.body == "hola")
        let ready = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON(ready: [true, true])))
        #expect(ready.canStart)
        let guest = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON(ready: [true, true], isHost: false)))
        #expect(!guest.canStart)
    }

    @Test func clockSyncsRoundsFromStart() throws {
        let start = "2026-11-12T10:00:00.000Z"
        let l = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON(status: "playing", startedAt: start)))
        let s = try #require(l.start)
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(-2)) == .countdown(2))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(14)) == .round(index: 1, remaining: 6))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(30)) == .finished)
        let waiting = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON()))
        #expect(LobbyClock.phase(waiting, at: s) == .waiting)
    }

    @Test func revealGapMatchesTheWebClock() throws {
        var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00.000Z")
        raw["revealSeconds"] = 4
        let l = try JSONDecoder().decode(Lobby.self, from: json(raw))
        let s = try #require(l.start)
        #expect(l.playSeconds == 38)
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(9)) == .round(index: 0, remaining: 1))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(11)) == .reveal(index: 0, remaining: 3))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(14)) == .round(index: 1, remaining: 10))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(37)) == .round(index: 2, remaining: 1))
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(38)) == .finished)
    }

    @Test func newWebGamesDecodeAndUnknownOnesFallBack() throws {
        for (raw, game) in [("tiles", LobbyGame.tiles), ("duel", .duel), ("spy", .spy), ("pinball", .other)] {
            var j = lobbyJSON()
            j["game"] = raw
            j["prompts"] = [["round": 0, "mode": raw == "pinball" ? "pinball" : "tiles", "lang": "es", "gloss": "cat", "choices": ["es:gato", "fr:chat"], "answer": NSNull()]]
            let l = try JSONDecoder().decode(Lobby.self, from: json(j))
            #expect(l.game == game)
            #expect(l.prompt(0)?.mode == (raw == "pinball" ? .other : .tiles))
        }
        #expect(!LobbyGame.hostable.contains(.other) && !LobbyGame.hostable.contains(.spy))
        #expect(LobbyPromptMode.meaning.choosesText && !LobbyPromptMode.tiles.choosesText)
    }

    @Test func tilesSendTappedIndicesTheWayTheServerParsesThem() throws {
        let p = LobbyPrompt(round: 0, mode: .tiles, lang: "es", gloss: "cat", choices: ["es:gato", "fr:chat", "de:Hund", "plain"], answer: "0,1")
        #expect(LobbyTilePicks.tiles(p).map(\.lang) == ["es", "fr", "de", ""])
        #expect(LobbyTilePicks.tiles(p).last?.form == "plain")
        #expect(LobbyTile(key: "ja:ねこ:x").form == "ねこ:x")
        #expect(LobbyTilePicks.choice([3, 0, 1]) == "0,1,3")
        #expect(LobbyTilePicks.choice([]) == "-")
        #expect(LobbyTilePicks.answer(p) == [0, 1])
        #expect(LobbyTilePicks.submitDue(remaining: 0.8, roundSeconds: 9))
        #expect(!LobbyTilePicks.submitDue(remaining: 2, roundSeconds: 9))
    }

    @Test func promptsComeFromTheServerWithoutTheLiveAnswer() throws {
        let l = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON()))
        let flag = try #require(l.prompt(0))
        #expect(flag.mode == .flag && flag.lang == nil && flag.choices == ["es", "it"])
        let p = try #require(l.prompt(1))
        #expect(p.mode == .form && p.gloss == "cat" && p.choices == ["gato", "perro"] && p.answer == nil)
        #expect(l.prompt(2) == nil && l.game == .sameWord)
    }

    @Test func revealEntriesDecodeWithTheAnswerFirst() throws {
        let raw: [String: Any] = ["round": 0, "mode": "form", "lang": "ja", "gloss": "cat", "choices": ["ねこ", "いぬ"], "answer": "ねこ", "reveal": [
            ["lang": "ja", "word": "いぬ", "roman": "inu", "reading": ["kind": "kana"], "meaning": "dog", "gloss": "dog", "correct": false],
            ["lang": "ja", "word": "ねこ", "roman": NSNull(), "reading": NSNull(), "meaning": "cat", "correct": true],
        ]]
        let p = try JSONDecoder().decode(LobbyPrompt.self, from: json(raw))
        #expect(p.revealOrdered.map(\.word) == ["ねこ", "いぬ"])
        #expect(p.revealOrdered[1].roman == "inu" && p.revealOrdered[0].gloss == nil)
        let bare = try JSONDecoder().decode(LobbyPrompt.self, from: json(["round": 1, "mode": "form", "lang": "es", "gloss": "cat", "choices": ["gato"], "answer": NSNull()]))
        #expect(bare.reveal == nil && bare.revealOrdered.isEmpty)
    }

    @Test func choiceLabelsNameTheWordAndItsLanguage() {
        func prompt(_ mode: LobbyPromptMode) -> LobbyPrompt { LobbyPrompt(round: 0, mode: mode, lang: "es", gloss: "cat", choices: [], answer: nil) }
        #expect(prompt(.form).label("gato") == LobbyChoiceLabel(word: "gato", lang: "es"))
        #expect(prompt(.flag).label("it") == LobbyChoiceLabel(word: nil, lang: "it"))
        #expect(prompt(.meaning).label("cat") == LobbyChoiceLabel(word: "cat", lang: nil))
        #expect(prompt(.mixed).label("fr:chat") == LobbyChoiceLabel(word: "chat", lang: "fr"))
        #expect(prompt(.mixed).label("plain") == LobbyChoiceLabel(word: "plain", lang: nil))
    }
}

@Suite struct LobbyStoreTests {
    @MainActor @Test func createJoinAndPollFollowTheServer() async throws {
        let seen = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append("\(r.httpMethod ?? "GET") \(r.url!.path)") }
            if r.url!.path.hasSuffix("/state") {
                #expect(r.url!.query?.contains("since=3") == true)
                return (200, json(["changed": true, "lobby": lobbyJSON(version: 4, ready: [true, true])]))
            }
            return (200, json(["lobby": lobbyJSON()]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" }, clock: { t0 })
        try await store.create(name: "Room", root: "en", targets: ["es"], displayName: "Gia")
        #expect(store.current?.code == "ABC123")
        await store.poll()
        #expect(store.current?.version == 4 && store.current?.canStart == true)
        #expect(seen.value == ["POST /api/academy/lobbies", "GET /api/academy/lobbies/state"])
        #expect(abs(store.offset - (try #require(parseInstant("2026-11-12T10:00:00.000Z"))).timeIntervalSince(t0)) < 0.001)
    }

    @MainActor @Test func unchangedPollKeepsStateAndMissingLobbyClears() async throws {
        let gone = LockedBox(false)
        let api = BucketAPI(transport: StubTransport { r in
            if r.url!.path.hasSuffix("/state") {
                return gone.value ? (404, json(["error": "not_found"])) : (200, json(["changed": false, "version": 3, "now": "2026-11-12T10:00:00Z"]))
            }
            return (200, json(["lobby": lobbyJSON()]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        try await store.join(code: "abc123", displayName: "Gia")
        await store.poll()
        #expect(store.current?.version == 3)
        gone.mutate { $0 = true }
        await store.poll()
        #expect(store.current == nil && store.error == .groupNotFound)
    }

    @MainActor @Test func oneAnswerPerRoundTakesTheServerVerdict() async throws {
        let bodies = LockedBox<[[String: Any]]>([])
        let api = BucketAPI(transport: StubTransport { r in
            if let b = r.httpBody, let o = try? JSONSerialization.jsonObject(with: b) as? [String: Any] { bodies.mutate { $0.append(o) } }
            return (200, json(["correct": false, "lobby": lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00Z")]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.pick("perro", round: 0) == false)
        #expect(await store.pick("gato", round: 0) == nil)
        #expect(store.picks[0] == "perro" && store.marks[0] == false)
        let sent = try #require(bodies.value.last)
        #expect(sent["round"] as? Int == 0 && sent["correct"] == nil && sent["choice"] as? String == "perro")
    }

    @Test func raceGamesDecodeAndRunOnOneClock() throws {
        #expect(LobbyGame.race.count == 14 && LobbyGame.race.allSatisfy(\.isRace))
        #expect(!LobbyGame.daily.isRace && !LobbyGame.tiles.isRace && !LobbyGame.other.isRace)
        #expect(Set(LobbyGame.race.map(\.rawValue)).isSuperset(of: ["word-groups", "flag-tiles", "flag-duel", "polyword"]))
        var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00.000Z")
        raw["game"] = "word-groups"
        raw["rounds"] = 10
        raw["roundSeconds"] = 30
        raw["prompts"] = [[String: Any]]()
        let l = try JSONDecoder().decode(Lobby.self, from: json(raw))
        let s = try #require(l.start)
        #expect(l.game == .wordGroups && l.game.isRace)
        #expect(l.raceRemaining(at: s.addingTimeInterval(100)) == 200)
        #expect(l.raceRemaining(at: s.addingTimeInterval(400)) == 0)
        #expect(l.raceFinishers == ["u2"])
        #expect(LobbyClock.phase(l, at: s.addingTimeInterval(45)).playing)
        #expect(!LobbyClock.phase(l, at: s.addingTimeInterval(-1)).playing && !LobbyClock.phase(l, at: s.addingTimeInterval(300)).playing)
    }

    @Test func equalRaceScoresRankByTheFasterFinish() throws {
        var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00.000Z")
        raw["game"] = "mini"
        raw["players"] = ["ana", "bo", "cy"].map { ["userId": $0, "name": $0, "ready": true, "score": $0 == "cy" ? 0 : 500, "isHost": false, "isMe": false, "online": true, "answered": $0 != "cy"] as [String: Any] }
        raw["results"] = [["round": 0, "userId": "ana", "correct": true, "ms": 90_000, "points": 500], ["round": 0, "userId": "bo", "correct": true, "ms": 40_000, "points": 500]]
        let l = try JSONDecoder().decode(Lobby.self, from: json(raw))
        #expect(l.standings.map(\.userId) == ["bo", "ana", "cy"])
        raw["game"] = "daily"
        #expect(try JSONDecoder().decode(Lobby.self, from: json(raw)).standings.map(\.userId) == ["ana", "bo", "cy"])
    }

    @MainActor @Test func aRefusedScoreIsNotSentAgain() async throws {
        let hits = LockedBox(0)
        let api = BucketAPI(transport: StubTransport { r in
            var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00Z")
            raw["game"] = "snake"
            if r.url!.path.hasSuffix("/score") {
                hits.mutate { $0 += 1 }
                return (409, json(["error": "already_answered"]))
            }
            if r.url!.path.hasSuffix("/state") { return (200, json(["changed": false, "version": 3, "now": "2026-11-12T10:00:00Z"])) }
            return (200, json(["lobby": raw]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.postScore(7) == false && store.raceScoreSent)
        await store.poll()
        #expect(hits.value == 1)
    }

    @MainActor @Test(arguments: [408, 425, 429]) func aTimedOutOrThrottledScoreIsSentAgain(_ status: Int) async throws {
        let hits = LockedBox(0)
        let api = BucketAPI(transport: StubTransport { r in
            var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00Z")
            raw["game"] = "snake"
            if r.url!.path.hasSuffix("/score") {
                hits.mutate { $0 += 1 }
                return hits.value == 1 ? (status, json(["error": "busy"])) : (200, json(["score": 7, "lobby": raw]))
            }
            if r.url!.path.hasSuffix("/state") { return (200, json(["changed": false, "version": 3, "now": "2026-11-12T10:00:00Z"])) }
            return (200, json(["lobby": raw]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.postScore(7) == false && !store.raceScoreSent)
        await store.poll()
        #expect(hits.value == 2 && store.raceScoreSent && store.raceScore == 7)
    }

    @Test func scoreRefusalsEndOnClientErrorsExceptTimeoutsAndThrottles() {
        #expect(LobbyRules.scoreRefusalIsFinal(409) && LobbyRules.scoreRefusalIsFinal(400))
        #expect(!LobbyRules.scoreRefusalIsFinal(408) && !LobbyRules.scoreRefusalIsFinal(429))
        #expect(!LobbyRules.scoreRefusalIsFinal(500) && !LobbyRules.scoreRefusalIsFinal(0))
    }

    @Test func raceScoreFallsBackToHitsAndStaysInRange() {
        #expect(LobbyRules.raceScore(points: 420, hits: 3) == 420)
        #expect(LobbyRules.raceScore(points: nil, hits: 3) == 300)
        #expect(LobbyRules.raceScore(points: -5, hits: 3) == 0)
        #expect(LobbyRules.raceScore(points: 9_999_999, hits: 0) == LobbyRules.raceScoreMax)
    }

    @MainActor @Test func aRacePostsOneScoreAndListsRaceGamesFromTheServer() async throws {
        let calls = LockedBox<[(String, [String: Any], String?)]>([])
        let api = BucketAPI(transport: StubTransport { r in
            let body = r.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
            calls.mutate { $0.append((r.url!.path, body, r.value(forHTTPHeaderField: "x-polingual-race"))) }
            var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00Z")
            raw["game"] = "polyword"
            if r.url!.path.hasSuffix("/score") { return (200, json(["score": 420, "lobby": raw])) }
            if r.httpMethod != "POST" { return (200, json(["lobbies": [[String: Any]](), "race": ["polyword", "snake", "daily", "pinball"]])) }
            return (200, json(["lobby": raw]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        #expect(store.hostable == LobbyGame.hostable)
        await store.refresh()
        #expect(store.hostable == LobbyGame.hostable + [.polyword, .snake])
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.postScore(420))
        #expect(await store.postScore(900) == false)
        #expect(store.raceScore == 420)
        let scores = calls.value.filter { $0.0.hasSuffix("/score") }
        #expect(scores.count == 1 && scores.first?.1["score"] as? Int == 420 && scores.first?.1["lobbyId"] as? String == "L1")
        #expect(calls.value.first { $0.0.hasSuffix("/lobbies") }?.2 == "1")
        #expect(calls.value.first { $0.0.hasSuffix("/join") }?.2 == "1")
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(store.raceScore == nil)
    }

    @MainActor @Test func aFailedScoreCanBeSentAgainAndPromptLobbiesTakeNone() async throws {
        let fail = LockedBox(true)
        let game = LockedBox("snake")
        let api = BucketAPI(transport: StubTransport { r in
            var raw = lobbyJSON(status: "playing", startedAt: "2026-11-12T10:00:00Z")
            raw["game"] = game.value
            if r.url!.path.hasSuffix("/score") { return fail.value ? (500, json(["error": "server"])) : (200, json(["score": 7, "lobby": raw])) }
            return (200, json(["lobby": raw]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.postScore(7) == false && store.raceScore == 7 && !store.raceScoreSent)
        #expect(await store.postScore(9) == false && store.raceScore == 7)
        fail.mutate { $0 = false }
        await store.poll()
        #expect(store.raceScore == 7 && store.raceScoreSent)
        game.mutate { $0 = "daily" }
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(await store.postScore(7) == false && store.raceScore == nil)
    }

    @MainActor @Test func serverErrorsSurface() async throws {
        let api = BucketAPI(transport: StubTransport { _ in (409, json(["error": "lobby_full"])) }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        await #expect(throws: BucketError.server(409, "lobby_full")) { try await store.join(code: "ABC123", displayName: "Gia") }
        #expect(store.current == nil)
    }
}

@Suite struct GuestPassTests {
    @MainActor @Test func guestsGetATicketAndUseItForLobbies() async throws {
        let defaults = try #require(UserDefaults(suiteName: "guest-\(UUID().uuidString)"))
        let auth = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            auth.mutate { $0.append("\(r.url!.path) \(r.value(forHTTPHeaderField: "authorization") ?? "-")") }
            if r.url!.path.hasSuffix("/guest") { return (200, json(["token": "g1.abc.def", "userId": "u-guest", "expiresAt": "2099-01-01T00:00:00Z"])) }
            if r.url!.path.hasSuffix("/merge") { return (200, json(["ok": true, "merged": 1])) }
            return (200, json(["lobbies": []]))
        }, cacheDir: nil)
        let signedIn = LockedBox(false)
        let pass = GuestPass(api: api, defaults: defaults) { "Gia" }
        let store = LobbyStore(api: api, token: { signedIn.value ? "user" : nil }, guest: pass)
        await store.refresh()
        await store.refresh()
        #expect(pass.guestId.count == 32 && pass.userId == "u-guest")
        signedIn.mutate { $0 = true }
        await store.mergeGuest()
        #expect(auth.value == [
            "/api/academy/lobbies/guest -",
            "/api/academy/lobbies Bearer g1.abc.def",
            "/api/academy/lobbies Bearer g1.abc.def",
            "/api/academy/lobbies/guest/merge Bearer user",
        ])
        #expect(pass.userId == nil)
    }

    @MainActor @Test func noNameMeansNoGuestToken() async {
        let api = BucketAPI(transport: StubTransport { _ in (500, Data()) }, cacheDir: nil)
        let pass = GuestPass(api: api, defaults: UserDefaults(suiteName: "guest-\(UUID().uuidString)")!) { "  " }
        #expect(await pass.token() == nil)
    }

    @MainActor @Test func raceGateStaysOpenWhileItsHoldLives() {
        let gate = LobbyRaceGate()
        #expect(!gate.isOpen)
        var hold: LobbyRaceGate.Hold? = LobbyRaceGate.Hold()
        gate.open(hold!)
        #expect(gate.isOpen)
        hold = nil
        #expect(!gate.isOpen)
    }

    @MainActor @Test func raceGateFollowsTheNewestHold() {
        let gate = LobbyRaceGate()
        var first: LobbyRaceGate.Hold? = LobbyRaceGate.Hold()
        let second = LobbyRaceGate.Hold()
        gate.open(first!)
        gate.open(second)
        first = nil
        #expect(gate.isOpen)
    }

    #if DEBUG
    @MainActor @Test func stagedLobbySitsInRoundTwoAndNeverPolls() async {
        let calls = LockedBox(0)
        let api = BucketAPI(transport: StubTransport { _ in
            calls.mutate { $0 += 1 }
            return (404, Data())
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        store.stage(players: 6, mode: .tiles)
        await store.poll()
        #expect(calls.value == 0)
        #expect(store.current?.standings.count == 6)
        #expect(store.current?.results(for: 0).count == 5)
        #expect(store.current?.prompt(1)?.mode == .tiles)
        guard case .round(let index, let remaining) = store.phase else {
            Issue.record("staged lobby is outside a round")
            return
        }
        #expect(index == 1 && remaining > 500)
        await store.leave()
        #expect(calls.value == 0 && store.current == nil && !store.staged)
    }
    #endif
}

@Suite struct LobbyRaceDeckTests {
    @Test func raceDeckDayIsTheSeedKeyAndNeverACalendarDay() {
        let now = Date(timeIntervalSince1970: 1_795_000_000)
        #expect(LobbyRaceSeed.deckDay(nil, now: now) == PlayDecks.deckDay(now))
        #expect(LobbyRaceSeed.deckDay(42, now: now) == "race-42")
        #expect(LobbyRaceSeed.deckDay(42, now: now) != PlayDecks.deckDay(now))
    }

    @Test func racersWithOneSeedDrawTheSameNumbers() {
        var a = RaceRandom(seed: 7)
        var b = RaceRandom(seed: 7)
        var c = RaceRandom(seed: 8)
        let xs = (0..<20).map { _ in a.next() }
        #expect(xs == (0..<20).map { _ in b.next() })
        #expect(xs != (0..<20).map { _ in c.next() })
        #expect([1, 2, 3, 4, 5, 6].shuffled(using: &a) == [1, 2, 3, 4, 5, 6].shuffled(using: &b))
    }

    @Test func soloPlayDrawsFromTheSystem() {
        var a = RaceRandom(seed: nil)
        var b = RaceRandom(seed: nil)
        #expect((0..<8).map { _ in a.next() } != (0..<8).map { _ in b.next() })
    }

    @Test func raceGhostsAndDailyGhostsDiffer() {
        let day = PlayDecks.deckDay(Date(timeIntervalSince1970: 1_795_000_000))
        #expect(FlagTilesRules.ghosts(date: LobbyRaceSeed.deckDay(42)).map(\.score) != FlagTilesRules.ghosts(date: day).map(\.score) || FlagTilesRules.ghosts(date: LobbyRaceSeed.deckDay(42)).map(\.name) != FlagTilesRules.ghosts(date: day).map(\.name))
        #expect(FlagTilesRules.ghosts(date: LobbyRaceSeed.deckDay(42)).map(\.score) == FlagTilesRules.ghosts(date: "race-42").map(\.score))
    }
}
