import CryptoKit
import Foundation
import Security

public enum ItemState: Sendable, Equatable { case present, missing, unreadable }

public protocol SecretItems: Sendable {
    func state(_ account: String) -> ItemState
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

    func read(_ account: String) -> (OSStatus, Data?) {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &out)
        return (status, out as? Data)
    }

    public func state(_ account: String) -> ItemState {
        switch read(account).0 {
        case errSecSuccess: .present
        case errSecItemNotFound: .missing
        default: .unreadable
        }
    }

    public func data(_ account: String) -> Data? {
        let (status, data) = read(account)
        return status == errSecSuccess ? data : nil
    }

    public func set(_ data: Data, _ account: String) throws {
        let update = SecItemUpdate(query(account) as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if update == errSecSuccess { return }
        guard update == errSecItemNotFound else { throw BucketError.server(Int(update), "Keychain refused the session.") }
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
    private var locked = false
    private var refuseWrites = false

    public init() {}

    public func lockReads(_ on: Bool) { lock.withLock { locked = on } }
    public func refuseWrites(_ on: Bool) { lock.withLock { refuseWrites = on } }

    public func state(_ account: String) -> ItemState {
        lock.withLock { locked ? .unreadable : items[account] == nil ? .missing : .present }
    }

    public func data(_ account: String) -> Data? { lock.withLock { locked ? nil : items[account] } }

    public func set(_ data: Data, _ account: String) throws {
        try lock.withLock {
            if refuseWrites { throw BucketError.server(-25308, "Keychain refused the session.") }
            items[account] = data
        }
    }
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
    static let legacyLaunchIdKey = "accounts.legacyLaunchId"
    public static let launchId = UUID().uuidString

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
            let rest = readRows().filter { $0.userId != userId }
            writeRows(rest)
            if defaults.string(forKey: Self.activeKey) == userId {
                defaults.set(rest.max { $0.lastActive < $1.lastActive }?.userId, forKey: Self.activeKey)
            }
        }
    }

    public func prune(_ items: SecretItems) {
        for row in rows where items.state(SessionItem.user(row.userId)) == .missing { remove(row.userId) }
    }

    var legacyLaunches: Int {
        get { lock.withLock { defaults.integer(forKey: Self.legacyLaunchesKey) } }
        set { lock.withLock { defaults.set(newValue, forKey: Self.legacyLaunchesKey) } }
    }

    func countLegacyLaunch(_ launch: String = AccountIndex.launchId) {
        let counted = lock.withLock { () -> Bool in
            if defaults.string(forKey: Self.legacyLaunchIdKey) == launch { return true }
            defaults.set(launch, forKey: Self.legacyLaunchIdKey)
            return false
        }
        if !counted { legacyLaunches += 1 }
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
        let current = userId
        if let b = current, b != u { throw BucketError.server(0, "The session belongs to another account.") }
        let first = current == nil
        if first, index.rows.contains(where: { $0.userId == u }) == false, index.isFull {
            throw BucketError.server(0, "This device holds \(AccountIndex.cap) accounts. Sign one out first.")
        }
        try items.setSession(session, SessionItem.user(u))
        guard first else { return }
        lock.withLock { bound = u }
        index.upsert(userId: u, label: pendingLabel)
        index.activate(u)
    }

    public func clear() {
        guard let u = userId else { return }
        if items.session(SessionItem.legacy)?.userId == u { items.remove(SessionItem.legacy) }
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
        } else if index.activeUserId != nil {
            index.activate(nil)
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

    public static func store(multiAccount: Bool, items: SecretItems, index: AccountIndex, label: String? = nil, launch: String = AccountIndex.launchId) -> SessionStore {
        guard multiAccount else { return ResolvedSessionStore(items: items, index: index) }
        migrate(items: items, index: index, label: label, launch: launch)
        index.prune(items)
        return UserSessionStore(items: items, index: index, userId: index.activeUserId)
    }

    public static func extensionStore(items: SecretItems, index: AccountIndex) -> SessionStore {
        ResolvedSessionStore(items: items, index: index)
    }

    static func migrate(items: SecretItems, index: AccountIndex, label: String?, launch: String = AccountIndex.launchId) {
        guard let legacy = items.session(SessionItem.legacy), let u = legacy.userId else {
            index.legacyLaunches = 0
            return
        }
        let item = SessionItem.user(u)
        if (items.session(item)?.expiresAt ?? Int.min) < legacy.expiresAt {
            guard (try? items.setSession(legacy, item)) != nil, items.session(item) == legacy else { return }
            index.legacyLaunches = 0
        }
        let known = index.rows.contains { $0.userId == u }
        guard index.upsert(userId: u, label: label) else { return }
        if !known, index.activeUserId == nil { index.activate(u) }
        index.countLegacyLaunch(launch)
        if index.legacyLaunches >= 2 {
            items.remove(SessionItem.legacy)
            index.legacyLaunches = 0
        }
    }
}
