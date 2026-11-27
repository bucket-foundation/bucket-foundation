import Foundation
import Testing
@testable import BucketKit

private func prefs(_ account: String? = "u1", _ d: UserDefaults = UserDefaults(suiteName: "ci14-\(UUID().uuidString)")!) -> StudyPrefs { StudyPrefs(d, account: account) }

private func meta(_ id: String = UUID().uuidString.lowercased(), at: Double = 1_000) -> LogRow.Meta {
    LogRow.Meta(id: id, at: at, device: "d-1", tz: "UTC", systemId: "sys")
}

private func vocab(_ id: String = UUID().uuidString.lowercased()) -> LogRow {
    .vocabTest(.init(meta: meta(id), lang: "es", phase: "baseline", form: "A", arm: "s70", hits: 30, words: 50, falseAlarms: 2, pseudowords: 20, known: 4123.4, day: 0, seconds: 180))
}

private let enrolled = InputExperiment.Enrolment(experiment: InputExperiment.experimentId, key: "acct:u1", arm: "s90", stratum: "to-a2", at: 5)

final class ScriptedTransport: Transport, @unchecked Sendable {
    var replies: [(Int, String)]
    var bodies: [[String: Any]] = []
    var paths: [String] = []
    init(_ replies: [(Int, String)]) { self.replies = replies }
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        paths.append(request.url!.path)
        bodies.append(request.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:])
        let (status, body) = replies.isEmpty ? (500, "{}") : replies.removeFirst()
        return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

@Test func vocabTestRowsRoundTripAndBatchLikeTheWeb() throws {
    let row = vocab("a1")
    let raw = try #require(ReviewLog.encode(row))
    #expect(ReviewLog.parse(raw) == row)
    let batch = try #require(ReviewLog.batch([row], gate: .open))
    #expect(batch.count == 1)
    #expect(batch[0]["name"] as? String == "vocab_test")
    let props = try #require(batch[0]["props"] as? [String: Any])
    #expect(Set(props.keys) == ["phase", "form", "arm", "hits", "words", "false_alarms", "pseudowords", "known", "day", "seconds"])
    #expect(props["false_alarms"] as? Int == 2)
    var bad = raw
    bad["hits"] = 51
    #expect(ReviewLog.parse(bad) == nil)
    bad = raw
    bad["arm"] = NSNull()
    guard case .vocabTest(let v) = ReviewLog.parse(bad) else { Issue.record("no row"); return }
    #expect(v.arm == nil)
    #expect(ReviewLog.batch((0..<6).map { vocab("v\($0)") }, gate: .open)?.count == ReviewLog.vocabTestCap)
}

@Test func vocabTestRowScoresAndDates() {
    let items = [YesNoTest.TestItem(word: "casa", real: true, band: 0), YesNoTest.TestItem(word: "brolo", real: false, band: nil)]
    guard case .vocabTest(let v) = YesNoTest.row(phase: "day28", lang: "es", items: items, yes: ["casa"], seconds: 99.6, enrolment: enrolled, meta: meta(at: 5 + 29 * 86_400_000)) else { Issue.record("no row"); return }
    #expect(v.form == "B")
    #expect(v.arm == "s90")
    #expect(v.day == 29)
    #expect(v.seconds == 100)
    #expect(v.hits == 1 && v.falseAlarms == 0)
}

@Test func consentPrefsFollowJoinLeaveAndGate() {
    let p = prefs()
    #expect(p.step(flag: true, now: 0) == nil)
    p.setGate(StudyGate(state: .open, at: 1))
    #expect(p.step(flag: false, now: 0) == nil)
    #expect(p.step(flag: true, now: 0) == .disclose)
    p.join()
    #expect(p.consent(flag: true) == InputExperiment.Consent(flag: true, uploadOpen: true, disclosed: true, optedOut: false))
    #expect(p.step(flag: true, now: 0) == .test("baseline"))
    p.markTaken("baseline")
    p.cache(enrolled)
    #expect(p.step(flag: true, now: 10) == nil)
    #expect(p.step(flag: true, now: 5 + 28 * 86_400_000) == .test("day28"))
    p.markTaken("day28")
    #expect(p.taken == (true, true))
    #expect(p.showsLeave(flag: true))
    p.leave()
    #expect(!InputExperiment.mayTakePart(p.consent(flag: true)))
    #expect(p.step(flag: true, now: 0) == nil)
}

