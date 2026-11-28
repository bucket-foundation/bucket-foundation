import Foundation
import Testing
@testable import BucketKit

private func decode(_ raw: [String: Any]) throws -> Lobby { try JSONDecoder().decode(Lobby.self, from: json(raw)) }

private func night(game: String, status: String = "done", startedAt: String = "2026-11-12T10:00:00.000Z") -> [String: Any] {
    var raw = lobbyJSON(status: status, startedAt: startedAt)
    raw["game"] = game
    raw["setup"] = "sequence"
    raw["playlist"] = ["daily", "tiles", "same-word"]
    raw["revealSeconds"] = 0
    return raw
}

@Suite struct LobbyServerCompatTests {
    @Test func newServerFieldsDecode() throws {
        var raw = lobbyJSON()
        raw["revealSeconds"] = 4
        raw["standing"] = false
        raw["botFill"] = true
        raw["botsEnabled"] = true
        raw["nextStartAt"] = "2026-11-12T10:01:00.000Z"
        raw["ended"] = false
        raw["canEnd"] = true
        raw["setup"] = "sequence"
        raw["playlist"] = ["daily", "tiles", "same-word"]
        raw["coins"] = 3
        raw["powers"] = [["round": 0, "kind": "double"]]
        raw["guestsWatch"] = true
        raw["bonusVotes"] = [["round": 2, "choices": [["choice": "gato", "votes": 3]], "total": 3]]
        raw["players"] = [
            ["userId": "u1", "name": "Gia", "handle": NSNull(), "ready": true, "score": 0, "total": 400, "isHost": true, "isMe": true, "online": true, "answered": false, "bot": false, "skill": NSNull(), "flag": "es", "firstRound": 0, "continues": 0],
        ]
        raw["prompts"] = [["round": 0, "mode": "voice", "lang": "es", "licence": "family-room", "gloss": "cat", "choices": ["gato"], "answer": NSNull(), "hide": ["u2"]]]
        let l = try decode(raw)
        #expect(l.setup == .sequence && l.playlist == [.daily, .tiles, .sameWord])
        #expect(l.bonusTally(2)?.choices.first?.votes == 3)
        #expect(l.prompts[0].mode == .voice && l.prompts[0].licence == .familyRoom && l.prompts[0].mode.choosesText)
        #expect(l.players[0].total == 400 && l.canEnd == true && l.nextStart != nil)
    }

    @Test func unknownEnumsNeverThrow() throws {
        var raw = lobbyJSON(status: "archived")
        raw["game"] = "karaoke"
        raw["setup"] = "tournament"
        raw["playlist"] = ["daily", "karaoke"]
        raw["prompts"] = [["round": 0, "mode": "hum", "lang": NSNull(), "licence": "secret", "gloss": "x", "choices": [], "answer": NSNull()]]
        let l = try decode(raw)
        #expect(l.status == .done && l.game == .other && l.setup == .other)
        #expect(l.playlist == [.daily, .other] && l.prompts[0].mode == .other && l.prompts[0].licence == .unknown)
        let s = try JSONDecoder().decode(LobbySummary.self, from: json(["id": "L", "code": "C", "name": "n", "game": "x", "root": "en", "targets": [], "status": "lobby", "players": 1, "bots": 2, "standing": false, "setup": "mix", "playlist": [], "host": "h", "hostHandle": NSNull(), "isMember": false]))
        #expect(s.bots == 2 && s.setup == .mix)
    }

    @Test func startNeedsEveryHumanReady() throws {
        var raw = lobbyJSON(ready: [true, true])
        var ps = raw["players"] as! [[String: Any]]
        ps.append(["userId": "u3", "name": "Bo", "ready": false, "score": 0, "isHost": false, "isMe": false, "online": true, "answered": false])
        raw["players"] = ps
        let three = try decode(raw)
        #expect(three.readyCount == 2 && !three.canStart && three.waitingOn.map(\.userId) == ["u3"])
        ps[2]["online"] = false
        raw["players"] = ps
        #expect(try decode(raw).canStart)
        ps[2] = ["userId": "b1", "name": "Bot", "ready": false, "score": 0, "isHost": false, "isMe": false, "online": true, "answered": false, "bot": true]
        raw["players"] = ps
        #expect(try decode(raw).canStart)
        raw["players"] = [ps[2]]
        #expect(try !decode(raw).canStart)
    }

