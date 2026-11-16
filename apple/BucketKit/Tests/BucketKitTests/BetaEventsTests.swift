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
