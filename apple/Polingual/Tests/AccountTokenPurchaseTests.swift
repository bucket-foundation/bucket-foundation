import BucketKit
import Foundation
import StoreKit
import Testing
@testable import Polingual

struct IssuedTokenTransport: Transport {
    let issued: UUID
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let body = try JSONSerialization.data(withJSONObject: ["token": issued.uuidString])
        return (body, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}

@MainActor
@Test func purchaseOptionsCarryTheFetchedAccountToken() async throws {
    let issued = UUID()
    let api = BucketAPI(transport: IssuedTokenTransport(issued: issued))
    let userId = UUID().uuidString
    let live = Session(accessToken: "b", refreshToken: "r", expiresAt: 9_999_999_999, userId: userId)
    let tokens = AccountTokens(api: api, defaults: try #require(UserDefaults(suiteName: "purchase-token-\(UUID())")))
    let fetched = await tokens.token(for: Account(api: api, store: MemorySessionStore(live)))
    #expect(fetched == issued)
    let options = PurchaseOptions.make(accountToken: fetched)
    #expect(options.count == 1)
    #expect(options.allSatisfy { String(describing: $0).localizedCaseInsensitiveContains(issued.uuidString) })
    #expect(PurchaseOptions.make(accountToken: nil).isEmpty)
}