    @Test func hostWithoutSeatStillHosts() throws {
        var raw = lobbyJSON(ready: [true, true])
        var ps = raw["players"] as! [[String: Any]]
        ps[0]["isMe"] = false
        ps[0]["isHost"] = false
        ps.append(["userId": "u3", "name": "Bo", "ready": true, "score": 0, "isHost": false, "isMe": false, "online": true, "answered": false])
        raw["players"] = ps
        let l = try decode(raw)
        #expect(l.me == nil && l.isHost && !l.seated && !l.watching && l.canStart)
        raw["isHost"] = false
        #expect(try decode(raw).watching)
    }

    @Test func nextGameCountsDownSixtySeconds() throws {
        let l = try decode(lobbyJSON(status: "done", startedAt: "2026-11-12T10:00:00.000Z"))
        let end = try #require(l.gameEnd)
        #expect(l.breakSeconds == 60)
        #expect(l.nextGameRemaining(at: end) == 60)
        #expect(l.nextGameRemaining(at: end.addingTimeInterval(75)) == 0)
        var closed = lobbyJSON(status: "done", startedAt: "2026-11-12T10:00:00.000Z")
        closed["ended"] = true
        #expect(try decode(closed).nextGameAt == nil)
        var pinned = lobbyJSON(status: "done", startedAt: "2026-11-12T10:00:00.000Z")
        pinned["nextStartAt"] = "2026-11-12T10:00:40.000Z"
        #expect(try decode(pinned).nextGameRemaining(at: end) == 10)
    }

    @Test func familyNightInterludesFollowTheServer() throws {
        let warm = try decode(night(game: "daily"))
        let end = try #require(warm.gameEnd)
        #expect(warm.nightRound == NightRound(index: 0, label: "Warm Up", final: false, total: 3))
        #expect(warm.breakSeconds == 150)
        #expect(warm.interlude(at: end.addingTimeInterval(-1)) == nil)
        #expect(warm.interlude(at: end.addingTimeInterval(13)) == .voiceAtlas(clip: 1, endsAt: end.addingTimeInterval(24)))
        #expect(warm.interlude(at: end.addingTimeInterval(60)) == .familyTeach)
        let race = try decode(night(game: "tiles"))
        #expect(race.interlude(at: end.addingTimeInterval(16)) == .forehead(card: 1, endsAt: end.addingTimeInterval(30)))
        #expect(race.interlude(at: end.addingTimeInterval(90)) == .ourTrivia)
        let final = try decode(night(game: "same-word", status: "playing"))
        #expect(final.nightRound?.final == true && final.bonusQuestion(2) && !final.bonusQuestion(1))
        #expect(try decode(night(game: "same-word")).interlude(at: end) == nil)
        #expect(race.foreheadHolder(3)?.userId == "u2")
        #expect(race.foreheadSeed == "18446744073709551615000000")
    }

    @Test func playerCardRules() throws {
        var c = FamilyCard(nickname: "Mo")
        for l in ["en", "es", "fr", "de", "it", "pt", "ja"] { c.toggleSpeak(l) }
        #expect(c.speaks.count == 6 && !c.speaks("ja"))
        c.setLevel("en", 4)
        #expect(c.speaks[0].reads == true)
        for l in ["es", "ja", "ko", "zh", "ar"] { c.toggleLearn(l) }
        #expect(c.learn == ["ja", "ko", "zh"] && c.ready)
        c.setSurprise(true)
        #expect(c.learn.isEmpty && c.ready)
        let adult = try JSONSerialization.jsonObject(with: JSONEncoder().encode(c.body(lobbyId: "L"))) as! [String: Any]
        #expect((adult["card"] as? [String: Any])?["band"] as? String == "adult")
        c.band = .under13
        let kid = try JSONSerialization.jsonObject(with: JSONEncoder().encode(c.body(lobbyId: "L"))) as! [String: Any]
        #expect(Set(kid.keys) == ["lobbyId", "band"] && kid["band"] as? String == "under13")
    }

