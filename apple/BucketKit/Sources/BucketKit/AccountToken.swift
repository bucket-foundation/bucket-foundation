import Foundation

public enum AccountTokenFailure: String, Error, Equatable, Sendable {
    case signedOut = "signed_out"
    case unauthorized
    case timeout
    case offline
    case unavailable
    case server
    case decode
}

extension BucketAPI {
    public func appAccountToken(token: String) async throws -> UUID {
        var r = URLRequest(url: base.appending(path: "api/app-store/account-token"))
        r.httpMethod = "POST"
        r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization")
        r.cachePolicy = .reloadIgnoringLocalCacheData
        let data: Data
        let http: HTTPURLResponse
        do {
            (data, http) = try await transport.send(r)
        } catch let e as URLError where e.code == .timedOut {
            throw AccountTokenFailure.timeout
        } catch {
            throw AccountTokenFailure.offline
        }
        switch http.statusCode {
        case 200: break
        case 401: throw AccountTokenFailure.unauthorized
        case 503: throw AccountTokenFailure.unavailable
        default: throw AccountTokenFailure.server
        }
        struct Reply: Decodable {
            let appAccountToken: String
            enum CodingKeys: String, CodingKey { case appAccountToken = "app_account_token" }
        }
        guard let reply = try? JSONDecoder().decode(Reply.self, from: data), let id = UUID(uuidString: reply.appAccountToken) else {
            throw AccountTokenFailure.decode
        }
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

    public func fetch(for account: Account) async -> Result<UUID, AccountTokenFailure> {
        guard let userId = account.session?.userId else { return .failure(.signedOut) }
        if let id = cached(for: userId) { return .success(id) }
        guard let bearer = await account.freshToken() else { return .failure(.unauthorized) }
        do {
            let id = try await api.appAccountToken(token: bearer)
            guard account.session?.userId == userId else { return .failure(.signedOut) }
            defaults.set(id.uuidString, forKey: Self.key(userId))
            return .success(id)
        } catch let failure as AccountTokenFailure {
            return .failure(failure)
        } catch {
            return .failure(.server)
        }
    }
}
