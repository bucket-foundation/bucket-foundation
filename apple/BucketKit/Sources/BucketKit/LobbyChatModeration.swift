import Foundation

public enum ChatReportReason: String, CaseIterable, Sendable, Identifiable {
    case offensiveName = "offensive_name"
    case harassment
    case spam
    case other
    public var id: String { rawValue }
}

public struct ChatBlock: Codable, Equatable, Sendable {
    public var userId: String
    public var name: String
    public var at: String
}

struct ChatBlocksReply: Decodable { let blocks: [ChatBlock] }

extension BucketAPI {
    public func reportMessage(token: String, lobbyId: String, messageId: Int, reason: ChatReportReason) async throws {
        let _: Ignored = try await groupCall("api/academy/lobbies/report", token: token, body: [
            "lobbyId": .text(lobbyId), "messageId": .number(messageId), "reason": .text(reason.rawValue),
        ])
    }

    public func chatBlocks(token: String) async throws -> [ChatBlock] {
        let r: ChatBlocksReply = try await groupCall("api/academy/lobbies/blocks", token: token)
        return r.blocks
    }

    public func setChatBlock(token: String, userId: String, name: String, blocked: Bool) async throws -> [ChatBlock] {
        let r: ChatBlocksReply = try await groupCall("api/academy/lobbies/blocks", token: token, body: [
            "userId": .text(userId), "name": .text(name), "blocked": .flag(blocked),
        ])
        return r.blocks
    }
}

public enum ChatModeration {
    public static let cachePrefix = "polingual-ios/chat-blocks/v1"

    public static func cacheKey(_ userId: String) -> String { "\(cachePrefix):\(userId)" }

    public static func canModerate(_ message: LobbyMessage, in lobby: Lobby) -> Bool {
        guard let me = lobby.me?.userId, message.from != me else { return false }
        return !lobby.players.contains { $0.userId == message.from && $0.bot == true }
    }

    public static func visible(_ messages: [LobbyMessage], blocks: [ChatBlock]?) -> [LobbyMessage] {
        guard let blocks else { return [] }
        let ids = Set(blocks.map(\.userId))
        return messages.filter { !ids.contains($0.from) }
    }
}

extension LobbyStore {
    public func visibleMessages(_ lobby: Lobby) -> [LobbyMessage] {
        ChatModeration.visible(lobby.messages, blocks: blocks)
    }

    public func loadBlocks() async {
        guard let me = current?.me?.userId else { return }
        if staged {
            blocks = []
            return
        }
        do {
            guard let t = await anyToken() else { throw BucketError.revoked }
            let fresh = try await api.chatBlocks(token: t)
            guard current?.me?.userId == me else { return }
            storeBlocks(fresh, for: me)
            blocksFailed = false
        } catch {
            guard current?.me?.userId == me else { return }
            blocks = cachedBlocks(for: me) ?? []
            blocksFailed = true
        }
    }

    public func report(_ message: LobbyMessage, reason: ChatReportReason) async throws(BucketError) {
        guard let id = current?.id else { return }
        if staged { return }
        try await run { try await self.api.reportMessage(token: $0, lobbyId: id, messageId: message.id, reason: reason) }
    }

    public func block(_ message: LobbyMessage) async throws(BucketError) {
        guard let me = current?.me?.userId, message.from != me else { return }
        if staged {
            blocks = (blocks ?? []) + [ChatBlock(userId: message.from, name: message.name, at: "")]
            return
        }
        let fresh = try await run { try await self.api.setChatBlock(token: $0, userId: message.from, name: message.name, blocked: true) }
        storeBlocks(fresh, for: me)
    }

    func storeBlocks(_ list: [ChatBlock], for userId: String) {
        blocks = list
        if let data = try? JSONEncoder().encode(list) { blockDefaults.set(data, forKey: ChatModeration.cacheKey(userId)) }
    }

    func cachedBlocks(for userId: String) -> [ChatBlock]? {
        blockDefaults.data(forKey: ChatModeration.cacheKey(userId)).flatMap { try? JSONDecoder().decode([ChatBlock].self, from: $0) }
    }
}