    @Test func familyViewsDecode() throws {
        let t = try JSONDecoder().decode(TeachView.self, from: json(["round": 0, "speakerId": "u1", "status": "warming", "lang": "es", "choices": ["a", "b"], "answer": NSNull(), "clip": NSNull(), "myGuess": NSNull(), "guessed": 1, "teacherAward": NSNull()]))
        #expect(t.status == .other)
        let v = try JSONDecoder().decode(TriviaView.self, from: json(["count": 2, "current": 0, "open": true, "prompt": "Q", "choices": ["a", "b"], "answer": NSNull(), "myPick": NSNull(), "picked": 0, "questions": NSNull(), "scores": ["u1": 100]]))
        #expect(v.scores["u1"] == 100)
        #expect(TriviaQuestion(prompt: "Q", choices: ["a", "A"]).valid == false && TriviaQuestion(prompt: "Q", choices: ["a", "b"], answer: 1).valid)
        let b = try JSONDecoder().decode(LeagueBoard.self, from: json(["week": "2026-W48", "tier": 1, "tierName": "Bronze", "board": (1...9).map { ["rank": $0, "name": "p\($0)", "points": 10 - $0, "me": $0 == 7] }]))
        #expect(b.nearMe().map(\.rank) == [5, 6, 7, 8, 9])
        #expect(LeagueBoard.eligible(.teen, signedIn: true) && !LeagueBoard.eligible(.under13, signedIn: true))
        #expect(ClipLicence.familyRoom.playable(room: true) && !ClipLicence.personal.playable(room: true))
        #expect(LobbyRules.clientHeaders["x-polingual-plays"] == "tiles,reveal,playlist,night")
    }
}

@Suite struct LobbyRouteParamTests {
    @Test func everyFamilyRouteSendsTheServerNames() async throws {
        let seen = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            let body = r.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }.map { $0.keys.sorted().joined(separator: ",") } ?? ""
            let query = (URLComponents(url: r.url!, resolvingAgainstBaseURL: false)?.queryItems ?? []).map(\.name).sorted().joined(separator: ",")
            seen.mutate { $0.append("\(r.httpMethod ?? "GET") \(r.url!.path) q=\(query) b=\(body)") }
            switch r.url!.path {
            case "/api/academy/lobby-teach": return (200, json(r.httpMethod == "POST" ? ["ok": true] : ["teach": NSNull()]))
            case "/api/academy/lobby-trivia": return (200, json(r.httpMethod == "POST" ? ["ok": true] : ["trivia": NSNull()]))
            case "/api/academy/lobby-cards": return (200, json(r.httpMethod == "POST" ? ["ok": true] : ["cards": [], "share": true]))
            case "/api/academy/lobbies/atlas": return (200, json(["rounds": []]))
            case "/api/academy/forehead": return (200, json(["cards": []]))
            case "/api/academy/lobbies/bonus": return (200, json(["points": 50, "km": 120, "ok": true]))
            default: return (200, json(["ok": true]))
            }
        }, cacheDir: nil)
        _ = try await api.teach(token: "t", lobbyId: "L")
        try await api.teachAct(token: "t", lobbyId: "L", action: .guess, guess: 1)
        _ = try await api.trivia(token: "t", lobbyId: "L")
        try await api.triviaAct(token: "t", lobbyId: "L", action: .answer, index: 0, pick: 1)
        _ = try await api.seatCards(token: "t", lobbyId: "L")
        try await api.sendCard(token: "t", lobbyId: "L", card: FamilyCard(band: .under13, nickname: "Mo"))
        _ = try await api.atlasClips(token: "t", lobbyId: "L")
        let hit = try await api.atlasGuess(token: "t", lobbyId: "L", clip: 0, lat: 1.5, lon: 2.5)
        try await api.foreheadMark(token: "t", lobbyId: "L", card: 0, got: true)
        _ = try await api.foreheadDeck(langs: ["es"], seed: "1", root: "en")
        try await api.bonusVote(token: "t", lobbyId: "L", round: 2, choice: "gato")
        #expect(hit.km == 120)
        #expect(seen.value == [
            "GET /api/academy/lobby-teach q=lobby b=",
            "POST /api/academy/lobby-teach q= b=action,guess,lobbyId",
            "GET /api/academy/lobby-trivia q=lobby b=",
            "POST /api/academy/lobby-trivia q= b=action,index,lobbyId,pick",
            "GET /api/academy/lobby-cards q=lobby b=",
            "POST /api/academy/lobby-cards q= b=band,lobbyId",
            "GET /api/academy/lobbies/atlas q=lobbyId b=",
            "POST /api/academy/lobbies/bonus q= b=clip,kind,lat,lobbyId,lon",
            "POST /api/academy/lobbies/bonus q= b=card,got,kind,lobbyId",
            "GET /api/academy/forehead q=langs,root,seed b=",
            "POST /api/academy/lobbies/react q= b=choice,lobbyId,round",
        ])
    }

    @Test func pollingErrorsSplitTransientFromFinal() {
        #expect(LobbyRules.pollProblem(.server(400, "bad_request")))
        #expect(LobbyRules.pollProblem(.server(403, "unauthorized")))
        #expect(!LobbyRules.pollProblem(.server(429, nil)))
        #expect(!LobbyRules.pollProblem(.server(503, "sync_unavailable")))
    }
}

