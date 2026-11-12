import Foundation
import Testing
@testable import BucketKit

final class FoundingTransport: Transport, @unchecked Sendable {
    var replies: [(Int, String)]
    var requests: [URLRequest] = []
    init(_ replies: [(Int, String)]) { self.replies = replies }
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        let (status, body) = replies.isEmpty ? (200, "{}") : replies.removeFirst()
        return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

@Test func foundingParsesTheServerShape() {
    #expect(FoundingTester.parse(Data(#"{"founding":true}"#.utf8)) == true)
    #expect(FoundingTester.parse(Data(#"{"founding":false}"#.utf8)) == false)
    #expect(FoundingTester.parse(Data(#"{"error":"unauthorized"}"#.utf8)) == nil)
}

@Test func foundingAsksTheEntitlementRouteWithTheBearerToken() async throws {
    let d = UserDefaults(suiteName: UUID().uuidString)!
    let t = FoundingTransport([(200, #"{"founding":true}"#)])
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", base: URL(string: "https://bucket.test")!, transport: t, defaults: d))
    let r = try #require(t.requests.first)
    #expect(r.url?.absoluteString == "https://bucket.test/api/polingual/entitlement")
    #expect(r.value(forHTTPHeaderField: "authorization") == "Bearer tok")
}

@Test func foundingIsFalseWhenNoAccountWasEverSeen() async {
    let t = FoundingTransport([(200, #"{"founding":true}"#)])
    #expect(await FoundingTester.fetch(user: nil, token: nil, transport: t, defaults: UserDefaults(suiteName: UUID().uuidString)!) == false)
    #expect(t.requests.isEmpty)
}

@Test func foundingKeepsTheLastAnswerPerAccountWhenTheServerFails() async {
    let d = UserDefaults(suiteName: UUID().uuidString)!
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(200, #"{"founding":true}"#)]), defaults: d))
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(503, "")]), defaults: d))
    #expect(await FoundingTester.fetch(user: "u2", token: "tok", transport: FoundingTransport([(503, "")]), defaults: d) == false)
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(200, #"{"founding":false}"#)]), defaults: d) == false)
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(503, "")]), defaults: d) == false)
}

@Test func foundingKeepsACachedTrueOffline() async {
    let d = UserDefaults(suiteName: UUID().uuidString)!
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(200, #"{"founding":true}"#)]), defaults: d))
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: OfflineTransport(), defaults: d))
}

@Test func foundingKeepsACachedTrueWithoutATokenOrRestoredSession() async {
    let d = UserDefaults(suiteName: UUID().uuidString)!
    #expect(await FoundingTester.fetch(user: "u1", token: "tok", transport: FoundingTransport([(200, #"{"founding":true}"#)]), defaults: d))
    let t = FoundingTransport([(200, #"{"founding":false}"#)])
    #expect(await FoundingTester.fetch(user: "u1", token: nil, transport: t, defaults: d))
    #expect(await FoundingTester.fetch(user: nil, token: nil, transport: t, defaults: d))
    #expect(t.requests.isEmpty)
    FoundingTester.forget(defaults: d)
    #expect(await FoundingTester.fetch(user: nil, token: nil, transport: t, defaults: d) == false)
}

struct OfflineTransport: Transport {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) { throw URLError(.notConnectedToInternet) }
}
