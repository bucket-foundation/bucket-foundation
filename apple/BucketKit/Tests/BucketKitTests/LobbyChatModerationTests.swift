import Foundation
import Testing
@testable import BucketKit

func chatLobbyJSON() -> [String: Any] {
    var l = lobbyJSON()
    var players = l["players"] as! [[String: Any]]
    players.append(["userId": "b1", "name": "Bot", "ready": true, "score": 0, "isHost": false, "isMe": false, "online": true, "answered": false, "bot": true])
    l["players"] = players
    l["messages"] = [
        ["id": 1, "from": "u2", "name": "Ana", "body": "hola", "at": "2026-11-12T09:59:00Z"],
        ["id": 2, "from": "u1", "name": "Gia", "body": "hi", "at": "2026-11-12T09:59:10Z"],
        ["id": 3, "from": "b1", "name": "Bot", "body": "beep", "at": "2026-11-12T09:59:20Z"],
    ]
    return l
}

@MainActor
@Suite struct LobbyChatModerationTests {
    func defaults() -> UserDefaults {
        let name = "chat-mod-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        d.removePersistentDomain(forName: name)
        return d
    }

    @Test func onlyOtherPeopleCanBeReportedOrBlocked() throws {
        let lobby = try JSONDecoder().decode(Lobby.self, from: json(chatLobbyJSON()))
        let can = lobby.messages.map { ChatModeration.canModerate($0, in: lobby) }
        #expect(can == [true, false, false])
    }

    @Test func messagesStayHiddenUntilBlocksLoadThenBlockedOnesDrop() throws {
        let lobby = try JSONDecoder().decode(Lobby.self, from: json(chatLobbyJSON()))
        #expect(ChatModeration.visible(lobby.messages, blocks: nil).isEmpty)
        #expect(ChatModeration.visible(lobby.messages, blocks: []).map(\.id) == [1, 2, 3])
        #expect(ChatModeration.visible(lobby.messages, blocks: [ChatBlock(userId: "u2", name: "Ana", at: "")]).map(\.id) == [2, 3])
    }

    @Test func reportAndBlockPostTheWebContract() async throws {
        let seen = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            let body = r.httpBody.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            seen.mutate { $0.append("\(r.httpMethod ?? "GET") \(r.url!.path) \(body)") }
            switch r.url!.path {
            case let p where p.hasSuffix("/report"): return (200, json(["ok": true, "reviewWithinHours": 24]))
            case let p where p.hasSuffix("/blocks"):
                return r.httpMethod == "POST"
                    ? (200, json(["blocks": [["userId": "u2", "name": "Ana", "at": "2026-11-23T00:00:00Z"]]]))
                    : (200, json(["blocks": []]))
            default: return (200, json(["lobby": chatLobbyJSON()]))
            }
        }, cacheDir: nil)
        let d = defaults()
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: d)
        try await store.join(code: "ABC123", displayName: "Gia")
        #expect(store.blocks == nil)
        await store.loadBlocks()
        #expect(store.blocks == [] && !store.blocksFailed)
        let ana = try #require(store.current?.messages.first)
        try await store.report(ana, reason: .offensiveName)
        try await store.block(ana)
        #expect(store.blocks?.map(\.userId) == ["u2"])
        #expect(store.visibleMessages(try #require(store.current)).map(\.id) == [2, 3])
        let calls = seen.value.filter { !$0.contains("/lobbies/join") && !$0.hasPrefix("POST /api/academy/lobbies ") }
        #expect(calls.count == 3)
        #expect(calls[0].hasPrefix("GET /api/academy/lobbies/blocks"))
        #expect(calls[1].hasPrefix("POST /api/academy/lobbies/report") && calls[1].contains("\"reason\":\"offensive_name\"") && calls[1].contains("\"messageId\":1"))
        #expect(calls[2].hasPrefix("POST /api/academy/lobbies/blocks") && calls[2].contains("\"blocked\":true") && calls[2].contains("\"userId\":\"u2\""))
        #expect(d.data(forKey: ChatModeration.cacheKey("u1")) != nil)
    }

    @Test func failedBlockListFallsBackToThisAccountsCache() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            r.url!.path.hasSuffix("/blocks") ? (503, json(["error": "sync_unavailable"])) : (200, json(["lobby": chatLobbyJSON()]))
        }, cacheDir: nil)
        let d = defaults()
        d.set(try JSONEncoder().encode([ChatBlock(userId: "u2", name: "Ana", at: "")]), forKey: ChatModeration.cacheKey("u1"))
        d.set(try JSONEncoder().encode([ChatBlock(userId: "b1", name: "Bot", at: "")]), forKey: ChatModeration.cacheKey("someone-else"))
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: d)
        try await store.join(code: "ABC123", displayName: "Gia")
        await store.loadBlocks()
        #expect(store.blocksFailed && store.blocks?.map(\.userId) == ["u2"])
    }

    @Test func failedBlockListWithNoCacheShowsChat() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            r.url!.path.hasSuffix("/blocks") ? (503, json(["error": "sync_unavailable"])) : (200, json(["lobby": chatLobbyJSON()]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: defaults())
        try await store.join(code: "ABC123", displayName: "Gia")
        await store.loadBlocks()
        #expect(store.blocks == [] && store.blocksFailed)
    }

    @Test func aFailedReportThrowsAndKeepsChat() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            switch r.url!.path {
            case let p where p.hasSuffix("/report"): return (429, json(["error": "rate_limited"]))
            case let p where p.hasSuffix("/blocks"): return (200, json(["blocks": []]))
            default: return (200, json(["lobby": chatLobbyJSON()]))
            }
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: defaults())
        try await store.join(code: "ABC123", displayName: "Gia")
        await store.loadBlocks()
        let ana = try #require(store.current?.messages.first)
        await #expect(throws: BucketError.self) { try await store.report(ana, reason: .spam) }
        #expect(store.visibleMessages(try #require(store.current)).count == 3)
    }

    @Test func aFailedBlockKeepsTheListAndThrows() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            switch r.url!.path {
            case let p where p.hasSuffix("/blocks"): return r.httpMethod == "POST" ? (503, json(["error": "sync_unavailable"])) : (200, json(["blocks": []]))
            default: return (200, json(["lobby": chatLobbyJSON()]))
            }
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: defaults())
        try await store.join(code: "ABC123", displayName: "Gia")
        await store.loadBlocks()
        let ana = try #require(store.current?.messages.first)
        await #expect(throws: BucketError.self) { try await store.block(ana) }
        let lobby = try #require(store.current)
        #expect(store.blocks == [] && store.visibleMessages(lobby).count == 3)
    }

    @Test func rejoiningClearsTheListUntilItLoadsAgain() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            r.url!.path.hasSuffix("/blocks") ? (200, json(["blocks": [["userId": "u2", "name": "Ana", "at": ""]]])) : (200, json(["lobby": chatLobbyJSON()]))
        }, cacheDir: nil)
        let store = LobbyStore(api: api, token: { "t" }, blockDefaults: defaults())
        try await store.join(code: "ABC123", displayName: "Gia")
        await store.loadBlocks()
        #expect(store.blocks?.count == 1)
        try await store.join(code: "ABC123", displayName: "Gia")
        let rejoined = try #require(store.current)
        #expect(store.blocks == nil && store.visibleMessages(rejoined).isEmpty)
    }
}
