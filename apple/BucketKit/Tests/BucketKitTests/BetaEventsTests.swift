import Foundation
import Testing
@testable import BucketKit

final class RecordingTransport: Transport, @unchecked Sendable {
    var statuses: [Int]
    var bodies: [Data] = []
    init(_ statuses: [Int]) { self.statuses = statuses }
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        bodies.append(request.httpBody ?? Data())
        let status = statuses.isEmpty ? 200 : statuses.removeFirst()
        return (Data("{}".utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

func betaFile() -> URL { FileManager.default.temporaryDirectory.appending(path: "beta-\(UUID().uuidString).json") }

@Test func betaEventsBatchAndClearOnSuccess() async throws {
    let t = RecordingTransport([200, 200, 200])
    let d = UUID().uuidString
    let beta = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: d)
    for i in 0..<150 { await beta.log(BetaEvent(name: "card_answered", sessionId: nil, props: ["correct": .bool(i % 2 == 0)]), owner: "a") }
    let r = await beta.flush(token: "tok", owner: "a")
    #expect(r == BetaFlush(sent: 150, kept: 0))
    #expect(t.bodies.count == 2)
    let first = try JSONSerialization.jsonObject(with: t.bodies[0]) as! [String: Any]
    #expect(first["app"] as? String == "polingual")
    #expect((first["events"] as! [Any]).count == 100)
}

@Test func betaEventsKeepTheQueueOnServerErrorsAndSurviveRestart() async {
    let file = betaFile()
    let d = UUID().uuidString
    let beta = BetaEvents(app: "bucket", transport: RecordingTransport([503]), file: file, suite: d)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "a")
    #expect(await beta.flush(token: "tok", owner: "a") == BetaFlush(sent: 0, kept: 1))
    let again = BetaEvents(app: "bucket", transport: RecordingTransport([200]), file: file, suite: d)
    #expect(await again.pending == 1)
    #expect(await again.flush(token: "tok", owner: "a") == BetaFlush(sent: 1, kept: 0))
}

@Test func betaEventsStopWhenOptedOut() async {
    let d = UUID().uuidString
    let beta = BetaEvents(app: "bucket", transport: RecordingTransport([200]), file: betaFile(), suite: d)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "a")
    await beta.setOptedOut(true, token: nil)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "a")
    #expect(await beta.pending == 0)
}

