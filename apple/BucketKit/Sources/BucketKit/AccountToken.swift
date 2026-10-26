import Foundation

extension BucketAPI {
    public func appAccountToken(token: String) async throws -> UUID {
        var r = URLRequest(url: base.appending(path: "api/app-store/account-token"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, http) = try await transport.send(r)
        if http.statusCode == 401 { throw BucketError.revoked }
        struct Reply: Decodable { let token: String }
        let reply: Reply = try decode(data, http)
        guard let id = UUID(uuidString: reply.token) else { throw BucketError.decoding }
        return id
    }
}

@MainActor
public final class AccountTokens {
    let api: BucketAPI
    let defaults: UserDefaults

    public init(api: BucketAPI = BucketAPI(), defaults: UserDefaults = .standard) {
        self.api = api
        self.defaults = defaults
    }

    public static func key(_ userId: String) -> String { "appAccountToken.\(userId)" }

    public func cached(for userId: String) -> UUID? {
        defaults.string(forKey: Self.key(userId)).flatMap(UUID.init(uuidString:))
    }

    public func token(for account: Account) async -> UUID? {
        guard let userId = account.session?.userId else { return nil }
        if let id = cached(for: userId) { return id }
        guard let bearer = await account.freshToken(), let id = try? await api.appAccountToken(token: bearer) else { return nil }
        guard account.session?.userId == userId else { return nil }
        defaults.set(id.uuidString, forKey: Self.key(userId))
        return id
    }
}
