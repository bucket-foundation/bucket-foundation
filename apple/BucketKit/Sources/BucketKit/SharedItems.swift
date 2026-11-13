import Foundation

public enum SharedItemKind: String, Codable, Sendable {
    case url, text, image, voice
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
    public var audioUrl: String?
    public var durationMs: Int?
    public var lang: String?
    public var translation: String?
    public var at: String
    public var mine: Bool

    public init(id: String, groupId: String, from: String, fromName: String, to: String? = nil, kind: SharedItemKind, url: String? = nil, text: String? = nil, imageUrl: String? = nil, audioUrl: String? = nil, durationMs: Int? = nil, lang: String? = nil, translation: String? = nil, at: String, mine: Bool) {
        self.id = id
        self.groupId = groupId
        self.from = from
        self.fromName = fromName
        self.to = to
        self.kind = kind
        self.url = url
        self.text = text
        self.imageUrl = imageUrl
        self.audioUrl = audioUrl
        self.durationMs = durationMs
        self.lang = lang
        self.translation = translation
        self.at = at
        self.mine = mine
    }

    public var link: URL? { url.flatMap(URL.init(string:)) }
    public var image: URL? { imageUrl.flatMap(URL.init(string:)) }
    public var audio: URL? { audioUrl.flatMap(URL.init(string:)) }
    public var duration: TimeInterval { Double(durationMs ?? 0) / 1000 }
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

public enum SharedItemAction: Equatable, Sendable {
    case remove
    case report
    case block(GroupMember)
}

extension SharedItem {
    public func actions(in group: LearningGroup) -> [SharedItemAction] {
        var out: [SharedItemAction] = []
        if mine || group.isOwner { out.append(.remove) }
        guard !mine else { return out }
        out.append(.report)
        if let sender = group.members.first(where: { $0.userId == from && !$0.isMe }) { out.append(.block(sender)) }
        return out
    }
}

public struct VoiceNote: Equatable, Sendable {
    public static let maxSeconds: TimeInterval = 60
    public static let maxBytes = 1_048_576

    public var audio: Data
    public var durationMs: Int
    public var lang: String
    public var transcript: String?

    public init(audio: Data, duration: TimeInterval, lang: String, transcript: String?) {
        self.audio = audio
        self.durationMs = max(1, min(Int((duration * 1000).rounded()), Int(Self.maxSeconds * 1000)))
        self.lang = Self.code(lang)
        self.transcript = SharePayload.clip(transcript)
    }

    var fields: [String: Field] {
        var f: [String: Field] = ["audio": .text(audio.base64EncodedString()), "durationMs": .number(durationMs), "lang": .text(lang)]
        if let transcript { f["transcript"] = .text(transcript) }
        return f
    }

    public static func code(_ tag: String) -> String {
        String(tag.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).first ?? "en")
    }

    public static func appLang(_ bundle: Bundle = .main) -> String {
        code(bundle.preferredLocalizations.first ?? "en")
    }
}

struct ItemsReply: Decodable { let items: [SharedItem] }
struct TranslationReply: Decodable { let text: String? }
struct ItemReply: Decodable { let item: SharedItem }

extension BucketAPI {
    public func sharedItems(token: String, groupId: String, lang: String? = nil) async throws -> [SharedItem] {
        var query = ["groupId": groupId, "voice": "1"]
        if let lang { query["lang"] = lang }
        let r: ItemsReply = try await groupCall("api/academy/groups/share", query: query, token: token)
        return r.items
    }

    public func sendVoiceNote(token: String, groupId: String, note: VoiceNote) async throws -> SharedItem {
        if note.audio.count > VoiceNote.maxBytes { throw BucketError.voiceTooLong }
        var body = note.fields
        body["groupId"] = .text(groupId)
        let r: ItemReply = try await groupCall("api/academy/groups/voice", token: token, body: body)
        return r.item
    }

    public func translateVoice(token: String, itemId: String, lang: String) async throws -> String? {
        let r: TranslationReply = try await groupCall("api/academy/groups/voice/translate", token: token, body: ["itemId": .text(itemId), "lang": .text(lang)])
        return r.text
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
