import Foundation

public final class AccountDefaults: @unchecked Sendable {
    public static let perAccount: [String] = [
        "bucket.lang.placeQueue", "bucket.today.order", "groups.displayName", "groups.nameAsked",
        "polingual.firstSystem", "polingual.onboarded", "translate.targets", "content.hiddenStations",
    ]
    static let adoptedKey = "accounts.defaultsAdopted"

    public static let shared = AccountDefaults(defaults: .standard)

    let defaults: UserDefaults
    private let lock = NSLock()
    private var prefix: String?

    public init(defaults: UserDefaults) { self.defaults = defaults }

    public var active: String? { lock.withLock { prefix } }

    public func activate(_ accountKey: String?) {
        if let accountKey { adopt(accountKey) }
        lock.withLock { prefix = accountKey }
    }

    public func key(_ base: String) -> String {
        guard let p = active, Self.perAccount.contains(base) else { return base }
        return Self.scoped(p, base)
    }

    public static func key(_ base: String) -> String { shared.key(base) }

    static func scoped(_ accountKey: String, _ base: String) -> String { "\(accountKey).\(base)" }

    func adopt(_ accountKey: String) {
        guard defaults.string(forKey: Self.adoptedKey) == nil else { return }
        for base in Self.perAccount {
            let k = Self.scoped(accountKey, base)
            guard defaults.object(forKey: k) == nil, let v = defaults.object(forKey: base) else { continue }
            defaults.set(v, forKey: k)
        }
        if accountKey != AccountFolders.guest { defaults.set(accountKey, forKey: Self.adoptedKey) }
    }

    public func carry(from source: String, to target: String) {
        guard source != target else { return }
        for base in Self.perAccount {
            let from = Self.scoped(source, base)
            guard let v = defaults.object(forKey: from) else { continue }
            if defaults.object(forKey: Self.scoped(target, base)) == nil { defaults.set(v, forKey: Self.scoped(target, base)) }
            defaults.removeObject(forKey: from)
        }
    }

    public func remove(_ accountKey: String) {
        for base in Self.perAccount { defaults.removeObject(forKey: Self.scoped(accountKey, base)) }
        lock.withLock { if prefix == accountKey { prefix = AccountFolders.guest } }
    }
}
