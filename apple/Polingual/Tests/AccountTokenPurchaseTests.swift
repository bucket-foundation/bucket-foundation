import BucketKit
import Foundation
import StoreKit
import Testing
@testable import Polingual

struct ServerTokenTransport: Transport {
    let issued: UUID
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let body = Data(#"{"app_account_token":"\#(issued.uuidString.lowercased())"}"#.utf8)
        return (body, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}

@MainActor
@Test func purchaseOptionsCarryTheFetchedAccountToken() async throws {
    let issued = UUID()
    let api = BucketAPI(transport: ServerTokenTransport(issued: issued))
    let live = Session(accessToken: "b", refreshToken: "r", expiresAt: 9_999_999_999, userId: UUID().uuidString)
    let tokens = AccountTokens(api: api, vault: MemoryAccountTokenVault())
    let fetched = await tokens.fetch(for: Account(api: api, store: MemorySessionStore(live)))
    #expect(try fetched.get() == issued)
    let options = try PurchaseOptions.make(fetched).get()
    #expect(options.count == 1)
    #expect(options.allSatisfy { String(describing: $0).localizedCaseInsensitiveContains(issued.uuidString) })
}

@Test func aSignedInPurchaseWithoutATokenIsBlocked() throws {
    for kind in [AccountTokenFailure.unauthorized, .userChanged, .timeout, .offline, .unavailable, .server, .decode] {
        #expect(PurchaseOptions.make(.failure(kind)).map(\.count) == .failure(kind))
    }
    #expect(try PurchaseOptions.make(.failure(.signedOut)).get().isEmpty)
}
