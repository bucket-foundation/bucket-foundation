import Foundation

public struct UserToken: Sendable, Equatable {
    public let userId: String?
    public let token: String

    public init(userId: String?, token: String) {
        self.userId = userId
        self.token = token
    }
}

public enum BoundToken {
    public static func make(owner: String?, _ provider: @escaping @MainActor () async -> UserToken?) -> @MainActor () async -> String? {
        {
            guard let owner, let t = await provider(), t.userId == owner else { return nil }
            return t.token
        }
    }
}

extension Account {
    public func userToken() async -> UserToken? {
        guard let t = await freshToken() else { return nil }
        return UserToken(userId: session?.userId, token: t)
    }
}
