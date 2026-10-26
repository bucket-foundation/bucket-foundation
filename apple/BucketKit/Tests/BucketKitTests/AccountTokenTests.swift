import Foundation
import Testing
@testable import BucketKit

final class TokenCalls: @unchecked Sendable {
    var requests: [URLRequest] = []
}

@MainActor
@Test func accountTokenIsFetchedOncePerUserAndCached() async throws {
    let calls = TokenCalls()
    let issued = UUID()
    let api = BucketAPI(transport: StubTransport { r in
        calls.requests.append(r)
        return (200, json(["token": issued.uuidString]))
    })
    let defaults = try #require(UserDefaults(suiteName: "account-token-\(UUID())"))
    let live = Session(accessToken: "bearer-1", refreshToken: "r", expiresAt: 9_999_999_999, userId: "user-1")
    let account = Account(api: api, store: MemorySessionStore(live))
    let tokens = AccountTokens(api: api, defaults: defaults)
    #expect(await tokens.token(for: account) == issued)
    #expect(await tokens.token(for: account) == issued)
    #expect(calls.requests.count == 1)
    #expect(calls.requests[0].httpMethod == "POST")
    #expect(calls.requests[0].url?.path == "/api/app-store/account-token")
    #expect(calls.requests[0].value(forHTTPHeaderField: "authorization") == "Bearer bearer-1")
    #expect(tokens.cached(for: "user-1") == issued)
    #expect(tokens.cached(for: "user-2") == nil)
}

@MainActor
@Test func accountTokenIsNilWhenSignedOutOrRefused() async throws {
    let api = BucketAPI(transport: StubTransport { _ in (401, json(["error": "unauthorized"])) })
    let defaults = try #require(UserDefaults(suiteName: "account-token-\(UUID())"))
    let tokens = AccountTokens(api: api, defaults: defaults)
    #expect(await tokens.token(for: Account(api: api, store: MemorySessionStore())) == nil)
    let live = Session(accessToken: "b", refreshToken: "r", expiresAt: 9_999_999_999, userId: "user-1")
    #expect(await tokens.token(for: Account(api: api, store: MemorySessionStore(live))) == nil)
    #expect(tokens.cached(for: "user-1") == nil)
    await #expect(throws: BucketError.revoked) { try await api.appAccountToken(token: "b") }
    let bad = BucketAPI(transport: StubTransport { _ in (200, json(["token": "not-a-uuid"])) })
    await #expect(throws: BucketError.decoding) { try await bad.appAccountToken(token: "b") }
}
