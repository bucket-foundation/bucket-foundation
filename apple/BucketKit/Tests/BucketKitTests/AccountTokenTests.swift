import Foundation
import Security
import Testing
@testable import BucketKit

final class TokenCalls: @unchecked Sendable {
    var requests: [URLRequest] = []
}

struct ThrowingTransport: Transport {
    let error: URLError
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) { throw error }
}

func serverTokenReply(_ id: UUID) -> Data {
    Data(#"{"app_account_token":"\#(id.uuidString.lowercased())"}"#.utf8)
}

let liveSession = Session(accessToken: "bearer-1", refreshToken: "r", expiresAt: 9_999_999_999, userId: "user-1")

@MainActor
@Test func accountTokenDecodesTheServerReplyAndCachesPerUser() async throws {
    let calls = TokenCalls()
    let issued = UUID()
    let api = BucketAPI(transport: StubTransport { r in
        calls.requests.append(r)
        return (200, serverTokenReply(issued))
    })
    let tokens = AccountTokens(api: api, vault: MemoryAccountTokenVault())
    let account = Account(api: api, store: MemorySessionStore(liveSession))
    #expect(try await tokens.fetch(for: account).get() == issued)
    #expect(try await tokens.fetch(for: account).get() == issued)
    #expect(calls.requests.count == 1)
    #expect(calls.requests[0].httpMethod == "POST")
    #expect(calls.requests[0].url?.path == "/api/app-store/account-token")
    #expect(calls.requests[0].value(forHTTPHeaderField: "authorization") == "Bearer bearer-1")
    #expect(tokens.cached(for: "user-1") == issued)
    #expect(tokens.cached(for: "user-2") == nil)
}

@MainActor
@Test func accountTokenFailuresKeepTheirKind() async throws {
    func failure(_ transport: Transport) async throws -> AccountTokenFailure? {
        let api = BucketAPI(transport: transport)
        let tokens = AccountTokens(api: api, vault: MemoryAccountTokenVault())
        guard case .failure(let f) = await tokens.fetch(for: Account(api: api, store: MemorySessionStore(liveSession))) else { return nil }
        #expect(tokens.cached(for: "user-1") == nil)
        return f
    }
    #expect(try await failure(StubTransport { _ in (401, Data(#"{"error":"unauthorized"}"#.utf8)) }) == .unauthorized)
    #expect(try await failure(StubTransport { _ in (503, Data(#"{"error":"unavailable"}"#.utf8)) }) == .unavailable)
    #expect(try await failure(StubTransport { _ in (500, Data(#"{"error":"write_failed"}"#.utf8)) }) == .server)
    #expect(try await failure(StubTransport { _ in (200, Data(#"{"token":"\#(UUID().uuidString)"}"#.utf8)) }) == .decode)
    #expect(try await failure(StubTransport { _ in (200, Data(#"{"app_account_token":"nope"}"#.utf8)) }) == .decode)
    #expect(try await failure(ThrowingTransport(error: URLError(.timedOut))) == .timeout)
    #expect(try await failure(ThrowingTransport(error: URLError(.notConnectedToInternet))) == .offline)
    let api = BucketAPI(transport: StubTransport { _ in (200, serverTokenReply(UUID())) })
    let tokens = AccountTokens(api: api, vault: MemoryAccountTokenVault())
    #expect(await tokens.fetch(for: Account(api: api, store: MemorySessionStore())) == .failure(.signedOut))
}

struct SwitchingTransport: Transport {
    let account: Account
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        await MainActor.run { account.signOut() }
        return (serverTokenReply(UUID()), HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}

@MainActor
@Test func anAccountSwitchMidFetchNeverYieldsAToken() async throws {
    let account = Account(api: BucketAPI(transport: StubTransport { _ in (500, Data()) }), store: MemorySessionStore(liveSession))
    let vault = MemoryAccountTokenVault()
    let tokens = AccountTokens(api: BucketAPI(transport: SwitchingTransport(account: account)), vault: vault)
    #expect(await tokens.fetch(for: account) == .failure(.userChanged))
    #expect(vault.load(for: "user-1") == nil)
}

@MainActor
@Test func aFailedRefreshTellsOfflineFromUnauthorized() async throws {
    let expired = Session(accessToken: "old", refreshToken: "r", expiresAt: 0, userId: "user-1")
    let offline = BucketAPI(transport: ThrowingTransport(error: URLError(.notConnectedToInternet)))
    let a = Account(api: offline, store: MemorySessionStore(expired))
    #expect(await AccountTokens(api: offline, vault: MemoryAccountTokenVault()).fetch(for: a) == .failure(.offline))
    let revoked = BucketAPI(transport: StubTransport { _ in (401, Data(#"{"error":"unauthorized"}"#.utf8)) })
    let b = Account(api: revoked, store: MemorySessionStore(expired))
    #expect(await AccountTokens(api: revoked, vault: MemoryAccountTokenVault()).fetch(for: b) == .failure(.unauthorized))
}

@Test func keychainVaultKeepsOneTokenPerUser() {
    let vault = KeychainAccountTokenVault(service: "foundation.bucket.test.\(UUID())")
    let a = UUID(), b = UUID()
    vault.save(a, for: "user-1")
    vault.save(b, for: "user-2")
    vault.save(b, for: "user-1")
    #expect(vault.load(for: "user-1") == b)
    #expect(vault.load(for: "user-2") == b)
    #expect(vault.load(for: "user-3") == nil)
    for u in ["user-1", "user-2"] { SecItemDelete(vault.query(u) as CFDictionary) }
}