@Test func betaFlagsFallBackAndParseTheServerShape() {
    #expect(BetaFlags().newWords == 4)
    #expect(BetaFlags().crossLanguageOptions)
    let f = BetaFlags.parse(Data(#"{"cohort":"default","flags":{"new_words":{"value":"8","arm":"8","source":"hash"},"option_language":{"value":"cross","arm":"cross","source":"hash"}}}"#.utf8))
    #expect(f?.newWords == 8)
    #expect(f?.crossLanguageOptions == true)
    #expect(f?.cognateHints == false)
}

@Test func optOutWithoutNetworkIsRetriedWithTheNextToken() async throws {
    let d = UUID().uuidString
    let down = RecordingTransport([503])
    let beta = BetaEvents(app: "bucket", transport: down, file: betaFile(), suite: d)
    await beta.setOptedOut(true, token: "tok")
    #expect(await beta.pendingOptOut == true)
    let up = RecordingTransport([200])
    let later = BetaEvents(app: "bucket", transport: up, file: betaFile(), suite: d)
    _ = await later.flush(token: "tok", owner: "a")
    #expect(await later.pendingOptOut == nil)
    let body = try JSONSerialization.jsonObject(with: up.bodies[0]) as? [String: Bool]
    #expect(body?["opted_out"] == true)
    let offline = BetaEvents(app: "bucket", transport: RecordingTransport([200]), file: betaFile(), suite: UUID().uuidString)
    await offline.setOptedOut(true, token: nil)
    #expect(await offline.pendingOptOut == true)
}

@Test func signingOutDropsTheQueueSoAnotherAccountNeverSendsIt() async {
    let d = UUID().uuidString
    let t = RecordingTransport([200, 200])
    let beta = BetaEvents(app: "bucket", transport: t, file: betaFile(), suite: d)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "user-a")
    await beta.clearQueue()
    #expect(await beta.pending == 0)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "user-a")
    #expect(await beta.flush(token: "tok-b", owner: "user-b") == BetaFlush(sent: 0, kept: 0))
    #expect(t.bodies.isEmpty)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "user-b")
    #expect(await beta.flush(token: "tok-b", owner: "user-b") == BetaFlush(sent: 1, kept: 0))
}

@Test func streakBandsSplitAtSevenThirtyAndHundred() {
    #expect(StreakBand.of(0) == .under7 && StreakBand.of(6) == .under7)
    #expect(StreakBand.of(7) == .week && StreakBand.of(29) == .week)
    #expect(StreakBand.of(30) == .month && StreakBand.of(99) == .month)
    #expect(StreakBand.of(100) == .hundred && StreakBand.of(400) == .hundred)
    #expect(StreakBand.of(-3) == .under7)
}

@Test func answeredEventsCarryStreakDayOnlyWhenGiven() {
    let with = BetaEvent.answeredProps(deck: "lang:fr", correct: true, ms: 800, kind: "recall", streak: 31)
    #expect(with["streak_day"] == .number(31) && with["streak_band"] == .string("30-99"))
    let without = BetaEvent.answeredProps(deck: "lang:fr", correct: true, ms: 800, kind: "recall")
    #expect(without["streak_day"] == nil && without["streak_band"] == nil)
}

@Test func wordEventsNameLanguageItemStageAndStreak() throws {
    let props = BetaEvent.wordProps(lang: "nl", itemId: "learn", stage: "intro", streak: 7)
    #expect(props["lang"] == .string("nl") && props["item"] == .string("learn") && props["stage"] == .string("intro"))
    #expect(props["streak_day"] == .number(7) && props["streak_band"] == .string("7-29"))
    let body = try JSONEncoder().encode(BetaEvent(name: "word_heard", sessionId: "s", props: props))
    let json = try #require(try JSONSerialization.jsonObject(with: body) as? [String: Any])
    let sent = try #require(json["props"] as? [String: Any])
    #expect(sent["streak_band"] as? String == "7-29" && sent["streak_day"] as? Double == 7)
}

@Test func knownLanguagesEventMatchesTheIngestRules() throws {
    let known = KnownLanguages(["es", "en", "ang"])
    let event = try #require(BetaEvent.known(known, source: .updateSheet, sessionId: "s"))
    #expect(event.name == "known_languages_set")
    #expect(event.props == ["count": .number(3), "codes": .string("ang,en,es"), "source": .string("update_sheet")])
    let body = try #require(String(data: JSONEncoder().encode(event.props["count"]), encoding: .utf8))
    #expect(body == "3")
    #expect(Set(KnownSource.allCases.map(\.rawValue)) == ["onboarding", "settings", "update_sheet"])
    #expect(BetaEvent.known(KnownLanguages([]), source: .onboarding, sessionId: nil) == nil)
    let many = try #require(BetaEvent.knownProps(KnownLanguages(Lang.codes), source: .settings))
    #expect(many["count"] == .number(Double(Lang.codes.count)))
    guard case .string(let codes) = many["codes"] else { Issue.record("codes missing"); return }
    #expect(codes.wholeMatch(of: /[a-z]{2,3}(,[a-z]{2,3}){0,7}/) != nil)
}

@Test func guestEventIsHeldAndSentAtSignIn() async throws {
    let d = UUID().uuidString
    let t = RecordingTransport([200])
    let beta = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: d)
    let first = try #require(BetaEvent.known(KnownLanguages(["en"]), source: .onboarding, sessionId: nil))
    let second = try #require(BetaEvent.known(KnownLanguages(["en", "es"]), source: .settings, sessionId: nil))
    await beta.hold(first)
    await beta.hold(second)
    #expect(await beta.pending == 0)
    #expect(await beta.held == [second])
    #expect(await beta.flush(token: nil, owner: nil) == BetaFlush(sent: 0, kept: 0))
    #expect(await beta.held == [second])
    let again = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: d)
    #expect(await again.flush(token: "tok", owner: "user-a") == BetaFlush(sent: 1, kept: 0))
    #expect(await again.held.isEmpty)
    #expect(await again.owner == "user-a")
    let sent = try JSONSerialization.jsonObject(with: t.bodies[0]) as! [String: Any]
    let events = sent["events"] as! [[String: Any]]
    #expect(events.count == 1)
    #expect((events[0]["props"] as! [String: Any])["codes"] as? String == "en,es")
}

