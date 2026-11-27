import Foundation

public struct UserToken: Sendable, Equatable {
    public let userId: String?
    public let token: String

    public init(userId: String?, token: String) {
        self.userId = userId
        self.token = token
    }
}

public final class AccountOwner: @unchecked Sendable {
    private let lock = NSLock()
    private var bound: String?

    public init(_ userId: String?) { bound = userId }

    public var userId: String? { lock.withLock { bound } }

    @discardableResult
    public func bind(_ userId: String) -> Bool {
        lock.withLock {
            if let bound { return bound == userId }
            bound = userId
            return true
        }
    }
}

public enum BoundToken {
    public static func make(owner: String?, _ provider: @escaping @MainActor () async -> UserToken?) -> @MainActor () async -> String? {
        make(owner: AccountOwner(owner), provider)
    }

    public static func make(owner: AccountOwner, _ provider: @escaping @MainActor () async -> UserToken?) -> @MainActor () async -> String? {
        {
            guard let o = owner.userId, let t = await provider(), t.userId == o else { return nil }
            return t.token
        }
    }
}