@Suite struct FamilyGateTests {
    @Test func clientHeaderDeclaresEverythingTheAppRenders() {
        #expect(LobbyRules.clientHeaders["x-polingual-plays"] == "tiles,reveal,playlist,night")
        #expect(LobbyRules.clientHeaders["x-polingual-race"] == "1")
    }

    @Test func atlasRefusalsBranchOnTheCode() {
        #expect(BonusRefusal(.server(409, "already_answered")) == .alreadyAnswered)
        #expect(BonusRefusal(.server(409, "wrong_round")) == .closed)
        #expect(BonusRefusal(.server(503, "sync_unavailable")) == .retry)
        #expect(BonusRefusal(.server(400, "bad_request")) == .other)
    }

    @Test func onlyAdultsRecordInAHomeLanguage() {
        var c = FamilyCard(band: .under13, nickname: "Mo", speaks: [SpokenLang(lang: "es", level: 4, reads: true)])
        #expect(c.recordRefusal(lang: "es") == "not_adult" && c.homeLanguages.isEmpty)
        c.band = .teen
        #expect(c.recordRefusal(lang: "es") == "not_adult")
        c.band = .adult
        #expect(c.recordRefusal(lang: "es") == nil && c.recordRefusal(lang: "fr") == "not_home_language" && c.homeLanguages == ["es"])
    }

    @Test func underThirteenRecordRefusalReachesTheApp() async {
        let api = BucketAPI(transport: StubTransport { _ in (403, json(["error": "not_adult"])) }, cacheDir: nil)
        do {
            try await api.teachAct(token: "t", lobbyId: "L", action: .record, lang: "es", clip: "data:audio/mp4;base64,AA", choices: ["a", "b"], answer: 0)
            Issue.record("record should be refused")
        } catch {
            #expect((error as? BucketError) == .server(403, "not_adult"))
        }
    }

    @Test func bonusVoteBodyCarriesRoundAndChoice() async throws {
        let body = LockedBox<[String: Any]>([:])
        let api = BucketAPI(transport: StubTransport { r in
            body.mutate { $0 = (try? JSONSerialization.jsonObject(with: r.httpBody ?? Data()) as? [String: Any]) ?? [:] }
            return (200, json(["ok": true]))
        }, cacheDir: nil)
        try await api.bonusVote(token: "t", lobbyId: "L", round: 5, choice: "gato")
        #expect(body.value["lobbyId"] as? String == "L" && body.value["round"] as? Int == 5 && body.value["choice"] as? String == "gato" && body.value.count == 3)
    }

    @Test func triviaAnswersNeedASeatAndTheHostWritesTheQuestions() throws {
        let player = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON(isHost: false)))
        #expect(player.canAnswerTrivia)
        let host = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON(isHost: true)))
        #expect(!host.canAnswerTrivia)
        var raw = lobbyJSON(isHost: false)
        var ps = raw["players"] as! [[String: Any]]
        ps[0]["isMe"] = false
        raw["players"] = ps
        #expect(try !JSONDecoder().decode(Lobby.self, from: json(raw)).canAnswerTrivia)
    }
}
