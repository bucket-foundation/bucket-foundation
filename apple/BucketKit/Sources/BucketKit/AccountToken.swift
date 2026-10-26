import Foundation
import Security

public enum AccountTokenFailure: String, Error, Equatable, Sendable {
    case signedOut = "signed_out"
    case userChanged = "user_changed"
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

public protocol AccountTokenVault: Sendable {
    func load(for userId: String) -> UUID?
    func save(_ token: UUID, for userId: String)
}

public struct KeychainAccountTokenVault: AccountTokenVault {
    let service: String

    public init(service: String = "foundation.bucket.app-account-token") { self.service = service }

    func query(_ userId: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: userId]
    }

    public func load(for userId: String) -> UUID? {
        var q = query(userId)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8).flatMap(UUID.init(uuidString:))
    }

    public func save(_ token: UUID, for userId: String) {
        SecItemDelete(query(userId) as CFDictionary)
        var q = query(userId)
        q[kSecValueData as String] = Data(token.uuidString.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }
}

public final class MemoryAccountTokenVault: AccountTokenVault, @unchecked Sendable {
    private let lock = NSLock()
    private var tokens: [String: UUID] = [:]

    public init() {}

    public func load(for userId: String) -> UUID? { lock.withLock { tokens[userId] } }
    public func save(_ token: UUID, for userId: String) { lock.withLock { tokens[userId] = token } }
}

@MainActor
public final class AccountTokens {
    let api: BucketAPI
    let vault: AccountTokenVault

    public init(api: BucketAPI = BucketAPI(), vault: AccountTokenVault = KeychainAccountTokenVault()) {
        self.api = api
        self.vault = vault
    }

    public func cached(for userId: String) -> UUID? { vault.load(for: userId) }

    public func fetch(for account: Account) async -> Result<UUID, AccountTokenFailure> {
        guard let userId = account.session?.userId else { return .failure(.signedOut) }
        if let id = cached(for: userId) { return .success(id) }
        guard let bearer = await account.freshToken() else { return .failure(account.session == nil ? .unauthorized : .offline) }
        guard account.session?.userId == userId else { return .failure(.userChanged) }
        do {
            let id = try await api.appAccountToken(token: bearer)
            guard account.session?.userId == userId else { return .failure(.userChanged) }
            vault.save(id, for: userId)
            return .success(id)
        } catch let failure as AccountTokenFailure {
            return .failure(failure)
        } catch {
            return .failure(.server)
        }
    }
}
