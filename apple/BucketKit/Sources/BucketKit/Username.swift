import Foundation

public enum Username {
    static let reserved: Set<String> = [
        "admin", "api", "academy", "canon", "about", "login", "signin", "settings",
        "me", "new", "null", "undefined", "bucket", "foundation", "www",
    ]

    public static func normalize(_ input: String) -> String? {
        let h = input.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard h.wholeMatch(of: /[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]/) != nil, !reserved.contains(h) else { return nil }
        return h
    }

    public static func suggest(from name: String) -> String {
        let folded = name.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
        var out = ""
        for ch in folded {
            if ch.isASCII && (ch.isLetter || ch.isNumber) { out.append(ch) }
            else if (ch == " " || ch == "-" || ch == "_" || ch == "."), let last = out.last, last != "_" { out.append("_") }
        }
        while out.last == "_" { out.removeLast() }
        return String(out.prefix(32)).trimmingCharacters(in: CharacterSet(charactersIn: "_"))
    }
}

public enum UsernameCheck: Equatable, Sendable {
    case empty
    case invalid
    case checking
    case free
    case taken
    case yours
    case unknown
}

public struct AccountProfile: Codable, Equatable, Sendable {
    public var handle: String
    public var displayName: String?
    public var isPublic: Bool

    public init(handle: String, displayName: String?, isPublic: Bool) {
        self.handle = handle
        self.displayName = displayName
        self.isPublic = isPublic
    }
}

extension BucketAPI {
    struct ProfileReply: Decodable { let profile: AccountProfile? }

    public func myProfile(token: String) async throws -> AccountProfile? {
        let r: ProfileReply = try await groupCall("api/academy/profile", query: ["me": "1"], token: token)
        return r.profile
    }

    public func usernameTaken(_ handle: String) async throws -> Bool {
        do {
            let _: Ignored = try await groupCall("api/academy/profile", query: ["handle": handle], token: nil)
            return true
        } catch BucketError.groupNotFound {
            return false
        }
    }

    public func saveProfile(token: String, handle: String, displayName: String) async throws -> AccountProfile {
        let r: ProfileReply = try await groupCall("api/academy/profile", token: token, body: ["handle": .text(handle), "display_name": .text(displayName)])
        guard let p = r.profile else { throw BucketError.decoding }
        return p
    }
}

extension GroupStore {
    public func loadProfile() async {
        guard let t = await token(), let p = try? await api.myProfile(token: t) else { return }
        profile = p
    }

    public func check(username raw: String) async -> UsernameCheck {
        if raw.trimmingCharacters(in: .whitespaces).isEmpty { return .empty }
        guard let h = Username.normalize(raw) else { return .invalid }
        if h == profile?.handle { return .yours }
        do { return try await api.usernameTaken(h) ? .taken : .free } catch { return .unknown }
    }

    @discardableResult
    public func saveName(displayName: String, username raw: String) async throws(BucketError) -> AccountProfile {
        guard let h = Username.normalize(raw) else { throw .handleInvalid }
        let name = try await rename(displayName: displayName)
        let p = try await run { try await self.api.saveProfile(token: $0, handle: h, displayName: name) }
        profile = p
        return p
    }
}
