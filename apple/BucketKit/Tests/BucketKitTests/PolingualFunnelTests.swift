import Foundation
import Testing
@testable import BucketKit

struct PolingualFunnelTests {
    func funnel(_ transport: any Transport = ReportTransport([])) -> (PolingualFunnel, UserDefaults) {
        let d = UserDefaults(suiteName: "funnel-\(UUID().uuidString)")!
        return (PolingualFunnel(defaults: d, transport: transport, makeId: { "0d2c5c1e-4a8e-4f7b-9a59-1c2d3e4f5a6b" }), d)
    }

    func decode(_ data: Data?) -> [String: Any]? {
        data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }

    @Test func heardAboutBodyMatchesTheWebEventShape() throws {
        let (f, _) = funnel()
        let json = try #require(decode(f.body("heard_about", detail: "tiktok", lang: "en")))
        #expect(json["visitor"] as? String == "0d2c5c1e-4a8e-4f7b-9a59-1c2d3e4f5a6b")
        let events = try #require(json["events"] as? [[String: String]])
        #expect(events == [["name": "heard_about", "path": "/ios", "detail": "tiktok", "lang": "en"]])
    }

    @Test func heardAboutSendsOncePerInstall() {
        let (f, _) = funnel()
        #expect(f.body("heard_about", detail: "friend") != nil)
        #expect(f.body("heard_about", detail: "reddit") == nil)
        #expect(f.body("onboarding_view", detail: "speak") != nil)
        #expect(f.body("onboarding_view", detail: "speak") != nil)
    }

    @Test func unknownAndBillingNamesAreDropped() {
        let (f, _) = funnel()
        #expect(f.body("trial_start") == nil)
        #expect(f.body("paid") == nil)
        #expect(f.body("made_up") == nil)
    }

    @Test func visitorStaysTheSameAcrossCalls() {
        let d = UserDefaults(suiteName: "funnel-\(UUID().uuidString)")!
        let counter = IdCounter()
        let f = PolingualFunnel(defaults: d, transport: ReportTransport([]), makeId: { counter.next() })
        #expect(f.visitor == f.visitor)
        #expect(counter.count == 1)
    }

    @Test func sendPostsToPolingualWithTheIosClientHeader() async throws {
        let t = ReportTransport([200])
        let (f, _) = funnel(t)
        #expect(await f.send("heard_about", detail: "app_store") == 200)
        let r = try #require(t.requests.first)
        #expect(r.url == PolingualFunnel.eventsURL)
        #expect(r.httpMethod == "POST")
        #expect(r.value(forHTTPHeaderField: "x-polingual-client") == "ios")
        #expect(await f.send("heard_about", detail: "app_store") == nil)
        #expect(t.requests.count == 1)
    }

    @Test func offlineSendReturnsNilWithoutThrowing() async {
        let (f, _) = funnel(ReportTransport([nil]))
        #expect(await f.send("onboarding_view", detail: "heard_about") == nil)
    }

    @Test func heardSourceKeysAreServerTags() {
        let keys = HeardSource.all.map(\.key)
        #expect(Set(keys).count == keys.count)
        #expect(keys.allSatisfy { $0.range(of: "^[a-z0-9_]+$", options: .regularExpression) != nil })
        #expect(keys.contains("app_store"))
        #expect(!keys.contains("google_play"))
        #expect(keys.last == "other")
    }
}

final class IdCounter: @unchecked Sendable {
    let lock = NSLock()
    var count = 0
    func next() -> String {
        lock.withLock {
            count += 1
            return UUID().uuidString.lowercased()
        }
    }
}
