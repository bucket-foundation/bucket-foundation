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

    @Test func heardAboutSendsOncePerInstall() async {
        let t = ReportTransport([])
        let (f, _) = funnel(t)
        #expect(await f.send("heard_about", detail: "friend") == 200)
        #expect(await f.send("heard_about", detail: "reddit") == nil)
        #expect(f.body("heard_about", detail: "reddit") == nil)
        #expect(await f.send("onboarding_view", detail: "speak") == 200)
        #expect(await f.send("onboarding_view", detail: "speak") == 200)
        #expect(t.requests.count == 3)
    }

    @Test func unknownAndBillingNamesAreDropped() {
        let (f, _) = funnel()
        #expect(f.body("trial_start") == nil)
        #expect(f.body("paid") == nil)
        #expect(f.body("made_up") == nil)
    }

    @Test func signupAndFirstLessonSendOnceWhilePaywallViewsRepeat() async {
        let (f, _) = funnel()
        #expect(await f.send("signup") == 200)
        #expect(await f.send("signup") == nil)
        #expect(await f.send("first_lesson") == 200)
        #expect(await f.send("first_lesson") == nil)
        #expect(await f.send("paywall_view") == 200)
        #expect(await f.send("paywall_view") == 200)
    }

    @Test func bodyLeavesTheOnceFlagAlone() {
        let (f, _) = funnel()
        #expect(f.body("signup") != nil)
        #expect(f.body("signup") != nil)
        #expect(!f.sent("signup"))
    }

    @Test func failedOnceEventIsRetriedOnTheNextSend() async {
        let t = ReportTransport([nil, 503, 200])
        let (f, _) = funnel(t)
        #expect(await f.send("first_lesson") == nil)
        #expect(!f.sent("first_lesson"))
        #expect(await f.send("first_lesson") == 503)
        #expect(!f.sent("first_lesson"))
        #expect(await f.send("first_lesson") == 200)
        #expect(f.sent("first_lesson"))
        #expect(await f.send("first_lesson") == nil)
        #expect(t.requests.count == 3)
    }

    @Test func permanentClientErrorsSettleWhileThrottlingRetries() {
        #expect(PolingualFunnel.settles(200))
        #expect(PolingualFunnel.settles(400))
        #expect(PolingualFunnel.settles(422))
        #expect(!PolingualFunnel.settles(408))
        #expect(!PolingualFunnel.settles(429))
        #expect(!PolingualFunnel.settles(500))
        #expect(!PolingualFunnel.settles(503))
    }

    @Test func rejectedOnceEventIsNotResent() async {
        let t = ReportTransport([422])
        let (f, _) = funnel(t)
        #expect(await f.send("heard_about", detail: "tiktok") == 422)
        #expect(await f.send("heard_about", detail: "tiktok") == nil)
        #expect(t.requests.count == 1)
    }

    @Test func concurrentOnceSendsPostOnce() async {
        let t = ReportTransport([], delay: .milliseconds(50))
        let (f, _) = funnel(t)
        async let a = f.send("signup")
        async let b = f.send("signup")
        let results = await [a, b]
        #expect(results.compactMap { $0 } == [200])
        #expect(t.requests.count == 1)
    }

    @Test func signupStepFollowsTheServerNewAccountFlag() throws {
        let fresh = try JSONDecoder().decode(Session.self, from: Data(#"{"access_token":"a","refresh_token":"r","expires_at":1,"user_id":"u","new_account":true}"#.utf8))
        let returning = try JSONDecoder().decode(Session.self, from: Data(#"{"access_token":"a","refresh_token":"r","expires_at":1,"user_id":"u","new_account":false}"#.utf8))
        let stored = try JSONDecoder().decode(Session.self, from: Data(#"{"access_token":"a","refresh_token":"r","expires_at":1,"user_id":"u"}"#.utf8))
        #expect(PolingualFunnel.signupStep(fresh) == "signup")
        #expect(PolingualFunnel.signupStep(returning) == nil)
        #expect(PolingualFunnel.signupStep(stored) == nil)
        #expect(PolingualFunnel.signupStep(nil) == nil)
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
