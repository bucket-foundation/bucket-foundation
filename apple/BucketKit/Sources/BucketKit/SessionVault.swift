import Foundation
import Security

public protocol SessionStore: Sendable {
    func load() -> Session?
    func save(_ session: Session) throws
    func clear()
}

public struct KeychainSessionStore: SessionStore {
    let service: String
    let accessGroup: String?
    let account = "session"

    public init(service: String = "foundation.bucket.session", accessGroup: String? = nil) {
        self.service = service
        self.accessGroup = accessGroup
    }

    var query: [String: Any] {
        var q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        if let accessGroup { q[kSecAttrAccessGroup as String] = accessGroup }
        return q
    }

    public func load() -> Session? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: data)
    }

    public func save(_ session: Session) throws {
        let data = try JSONEncoder().encode(session)
        clear()
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        guard status == errSecSuccess else { throw BucketError.server(Int(status), "Keychain refused the session.") }
    }

    public func clear() {
        SecItemDelete(query as CFDictionary)
    }
}

public final class MemorySessionStore: SessionStore, @unchecked Sendable {
    private let lock = NSLock()
    private var value: Session?

    public init(_ value: Session? = nil) { self.value = value }

    public func load() -> Session? { lock.withLock { value } }
    public func save(_ session: Session) throws { lock.withLock { value = session } }
    public func clear() { lock.withLock { value = nil } }
}