@MainActor
@Test func uploaderProbesTheGateThenSendsAndClears() async {
    let t = ScriptedTransport([(200, #"{"outcome":"recorded"}"#), (200, #"{"outcome":"recorded","results":[]}"#)])
    let p = prefs()
    let u = StudyUploader(api: BucketAPI(transport: t), disk: MemoryLangDisk(), prefs: p, token: { "tok" }, now: { 100 })
    u.add([vocab(), .review(.init(meta: meta(), card: "es:x", rating: 3))])
    #expect(u.pending.count == 1)
    #expect(await u.flush() == .sent)
    #expect(p.gate.state == .open)
    #expect(t.paths == ["/api/academy/event", "/api/academy/event"])
    #expect((t.bodies[0]["events"] as? [Any])?.isEmpty == true)
    #expect((t.bodies[1]["events"] as? [Any])?.count == 1)
    #expect(u.pending.isEmpty)
}

@MainActor
@Test func uploaderClosesOnRefusalAndKeepsRowsOnRetry() async {
    let p = prefs()
    let closed = StudyUploader(api: BucketAPI(transport: ScriptedTransport([(200, #"{"outcome":"no_consent"}"#)])), disk: MemoryLangDisk(), prefs: p, token: { "tok" }, now: { 100 })
    closed.add([vocab()])
    #expect(await closed.flush() == .replayOnly)
    #expect(p.gate.state == .closed)
    #expect(closed.pending.isEmpty)
    closed.add([vocab()])
    #expect(closed.pending.isEmpty)

    let q = prefs()
    q.setGate(StudyGate(state: .open, at: 1))
    let retry = StudyUploader(api: BucketAPI(transport: ScriptedTransport([(500, "{}")])), disk: MemoryLangDisk(), prefs: q, token: { "tok" }, now: { 100 })
    retry.add([vocab()])
    #expect(await retry.flush() == .held)
    #expect(retry.pending.count == 1)
    #expect(q.gate.state == .open)

    let none = StudyUploader(api: BucketAPI(transport: ScriptedTransport([])), disk: MemoryLangDisk(), prefs: q, token: { nil })
    #expect(await none.flush() == .held)
}

@Test func gateFollowsServerOutcomes() {
    #expect(ReviewLog.gate(after: "recorded", from: .unknown) == .open)
    #expect(ReviewLog.gate(after: "under_age", from: .open) == .closed)
    #expect(ReviewLog.gate(after: "retry", from: .open) == .open)
    #expect(StudyGate(state: .closed, at: 0).probes(now: StudyGate.recheckMs))
    #expect(!StudyGate(state: .open, at: 0).probes(now: StudyGate.recheckMs))
}

private let open = InputExperiment.Consent(flag: true, uploadOpen: true, disclosed: true, optedOut: false)

private func compute(_ c: InputExperiment.Consent, _ e: InputExperiment.Enrolment?, _ key: String?) -> InputExperiment.ExperimentMix? {
    InputExperiment.mix(consent: c, enrolment: e, key: key, tier: 1, cards: 10, eligibleUnitSeconds: [9_000], now: 7)
}

@MainActor
@Test func theServerArmWinsOverTheLocalHash() async {
    let p = prefs()
    p.markTaken("baseline")
    var posted: [String] = []
    let got = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                        fetch: { _ in .known(nil) }, register: { _, s in posted.append(s); return enrolled },
                                        compute: compute, enrolment: \.enrolment)
    #expect(posted.count == 1)
    #expect(got?.arm == "s90")
    #expect(p.enrolment == enrolled)
}

@MainActor
@Test func noServerReplyMeansNoNewEnrolment() async {
    let p = prefs()
    p.markTaken("baseline")
    var posted = 0
    let failed = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                           fetch: { _ in .failed }, register: { _, _ in posted += 1; return enrolled }, compute: compute, enrolment: \.enrolment)
    #expect(failed?.arm == nil)
    #expect(posted == 0)
    let refused = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                            fetch: { _ in .known(nil) }, register: { _, _ in nil }, compute: compute, enrolment: \.enrolment)
    #expect(refused?.arm == nil)
    #expect(refused?.enrolment == nil)
    #expect(p.enrolment == nil)
}

@MainActor
@Test func storedServerEnrolmentIsCachedAndUsed() async {
    let p = prefs()
    let got = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                        fetch: { _ in .known(enrolled) }, register: { _, _ in Issue.record("posted"); return nil }, compute: compute, enrolment: \.enrolment)
    #expect(got?.arm == "s90")
    #expect(p.enrolment == enrolled)
}

@Test func enrolmentApiParsesReplies() async {
    let body = #"{"enrolment":{"experiment":"ci14-share-v1","key":"acct:u1","arm":"s50","stratum":"past-a2","at":12}}"#
    let t = ScriptedTransport([(200, #"{"enrolment":null}"#), (201, body), (503, "{}")])
    let api = BucketAPI(transport: t)
    #expect(await api.fetchEnrolment(token: "x") == .known(nil))
    #expect(await api.registerEnrolment(token: "x", stratum: "past-a2")?.arm == "s50")
    #expect(t.bodies[1]["stratum"] as? String == "past-a2")
    #expect(await api.fetchEnrolment(token: "x") == .failed)
}

@Test func heldOutWordsLeaveTheCardQueue() throws {
    let data = Data(#"{"forms":{"A":[{"word":"casa","real":true,"band":0},{"word":"brolo","real":false}],"B":[{"word":"perro","real":true,"band":1}]}}"#.utf8)
    let forms = try #require(YesNoTest.forms(data))
    let set = InputExperiment.heldOutWords(forms)
    #expect(set == ["casa", "perro"])
    #expect(YesNoTest.forms(Data("{}".utf8)) == nil)
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let word = try #require(corpus.items.first { $0.kind == .word && $0.forms["es"] != nil })
    let other = try #require(corpus.items.first { $0.kind == .word && $0.forms["es"] != nil && $0.forms["es"] != word.forms["es"] })
    let queue = [QueueEntry(itemId: word.id, lang: "es", stage: .intro), QueueEntry(itemId: other.id, lang: "es", stage: .intro)]
    let kept = InputExperiment.withoutHeldOut(queue, corpus: corpus, sets: ["es": [YesNoTest.normalizeWord(word.forms["es"]!)]])
    #expect(kept.map(\.itemId) == [other.id])
    #expect(InputExperiment.withoutHeldOut(queue, corpus: corpus, sets: [:]) == queue)
}

@Test func prefsBelongToOneAccount() {
    let d = UserDefaults(suiteName: "ci14-\(UUID().uuidString)")!
    let a = prefs("u1", d)
    a.setGate(StudyGate(state: .open, at: 1))
    a.join()
    a.markTaken("baseline")
    a.cache(enrolled)
    let b = prefs("u2", d)
    #expect(!b.disclosed && !b.optedOut)
    #expect(b.taken == (false, false))
    #expect(b.enrolment == nil)
    #expect(b.step(flag: true, now: 0) == .disclose)
    b.leave()
    #expect(a.step(flag: true, now: 10) == nil)
    #expect(!a.optedOut)
    let none = prefs(nil, d)
    none.join()
    #expect(none.step(flag: true, now: 0) == nil)
    #expect(!none.showsLeave(flag: true))
    #expect(prefs("", d).account == nil)
}

@Test func consentGateNeedsEveryCondition() {
    for (flag, open, joined, left) in [(false, true, true, false), (true, false, true, false), (true, true, true, true)] {
        let p = prefs()
        if open { p.setGate(StudyGate(state: .open, at: 1)) }
        if joined { p.join() }
        if left { p.leave() }
        #expect(p.step(flag: flag, now: 0) == nil)
    }
    let closed = prefs()
    closed.setGate(StudyGate(state: .closed, at: 1))
    closed.join()
    #expect(closed.step(flag: true, now: 0) == nil)
    let fresh = prefs()
    fresh.setGate(StudyGate(state: .open, at: 1))
    #expect(fresh.step(flag: true, now: 0) == .disclose)
}

@MainActor
@Test func aFailedFetchIgnoresTheCachedArm() async {
    let p = prefs()
    p.markTaken("baseline")
    p.cache(enrolled)
    let got = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                        fetch: { _ in .failed }, register: { _, _ in Issue.record("posted"); return nil }, compute: compute, enrolment: \.enrolment)
    #expect(got?.arm == nil)
    #expect(got?.enrolment == nil)
}

@MainActor
@Test func noTokenOrNoConsentSkipsTheServer() async {
    let p = prefs()
    p.markTaken("baseline")
    p.cache(enrolled)
    var fetched = 0
    let noToken = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: nil,
                                            fetch: { _ in fetched += 1; return .known(enrolled) }, register: { _, _ in nil }, compute: compute, enrolment: \.enrolment)
    #expect(noToken?.arm == nil)
    var out = open
    out.optedOut = true
    let optedOut = await StudyEnrolment.plan(consent: out, account: "u1", device: "d", prefs: p, token: "tok",
                                             fetch: { _ in fetched += 1; return .known(enrolled) }, register: { _, _ in nil }, compute: compute, enrolment: \.enrolment)
    #expect(optedOut?.arm == nil)
    #expect(fetched == 0)
}

@MainActor
@Test func beforeBaselineThePlanHasNoKeyAndRegistersNothing() async {
    let p = prefs()
    var posted = 0
    let got = await StudyEnrolment.plan(consent: open, account: "u1", device: "d", prefs: p, token: "tok",
                                        fetch: { _ in .known(nil) }, register: { _, _ in posted += 1; return enrolled }, compute: compute, enrolment: \.enrolment)
    #expect(got?.arm == nil)
    #expect(posted == 0)
}

@Test func theBaselineRowCarriesNoArmLikeTheWeb() {
    let items = [YesNoTest.TestItem(word: "casa", real: true, band: 0)]
    guard case .vocabTest(let v) = YesNoTest.row(phase: "baseline", lang: "es", items: items, yes: ["casa"], seconds: 60, enrolment: prefs().enrolment, meta: meta()) else { Issue.record("no row"); return }
    #expect(v.arm == nil)
    #expect(v.form == "A")
    #expect(v.day == 0)
}
