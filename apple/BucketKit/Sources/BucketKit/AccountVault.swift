import CryptoKit
import Foundation
import Security

public protocol SecretItems: Sendable {
    func data(_ account: String) -> Data?
    func set(_ data: Data, _ account: String) throws
    func remove(_ account: String)
}

public struct KeychainItems: SecretItems {
    let service: String
    let accessGroup: String?

    public init(service: String = "foundation.bucket.session", accessGroup: String? = nil) {
        self.service = service
        self.accessGroup = accessGroup
    }

    func query(_ account: String) -> [String: Any] {
        var q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        if let accessGroup { q[kSecAttrAccessGroup as String] = accessGroup }
        return q
    }

    public func data(_ account: String) -> Data? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess else { return nil }
        return out as? Data
    }

    public func set(_ data: Data, _ account: String) throws {
        remove(account)
        var q = query(account)
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        guard status == errSecSuccess else { throw BucketError.server(Int(status), "Keychain refused the session.") }
    }

    public func remove(_ account: String) {
        SecItemDelete(query(account) as CFDictionary)
    }
}

public final class MemorySecretItems: SecretItems, @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String: Data] = [:]

    public init() {}

    public func data(_ account: String) -> Data? { lock.withLock { items[account] } }
    public func set(_ data: Data, _ account: String) throws { lock.withLock { items[account] = data } }
    public func remove(_ account: String) { _ = lock.withLock { items.removeValue(forKey: account) } }
    public var accounts: Set<String> { lock.withLock { Set(items.keys) } }
}

extension SecretItems {
    func session(_ account: String) -> Session? {
        data(account).flatMap { try? JSONDecoder().decode(Session.self, from: $0) }
    }

    func setSession(_ s: Session, _ account: String) throws {
        try set(try JSONEncoder().encode(s), account)
    }
}

public enum SessionItem {
    public static let legacy = "session"
    public static func user(_ userId: String) -> String { "session.\(userId)" }
}

public struct AccountRow: Codable, Sendable, Equatable {
    public let userId: String
    public let accountKey: String
    public var label: String
    public var lastActive: Date

    public var initial: String { label.first.map { String($0).uppercased() } ?? "?" }
}

public final class AccountIndex: @unchecked Sendable {
    public static let cap = 3
    static let rowsKey = "accounts.rows"
    static let activeKey = "accounts.active"
    static let legacyLaunchesKey = "accounts.legacyLaunches"

    let defaults: UserDefaults
    private let lock = NSLock()

    public init(defaults: UserDefaults) { self.defaults = defaults }

    public convenience init?(appGroup: String) {
        guard let d = UserDefaults(suiteName: appGroup) else { return nil }
        self.init(defaults: d)
    }

    public static func key(_ userId: String) -> String {
        SHA256.hash(data: Data(userId.utf8)).prefix(8).map { String(format: "%02x", $0) }.joined()
    }

    public static func mask(_ email: String) -> String {
        let parts = email.split(separator: "@", maxSplits: 1)
        guard parts.count == 2, let first = parts[0].first else { return "" }
        return "\(first)***@\(parts[1])"
    }

    public var rows: [AccountRow] {
        lock.withLock { readRows() }
    }

    public var activeUserId: String? {
        lock.withLock { defaults.string(forKey: Self.activeKey) }
    }

    public var isFull: Bool { rows.count >= Self.cap }

    func readRows() -> [AccountRow] {
        guard let data = defaults.data(forKey: Self.rowsKey) else { return [] }
        return (try? JSONDecoder().decode([AccountRow].self, from: data)) ?? []
    }

    func writeRows(_ rows: [AccountRow]) {
        defaults.set(try? JSONEncoder().encode(rows), forKey: Self.rowsKey)
    }

    @discardableResult
    public func upsert(userId: String, label: String? = nil, now: Date = .now) -> Bool {
        lock.withLock {
            var all = readRows()
            if let i = all.firstIndex(where: { $0.userId == userId }) {
                if let label, !label.isEmpty { all[i].label = label }
                all[i].lastActive = now
            } else {
                guard all.count < Self.cap else { return false }
                all.append(AccountRow(userId: userId, accountKey: Self.key(userId), label: label ?? "", lastActive: now))
            }
            writeRows(all)
            return true
        }
    }

    public func activate(_ userId: String?) {
        lock.withLock { defaults.set(userId, forKey: Self.activeKey) }
    }

    public func remove(_ userId: String) {
        lock.withLock {
            writeRows(readRows().filter { $0.userId != userId })
            if defaults.string(forKey: Self.activeKey) == userId { defaults.removeObject(forKey: Self.activeKey) }
        }
    }

