import Foundation

public enum SharedItemKind: String, Codable, Sendable {
    case url, text, image
}

public struct SharedItem: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var groupId: String
    public var from: String
    public var fromName: String
    public var to: String?
    public var kind: SharedItemKind
    public var url: String?
    public var text: String?
    public var imageUrl: String?
    public var at: String
    public var mine: Bool

    public init(id: String, groupId: String, from: String, fromName: String, to: String? = nil, kind: SharedItemKind, url: String? = nil, text: String? = nil, imageUrl: String? = nil, at: String, mine: Bool) {
        self.id = id
        self.groupId = groupId
        self.from = from
        self.fromName = fromName
        self.to = to
        self.kind = kind
        self.url = url
        self.text = text
        self.imageUrl = imageUrl
        self.at = at
        self.mine = mine
    }

    public var link: URL? { url.flatMap(URL.init(string:)) }
    public var image: URL? { imageUrl.flatMap(URL.init(string:)) }
    public var sentAt: Date? { parseInstant(at) }
    public var isDirect: Bool { to != nil }
}

public enum SharePayload: Equatable, Sendable {
    case url(URL, note: String? = nil)
    case text(String)
    case image(Data, note: String? = nil)

    public static let maxText = 1000

    var fields: [String: Field] {
        switch self {
        case .url(let u, let note):
            var f: [String: Field] = ["kind": .text("url"), "url": .text(u.absoluteString)]
            if let note = Self.clip(note) { f["text"] = .text(note) }
            return f
        case .text(let t):
            return ["kind": .text("text"), "text": .text(Self.clip(t) ?? "")]
        case .image(let data, let note):
            var f: [String: Field] = ["kind": .text("image"), "image": .text(data.base64EncodedString())]
            if let note = Self.clip(note) { f["text"] = .text(note) }
            return f
        }
    }

    static func clip(_ s: String?) -> String? {
        guard let t = s?.trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty else { return nil }
        return String(t.prefix(maxText))
    }
}

struct ItemsReply: Decodable { let items: [SharedItem] }
struct ItemReply: Decodable { let item: SharedItem }

extension BucketAPI {
    public func sharedItems(token: String, groupId: String) async throws -> [SharedItem] {
        let r: ItemsReply = try await groupCall("api/academy/groups/share", query: ["groupId": groupId], token: token)
        return r.items
    }

    public func share(token: String, groupId: String, to userId: String? = nil, payload: SharePayload) async throws -> SharedItem {
        var body = payload.fields
        body["groupId"] = .text(groupId)
        if let userId { body["to"] = .text(userId) }
        let r: ItemReply = try await groupCall("api/academy/groups/share", token: token, body: body)
        return r.item
    }

    public func reportItem(token: String, itemId: String, reason: ReportReason) async throws {
        let _: Ignored = try await groupCall("api/academy/groups/share/report", token: token, body: ["itemId": .text(itemId), "reason": .text(reason.rawValue)])
    }

    public func removeItem(token: String, itemId: String) async throws {
        let _: Ignored = try await groupCall("api/academy/groups/share/remove", token: token, body: ["itemId": .text(itemId)])
    }
}
