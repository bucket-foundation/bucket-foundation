import Foundation
import Testing
@testable import BucketKit

func lobbyJSON(status: String = "lobby", startedAt: String? = nil, version: Int = 3, ready: [Bool] = [true, false], isHost: Bool = true) -> [String: Any] {
    [
        "id": "L1", "code": "ABC123", "name": "Room", "root": "en", "targets": ["es", "fr"], "seed": "18446744073709551615",
        "status": status, "listed": true, "rounds": 3, "roundSeconds": 10, "startedAt": startedAt as Any? ?? NSNull(),
        "version": version, "now": "2026-11-12T10:00:00.000Z", "isHost": isHost,
        "players": [
            ["userId": "u1", "name": "Gia", "ready": ready[0], "score": 150, "isHost": true, "isMe": true, "online": true, "answered": false],
            ["userId": "u2", "name": "Ana", "ready": ready[1], "score": 300, "isHost": false, "isMe": false, "online": true, "answered": true],
        ],
        "messages": [["id": 1, "from": "u2", "name": "Ana", "body": "hola", "at": "2026-11-12T09:59:00Z"]],
        "round": NSNull(),
        "prompts": [["round": 0, "lang": "es", "gloss": "cat", "choices": ["gato", "perro"], "answer": NSNull()]],
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

    @Test func promptsComeFromTheServerWithoutTheLiveAnswer() throws {
        let l = try JSONDecoder().decode(Lobby.self, from: json(lobbyJSON()))
        let p = try #require(l.prompt(0))
        #expect(p.gloss == "cat" && p.choices == ["gato", "perro"] && p.answer == nil)
        #expect(l.prompt(1) == nil)
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

    @MainActor @Test func serverErrorsSurface() async throws {
        let api = BucketAPI(transport: StubTransport { _ in (409, json(["error": "lobby_full"])) }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" })
        await #expect(throws: BucketError.server(409, "lobby_full")) { try await store.join(code: "ABC123", displayName: "Gia") }
        #expect(store.current == nil)
    }
}