    public func prune(_ items: SecretItems) {
        for row in rows where items.data(SessionItem.user(row.userId)) == nil { remove(row.userId) }
    }

    var legacyLaunches: Int {
        get { lock.withLock { defaults.integer(forKey: Self.legacyLaunchesKey) } }
        set { lock.withLock { defaults.set(newValue, forKey: Self.legacyLaunchesKey) } }
    }
}

public final class UserSessionStore: SessionStore, @unchecked Sendable {
    let items: SecretItems
    let index: AccountIndex
    private let lock = NSLock()
    private var bound: String?
    private var label: String?

    public init(items: SecretItems, index: AccountIndex, userId: String?) {
        self.items = items
        self.index = index
        self.bound = userId
    }

    public var userId: String? { lock.withLock { bound } }

    public var pendingLabel: String? {
        get { lock.withLock { label } }
        set { lock.withLock { label = newValue } }
    }

    public func load() -> Session? {
        guard let u = userId, let s = items.session(SessionItem.user(u)), s.userId == u else { return nil }
        return s
    }

    public func save(_ session: Session) throws {
        guard let u = session.userId else { throw BucketError.server(0, "The session has no user.") }
        let first: Bool = try lock.withLock {
            if let b = bound, b != u { throw BucketError.server(0, "The session belongs to another account.") }
            defer { bound = u }
            return bound == nil
        }
        if first, index.rows.contains(where: { $0.userId == u }) == false, index.isFull {
            lock.withLock { bound = nil }
            throw BucketError.server(0, "This device holds \(AccountIndex.cap) accounts. Sign one out first.")
        }
        try items.setSession(session, SessionItem.user(u))
        if first {
            index.upsert(userId: u, label: pendingLabel)
            index.activate(u)
        }
    }

    public func clear() {
        guard let u = userId else { return }
        items.remove(SessionItem.user(u))
        index.remove(u)
        lock.withLock { bound = nil }
    }
}

public struct ResolvedSessionStore: SessionStore {
    let items: SecretItems
    let index: AccountIndex

    public init(items: SecretItems, index: AccountIndex) {
        self.items = items
        self.index = index
    }

    public func load() -> Session? {
        let legacy = items.session(SessionItem.legacy)
        guard let u = index.activeUserId, let mine = items.session(SessionItem.user(u)), mine.userId == u else { return legacy }
        if let legacy, legacy.userId == u, legacy.expiresAt > mine.expiresAt { return legacy }
        return mine
    }

    public func save(_ session: Session) throws {
        let known = session.userId.map { u in index.rows.contains { $0.userId == u } } ?? false
        if !known || items.data(SessionItem.legacy) != nil {
            try items.setSession(session, SessionItem.legacy)
        }
        if known, let u = session.userId {
            try items.setSession(session, SessionItem.user(u))
            index.activate(u)
        }
    }

    public func clear() {
        let legacyUser = items.session(SessionItem.legacy)?.userId
        items.remove(SessionItem.legacy)
        for u in Set([legacyUser, index.activeUserId].compactMap { $0 }) {
            items.remove(SessionItem.user(u))
            index.remove(u)
        }
    }
}

public enum SessionVault {
    public static let sharedGroup = "QQ6D6A2LLS.foundation.bucket.shared"

    public static func store(multiAccount: Bool, items: SecretItems, index: AccountIndex, label: String? = nil) -> SessionStore {
        guard multiAccount else { return ResolvedSessionStore(items: items, index: index) }
        migrate(items: items, index: index, label: label)
        index.prune(items)
        return UserSessionStore(items: items, index: index, userId: index.activeUserId)
    }

    public static func extensionStore(items: SecretItems, index: AccountIndex) -> SessionStore {
        ResolvedSessionStore(items: items, index: index)
    }

    static func migrate(items: SecretItems, index: AccountIndex, label: String?) {
        guard let legacy = items.session(SessionItem.legacy), let u = legacy.userId else {
            index.legacyLaunches = 0
            return
        }
        let item = SessionItem.user(u)
        if (items.session(item)?.expiresAt ?? Int.min) < legacy.expiresAt {
            guard (try? items.setSession(legacy, item)) != nil, items.session(item) == legacy else { return }
            index.legacyLaunches = 0
        }
        guard index.upsert(userId: u, label: label) else { return }
        if index.activeUserId == nil { index.activate(u) }
        index.legacyLaunches += 1
        if index.legacyLaunches >= 2 {
            items.remove(SessionItem.legacy)
            index.legacyLaunches = 0
        }
    }
}
