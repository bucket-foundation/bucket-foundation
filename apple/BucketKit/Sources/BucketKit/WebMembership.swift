import Foundation
import Security

public struct WebEntitlement: Codable, Sendable, Equatable {
    public static let webPrefix = "web."
    public static let openEndedGrace: TimeInterval = 3 * 86_400
    public static let freshFor: TimeInterval = 7 * 86_400
    public static let clockSkew: TimeInterval = 300

    public let userId: String
    public let productId: String
    public let expires: Date?
    public let fetched: Date

    public init(userId: String, productId: String, expires: Date?, fetched: Date) {
        self.userId = userId
        self.productId = productId
        self.expires = expires
        self.fetched = fetched
    }

    public var until: Date { expires ?? fetched.addingTimeInterval(Self.openEndedGrace) }
    public var lapse: Date { min(until, fetched.addingTimeInterval(Self.freshFor)) }

    public func valid(for user: String?, now: Date) -> Bool {
        user == userId && now < lapse && now >= fetched.addingTimeInterval(-Self.clockSkew)
    }

    static func date(_ raw: String) -> Date? {
        let plain = raw.replacing(/\.\d+/, with: "")
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: plain)
    }

    public static func parse(_ data: Data, userId: String, now: Date) -> WebEntitlementReply {
        struct Body: Decodable {
            let active: Bool?
            let productId: String?
            let expiresAt: String?
        }
        guard let body = try? JSONDecoder().decode(Body.self, from: data), let active = body.active else { return .failed }
        guard active, let product = body.productId, product.hasPrefix(webPrefix) else { return .none }
        let expires = body.expiresAt.flatMap(date)
        if body.expiresAt != nil, expires == nil { return .failed }
        let found = WebEntitlement(userId: userId, productId: product, expires: expires, fetched: now)
        return found.until > now ? .entitled(found) : .none
    }
}

public enum WebEntitlementReply: Sendable, Equatable {
    case entitled(WebEntitlement)
    case none
    case failed
}

extension BucketAPI {
    public func webEntitlement(token: String, userId: String, now: Date = .now) async -> WebEntitlementReply {
        var r = URLRequest(url: base.appending(path: "api/academy/entitlement"))
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, http) = try? await transport.send(r), (200..<300).contains(http.statusCode) else { return .failed }
        return WebEntitlement.parse(data, userId: userId, now: now)
    }
}

public enum MemberTier: Sendable, Equatable {
    case checking, locked, beta, trial, subscribed

    public var open: Bool { self == .beta || self == .trial || self == .subscribed }
    public var showsAds: Bool { self == .locked }
    public var capped: Bool { self == .locked || self == .beta }
    public var paid: Bool { self == .trial || self == .subscribed }

    public static func merged(store: MemberTier, web: WebEntitlement?, userId: String?, now: Date) -> (tier: MemberTier, web: WebEntitlement?) {
        if store.paid { return (store, nil) }
        guard let web, web.valid(for: userId, now: now) else { return (store, nil) }
        return (.subscribed, web)
    }
}

public protocol WebEntitlementVault: Sendable {
    func load() -> WebEntitlement?
    func save(_ entitlement: WebEntitlement)
    func clear()
}

public final class MemoryWebEntitlementVault: WebEntitlementVault, @unchecked Sendable {
    private let lock = NSLock()
    private var value: WebEntitlement?

    public init(_ value: WebEntitlement? = nil) { self.value = value }

    public func load() -> WebEntitlement? { lock.withLock { value } }
    public func save(_ entitlement: WebEntitlement) { lock.withLock { value = entitlement } }
    public func clear() { lock.withLock { value = nil } }
}

public struct KeychainWebEntitlementVault: WebEntitlementVault {
    let service: String
    let account = "entitlement"

    public init(service: String = "com.polingual.webmembership") { self.service = service }

    var query: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account] }

    public func load() -> WebEntitlement? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(WebEntitlement.self, from: data)
    }

    public func save(_ entitlement: WebEntitlement) {
        guard let data = try? JSONEncoder().encode(entitlement) else { return }
        clear()
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }

    public func clear() { SecItemDelete(query as CFDictionary) }
}

@MainActor
@Observable
public final class WebMembership {
    public private(set) var cached: WebEntitlement?
    public private(set) var userId: String?
    public private(set) var lapses = 0
    @ObservationIgnored private var lapseWatch: Task<Void, Never>?
    @ObservationIgnored let wait: @MainActor (TimeInterval) async -> Void
    @ObservationIgnored let vault: any WebEntitlementVault
    @ObservationIgnored let fetch: @MainActor (_ token: String, _ userId: String) async -> WebEntitlementReply
    @ObservationIgnored let clock: @MainActor () -> Date

    public init(
        vault: any WebEntitlementVault,
        userId: String? = nil,
        clock: @escaping @MainActor () -> Date = { Date() },
        wait: @escaping @MainActor (TimeInterval) async -> Void = { try? await Task.sleep(for: .seconds($0)) },
        fetch: @escaping @MainActor (_ token: String, _ userId: String) async -> WebEntitlementReply
    ) {
        self.vault = vault
        self.fetch = fetch
        self.clock = clock
        self.wait = wait
        self.userId = userId
        cached = vault.load()
        watchLapse()
    }

    func watchLapse() {
        lapseWatch?.cancel()
        guard let cached else { return }
        let delay = cached.lapse.timeIntervalSince(clock())
        guard delay > 0 else { return }
        lapseWatch = Task { [weak self] in
            await self?.wait(delay + 1)
            guard !Task.isCancelled else { return }
            self?.lapses += 1
        }
    }

    public var active: WebEntitlement? {
        _ = lapses
        guard let cached, cached.valid(for: userId, now: clock()) else { return nil }
        return cached
    }

    public func tier(store: MemberTier) -> MemberTier { MemberTier.merged(store: store, web: active, userId: userId, now: clock()).tier }

    public func refresh(userId user: String?, token: @MainActor () async -> String?) async {
        userId = user
        guard let user else {
            drop()
            return
        }
        if let cached, cached.userId != user { drop() }
        guard let token = await token() else { return }
        let reply = await fetch(token, user)
        guard userId == user else { return }
        switch reply {
        case .entitled(let found):
            cached = found
            vault.save(found)
            watchLapse()
        case .none:
            drop()
        case .failed:
            break
        }
    }

    func drop() {
        guard cached != nil || vault.load() != nil else { return }
        cached = nil
        vault.clear()
        watchLapse()
    }
}
