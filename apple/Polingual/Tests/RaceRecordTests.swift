import BucketKit
import Foundation
import Testing
@testable import Polingual

struct RefusingTransport: Transport {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        (Data(), HTTPURLResponse(url: request.url!, statusCode: 404, httpVersion: nil, headerFields: nil)!)
    }
}

@MainActor
@Suite(.serialized)
struct RaceRecordTests {
    let api = BucketAPI(transport: RefusingTransport(), cacheDir: nil)
    let word = GameWord(itemId: "water", lang: "es", form: "agua", gloss: "water", root: "en")

    func learner() async throws -> (LangStore, LangSystem) {
        let langs = LangStore(api: api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { nil })
        return (langs, try await langs.create(root: "en", targets: ["es", "fr"]))
    }

    @Test func aRaceResultPostsAScoreAndLeavesTheLearnerAlone() async throws {
        let (langs, system) = try await learner()
        let lobbies = LobbyStore(api: api, token: { nil })
        lobbies.stage(players: 2, race: .voice)
        let hold = LobbyRaceGate.Hold()
        LobbyRace.begin(lobbies, hold: hold)
        defer { LobbyRace.store = nil }
        #expect(LobbyRace.system?.targets == ["es", "fr", "it", "pt", "de", "nl"])
        #expect(langs.gameSystems.map(\.id) == ["race-staged"])
        let best = langs.recordGame(.voice, played: [word], hits: 3, points: 3, missed: [word], earned: false)
        for _ in 0..<200 where lobbies.raceScore == nil { try await Task.sleep(for: .milliseconds(10)) }
        #expect(!best)
        #expect(lobbies.raceScore == LobbyRules.raceScore(points: 3, hits: 3))
        #expect(langs.gameBest(GameKind.voice.rawValue) == nil)
        #expect(langs.state(system.id).cards.count == 0)
        withExtendedLifetime(hold) {}
    }

    @Test func aRaceInAnotherGamePostsNoScore() async throws {
        let (langs, _) = try await learner()
        let lobbies = LobbyStore(api: api, token: { nil })
        lobbies.stage(players: 2, race: .match)
        let hold = LobbyRaceGate.Hold()
        LobbyRace.begin(lobbies, hold: hold)
        defer { LobbyRace.store = nil }
        langs.recordGame(.voice, played: [word], hits: 3, points: 3, missed: [], earned: false)
        try await Task.sleep(for: .milliseconds(100))
        #expect(lobbies.raceScore == nil)
        #expect(langs.gameBest(GameKind.voice.rawValue) == nil)
        withExtendedLifetime(hold) {}
    }

    @Test func aSoloResultWritesTheLedger() async throws {
        let (langs, _) = try await learner()
        LobbyRace.store = nil
        #expect(LobbyRace.system == nil)
        langs.recordGame(.voice, played: [word], hits: 3, points: 3, missed: [], earned: false)
        #expect(langs.gameBest(GameKind.voice.rawValue) == 3)
    }
}