@Test func heldGuestEventSurvivesAStaleQueueOwnerAndAFailedSend() async throws {
    let d = UUID().uuidString
    let t = RecordingTransport([503, 200])
    let beta = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: d)
    await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "user-a")
    await beta.hold(try #require(BetaEvent.known(KnownLanguages(["fr"]), source: .onboarding, sessionId: nil)))
    #expect(await beta.flush(token: "tok-b", owner: "user-b") == BetaFlush(sent: 0, kept: 1))
    #expect(await beta.held.isEmpty)
    #expect(await beta.flush(token: "tok-b", owner: "user-b") == BetaFlush(sent: 1, kept: 0))
    let sent = try JSONSerialization.jsonObject(with: t.bodies[1]) as! [String: Any]
    #expect(((sent["events"] as! [[String: Any]]).map { $0["name"] as? String }) == ["known_languages_set"])
}

@Test func signOutAndOptOutDropAHeldGuestEvent() async throws {
    let event = try #require(BetaEvent.known(KnownLanguages(["de"]), source: .onboarding, sessionId: nil))
    let t = RecordingTransport([])
    let a = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: UUID().uuidString)
    await a.hold(event)
    await a.clearQueue()
    #expect(await a.held.isEmpty)
    let b = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: UUID().uuidString)
    await b.hold(event)
    await b.setOptedOut(true, token: nil)
    #expect(await b.held.isEmpty)
    await b.hold(event)
    #expect(await b.held.isEmpty)
    #expect(t.bodies.isEmpty)
}

@Test func onlyASignedOutLearnerHoldsAnEventForSignIn() async throws {
    #expect(BetaRoute.of(owner: "user-a", signedIn: true) == .log("user-a"))
    #expect(BetaRoute.of(owner: nil, signedIn: false) == .hold)
    #expect(BetaRoute.of(owner: nil, signedIn: true) == .drop)
    let event = try #require(BetaEvent.known(KnownLanguages(["en"]), source: .settings, sessionId: nil))
    let beta = BetaEvents(app: "polingual", transport: RecordingTransport([]), file: betaFile(), suite: UUID().uuidString)
    await beta.record(event, route: .drop)
    #expect(await beta.pending == 0)
    #expect(await beta.held.isEmpty)
    await beta.record(event, route: .hold)
    #expect(await beta.held == [event])
    await beta.record(event, route: .log("user-a"))
    #expect(await beta.pending == 1)
    #expect(await beta.owner == "user-a")
}

@MainActor @Test func aLogBeforeSignOutNeverLandsAfterIt() async {
    let t = RecordingTransport([])
    for _ in 0..<20 {
        let beta = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: UUID().uuidString)
        let ordered = OrderedTasks()
        for _ in 0..<5 { ordered.run { await beta.log(BetaEvent(name: "app_open", sessionId: nil), owner: "user-a") } }
        ordered.run { await beta.clearQueue() }
        await ordered.drain()
        #expect(await beta.pending == 0)
        #expect(await beta.owner == nil)
    }
}

@Test func aHeldEventPastTheServerAgeLimitIsRestampedAtSignIn() async throws {
    let d = UUID().uuidString
    let t = RecordingTransport([200])
    let beta = BetaEvents(app: "polingual", transport: t, file: betaFile(), suite: d)
    let made = Date(timeIntervalSince1970: 1_800_000_000)
    let props = try #require(BetaEvent.knownProps(KnownLanguages(["en", "es"]), source: .onboarding))
    let old = BetaEvent(name: BetaEvent.knownName, at: made, sessionId: "s", props: props)
    await beta.hold(old)
    let later = made.addingTimeInterval(40 * 86_400)
    #expect(await beta.flush(token: "tok", owner: "user-a", now: later) == BetaFlush(sent: 1, kept: 0))
    let sent = try JSONSerialization.jsonObject(with: t.bodies[0]) as! [String: Any]
    let event = try #require((sent["events"] as? [[String: Any]])?.first)
    #expect(event["ts"] as? String == ISO8601DateFormatter().string(from: later))
    #expect(event["id"] as? String == old.id)
    #expect((event["props"] as? [String: Any])?["codes"] as? String == "en,es")
}

@Test func aRecentHeldEventKeepsItsTimeAtSignIn() {
    let made = Date(timeIntervalSince1970: 1_800_000_000)
    let event = BetaEvent(name: BetaEvent.knownName, at: made, sessionId: nil)
    #expect(event.restamped(at: made.addingTimeInterval(28 * 86_400)) == event)
    #expect(event.restamped(at: made.addingTimeInterval(30 * 86_400)).ts != event.ts)
}
