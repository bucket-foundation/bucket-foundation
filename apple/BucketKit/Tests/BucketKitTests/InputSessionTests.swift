import Foundation
import Testing
@testable import BucketKit

private func repoFile(_ path: String) -> URL {
    URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../" + path).standardized
}

private let now = 1_800_000_000_000.0
private func resolve(_ lang: String, _ lemma: String) -> String? { "es:\(lemma)" }

@Test func learnerFrequencyPriorsMatchTheWeb() throws {
    let lv = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: repoFile("src/lib/academy/learner-input-vectors.json"))) as? [String: Any])
    let at = try #require(lv["now"] as? Double)
    var s = EngineState()
    for (id, raw) in try #require(lv["cards"] as? [String: [String: Double]]) {
        var c = Card()
        c.stability = raw["stability"]!; c.lastReview = raw["lastReview"]!; c.due = raw["due"]!; c.reps = 1
        s.cards[id] = c
    }
    let entries = try #require(lv["freq"] as? [[Any]]).map { ($0[0] as! String, ($0[1] as! NSNumber).doubleValue, $0[2] as! Bool) }
    let freq = InputStage.freqIndex(entries)
    for case let c as [String: Any] in try #require(lv["cases"] as? [Any]) {
        let l = InputStage.learner(s, lang: "es", resolve: resolve, now: at, tier: c["tier"] as! Int, due: [], freq: freq)
        for (lemma, p) in c["p"] as! [String: Double] { #expect(abs(l.p(lemma) - p) < 1e-8, "\(lemma)") }
        for (lemma, r) in lv["rank"] as! [String: Any] { #expect(l.rank(lemma) == (r as? NSNumber)?.doubleValue, "\(lemma)") }
    }
}

@Test func gradedBandsExpandAndMergeLikeTheWeb() throws {
    let gv = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: repoFile("src/lib/academy/graded-vectors.json"))) as? [String: Any])
    let bands = try #require(gv["bands"] as? [Any])
    let expanded = try #require(gv["expanded"] as? [String: Any])
    for case let it as [String: Any] in try #require((bands[0] as? [String: Any])?["items"] as? [Any]) {
        let id = it["id"] as! String
        let want = (expanded[id] as? [[String]])
        #expect(InputStage.expandBandItem(it)?.tokens.map { [$0.surface, $0.lemma] } == want, "\(id)")
    }
    let base = try #require(InputStage.parseBundle(JSONSerialization.data(withJSONObject: gv["base"]!)))
    let datas: [Data?] = try bands.map { $0 is NSNull ? nil : try JSONSerialization.data(withJSONObject: $0) }
    let merged = InputStage.mergeBands(base, bands: datas)
    #expect(merged.units.map(\.id) == gv["mergedUnits"] as! [String])
    #expect(merged.items.map(\.id).sorted() == gv["mergedItems"] as! [String])
    for case let c as [Any] in gv["bandsFor"] as! [Any] {
        #expect(InputStage.bandsFor((c[0] as! NSNumber).intValue) == c[1] as! [Int])
    }
}

private func fixture() throws -> InputBundle {
    try #require(InputStage.parseBundle(Data(contentsOf: repoFile("scripts/fixtures/polingual-input/es.json"))))
}

private func knowsAllBut(_ b: InputBundle, _ unknown: Set<String>) -> EngineState {
    var s = EngineState()
    for lemma in Set(b.items.flatMap { $0.tokens.map(\.lemma) }) where !unknown.contains(lemma) {
        var c = Card()
        c.stability = 200; c.lastReview = now; c.due = now + 86_400_000 * 30; c.reps = 3
        s.cards["es:\(lemma)"] = c
    }
    return s
}

private func plan(_ mode: InputMode, _ b: InputBundle, _ state: EngineState, clock: @escaping () -> Double = { now }) -> InputPlanState? {
    var n = 0
    return InputPlanState.plan(mode: mode, lang: "es", bundle: b, resolve: resolve, state: state, cards: 20, tier: 2, systemId: "sys", device: "d-0", now: now, clock: clock, ids: { n += 1; return "id-\(n)" }, tz: "UTC")
}

@Test func theDemoFlagOnlyWorksInDebugBuilds() {
    #expect(InputMode.of("demo", debug: false) == .off)
    #expect(InputMode.of("demo", debug: true) == .demo)
    #expect(InputMode.of(nil, debug: true) == .on)
    #expect(InputMode.of("", debug: false) == .off)
    #expect(InputMode.of("1", debug: false) == .on)
}

@Test func aBeginnerGetsNoStageUnlessDemoIsOn() throws {
    let b = try fixture()
    #expect(plan(.on, b, EngineState()) == nil)
    #expect(plan(.off, b, knowsAllBut(b, ["mi"])) == nil)
    let demo = try #require(plan(.demo, b, EngineState()))
    #expect(demo.mix.units == 1)
}

@Test func theStageRunsAtItsPlacedCardAndFillsTheSessionRow() throws {
    let b = try fixture()
    var clock = now
    let state = knowsAllBut(b, ["mi", "casa"])
    let s = try #require(plan(.on, b, state, clock: { clock }))
    #expect(s.mix.units >= 1 && s.mix.share > 0)
    #expect(s.itemId("casa") == "casa")
    let at = s.mix.positions[0]
    if at > 0 {
        s.prepare(answered: at - 1, state: state)
        #expect(s.due(answered: at - 1) == nil)
    }
    s.prepare(answered: at, state: state)
    let choice = try #require(s.due(answered: at))
    let rows = [ExposureInput(item: choice.items[0].id, unit: choice.unit.id, lemmasSeen: ["mi"], taps: ["mi"], seconds: 30, coveragePred: choice.plan.coverage, completed: true, revealed: false)]
    clock = now + 120_000
    let logged = s.finish(rows, seconds: 30)
    #expect(s.due(answered: at) == nil)
    let session = try #require(s.end(answered: 20))
    #expect(s.end(answered: 20) == nil)
    guard case .exposure(let e) = try #require(logged.first) else { Issue.record("not an exposure"); return }
    #expect(logged.count == 1)
    #expect(e.taps == ["mi"])
    #expect(e.revealed == false)
    guard case .session(let row) = session else { Issue.record("not a session"); return }
    #expect(row.shareTarget == 0.7)
    #expect(row.shareReal == 0.25)
    #expect(row.units == 1)
    #expect(row.arm == nil)
}

@Test func theExperimentFlagLogsTheStableArmOnTheSessionRow() throws {
    let b = try fixture()
    var n = 0
    let s = try #require(InputPlanState.plan(mode: .on, lang: "es", bundle: b, resolve: resolve, state: knowsAllBut(b, ["mi", "casa"]), cards: 0, tier: 2, systemId: "sys", device: "d-0", now: now, clock: { now }, ids: { n += 1; return "id-\(n)" }, tz: "UTC", consent: InputExperiment.Consent(flag: true, uploadOpen: true, disclosed: true, optedOut: false), key: "dev:d-0"))
    let arm = try #require(s.arm)
    #expect(arm == InputExperiment.assignArm("dev:d-0"))
    #expect(s.enrolment?.arm == arm)
    #expect(s.mix.target == InputExperiment.armShares[arm])
    let blocked = try #require(InputPlanState.plan(mode: .on, lang: "es", bundle: b, resolve: resolve, state: knowsAllBut(b, ["mi", "casa"]), cards: 0, tier: 2, systemId: "sys", device: "d-0", now: now, consent: InputExperiment.Consent(flag: true, uploadOpen: true, disclosed: false, optedOut: false), key: "dev:d-0"))
    #expect(blocked.arm == nil)
    guard case .session(let row) = try #require(s.end(answered: 20)) else { Issue.record("not a session"); return }
    #expect(row.arm == arm)
}

@Test func anUnavailablePlayerStillLogsEachPresentedRow() throws {
    let item = InputItem(id: "v1", tokens: [InputToken(surface: "hola", lemma: "hola")], media: InputMedia(videoId: "abc", start: 0, end: 4))
    let plan = InputPlan(unit: "ep", tokens: 1, media: true, coverage: 1, newWords: [], glossed: [], eligible: true, score: 0)
    let choice = StageChoice(unit: InputUnitRef(id: "ep", kind: "episode", itemIds: ["v1"], targetLemmas: []), items: [item], plan: plan, fallback: false)
    let shown = InputStage.present(Viewing(), visible: ["v1"])
    #expect(InputStage.exposureRows(choice, viewing: shown, completed: false).isEmpty)
    let rows = InputStage.exposureRows(choice, viewing: shown, completed: false, playerUnavailable: true)
    #expect(rows.count == 1)
    #expect(rows[0].seconds == 0)
    #expect(rows[0].playback == "unavailable")
    #expect(InputStage.present(InputStage.addSeen(shown, visible: ["v1"], ms: 900), visible: ["v1"]).seenMs["v1"] == 900)
}

@Test func exposureRowsRoundTripWithRevealedAndPlayback() {
    let meta = LogRow.Meta(id: "0b6a3f0e-5f7d-4d3e-9a51-1f4c2b7d9e10", at: now, device: "d-0", tz: "UTC", systemId: "sys")
    let row = InputStage.logRow(ExposureInput(item: "v1", unit: "ep", lemmasSeen: ["hola"], taps: [], seconds: 0, coveragePred: 1, completed: false, revealed: true, playback: "unavailable"), lang: "es", meta: meta)
    guard case .exposure(let e) = row else { Issue.record("not an exposure"); return }
    var raw: [String: Any] = ["kind": "exposure", "review_id": meta.id, "reviewed_at": meta.at, "device_id": meta.device, "tz": meta.tz, "system_id": meta.systemId, "lang": "es"]
    let props = ReviewLog.batch([row], gate: .open)![0]["props"] as! [String: Any]
    raw.merge(props) { a, _ in a }
    #expect(ReviewLog.parse(raw) == row)
    #expect(e.revealed == true)
    raw["playback"] = "other"
    #expect(ReviewLog.parse(raw) == nil)
}

@Test func lemmasResolveToTheLowestTierWordCard() {
    let map = ["café": "es:w2", "casa": "es:w1"]
    let r = InputStage.resolver(["es": map])
    #expect(r("es", " Casa ") == "es:w1")
    #expect(r("es", "cafe\u{301}") == "es:w2")
    #expect(r("fr", "casa") == nil)
}

@Test func theRepoCachesTheManifestAndBundleAndPrunesOldFiles() async throws {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("input-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: dir) }
    let bundleData = try Data(contentsOf: repoFile("scripts/fixtures/polingual-input/es.json"))
    let manifest = Data(#"{"langs":{"es":{"file":"es.0123456789ab.json"}}}"#.utf8)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    try Data("old".utf8).write(to: dir.appendingPathComponent("es.ffffffffffff.json"))
    let online = InputRepo(dir: dir, base: "https://x.test/input/") { url in
        url.lastPathComponent == "manifest.json" ? manifest : url.lastPathComponent == "es.0123456789ab.json" ? bundleData : nil
    }
    #expect(await online.bundle("es")?.lang == "es")
    #expect(await online.bundle("fr") == nil)
    #expect(!FileManager.default.fileExists(atPath: dir.appendingPathComponent("es.ffffffffffff.json").path))
    let offline = InputRepo(dir: dir, base: "https://x.test/input") { _ in nil }
    #expect(await offline.bundle("es")?.lang == "es")
}

@Test func gradedBandsAreFetchedCachedAndMerged() async throws {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("input-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: dir) }
    let bundleData = Data(#"{"format":"polingual-input","lang":"es","items":[{"id":"t:1","tokens":[{"surface":"Hola","lemma":"hola"}],"text":"Hola"}],"units":[]}"#.utf8)
    let manifest = Data(#"{"bandBase":null,"langs":{"es":{"file":"es.0123456789ab.json","graded":{"files":{"500":[{"file":"es.b500.p0.76b9c85a128a.json"},{"file":"../x.json"}],"1000":[{"file":"es.b1000.p0.76b9c85a128b.json"}]}}}}}"#.utf8)
    let band = Data(#"{"format":"polingual-input-band","lang":"es","band":500,"items":[{"id":"t:2","kind":"sentence","text":"El gato","tok":[[0,2,"el"],[3,4]]}],"units":[{"id":"graded:es:500:gato","kind":"sentence_set","itemIds":["t:2"],"targetLemmas":["gato"]}]}"#.utf8)
    let repo = InputRepo(dir: dir, base: "https://x.test/input", bandBase: "https://cdn.x.test/bands/") { url in
        switch url.absoluteString {
        case "https://x.test/input/manifest.json": return manifest
        case "https://x.test/input/es.0123456789ab.json": return bundleData
        case "https://cdn.x.test/bands/es.b500.p0.76b9c85a128a.json": return band
        default: return nil
        }
    }
    let b = try #require(await repo.bundle("es", bands: [500, 1000]))
    #expect(b.units.map(\.id) == ["graded:es:500:gato"])
    #expect(b.byId["t:2"]?.tokens.map(\.lemma) == ["el", "gato"])
    #expect(FileManager.default.fileExists(atPath: dir.appendingPathComponent("es.b500.p0.76b9c85a128a.json").path))
    let offline = InputRepo(dir: dir, base: "https://x.test/input", bandBase: "https://cdn.x.test/bands") { _ in nil }
    #expect(await offline.bundle("es", bands: [500])?.units.count == 1)
    #expect(await offline.bundle("es")?.units.count == 0)
    let loop = InputRepo(dir: dir, base: "https://x.test/input", bandBase: "http://127.0.0.1:9000") { _ in nil }
    #expect(await loop.bundle("es", bands: [500])?.units.count == 0)
    #expect(InputManifest.bandFiles(Data(#"{"langs":{"zh-Hans":{"graded":{"files":{"500":[{"file":"zh-Hans.b500.p0.76b9c85a128a.json"}]}}}}}"#.utf8), lang: "zh-Hans", bands: [500]) == ["zh-Hans.b500.p0.76b9c85a128a.json"])
}

@Test func bandsLoadOnlyFromAnHttpsConfigBaseOrLoopbackInDebug() async throws {
    let manifest = Data(#"{"bandBase":"https://cdn.x.test/bands","langs":{"es":{"file":"es.0123456789ab.json","graded":{"files":{"500":[{"file":"es.b500.p0.76b9c85a128a.json"}]}}}}}"#.utf8)
    let bundleData = Data(#"{"format":"polingual-input","lang":"es","items":[{"id":"t:1","tokens":[{"surface":"Hola","lemma":"hola"}],"text":"Hola"}],"units":[]}"#.utf8)
    let band = Data(#"{"format":"polingual-input-band","lang":"es","items":[{"id":"t:2","text":"gato","tok":[[0,4]]}],"units":[{"id":"g:1","kind":"sentence_set","itemIds":["t:2"]}]}"#.utf8)
    let cases: [(String?, Bool, Int)] = [(nil, false, 0), (nil, true, 0), ("http://127.0.0.1:9000", false, 0), ("http://cdn.x.test", true, 0), ("ftp://cdn.x.test", true, 0), ("http://127.0.0.1:9000", true, 1), ("https://cdn.x.test/bands", false, 1)]
    for (base, debug, units) in cases {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("input-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: dir) }
        let repo = InputRepo(dir: dir, base: "https://x.test/input", bandBase: base, debug: debug) { url in
            url.lastPathComponent == "manifest.json" ? manifest : url.lastPathComponent == "es.0123456789ab.json" ? bundleData : band
        }
        #expect(await repo.bundle("es", bands: [500])?.units.count == units, "\(String(describing: base)) \(debug)")
    }
}

@Test func theUnstudiedPriorCapStaysBelowTheKnownBar() {
    #expect(FrequencyPriors.unstudied.cap < LearnerModel.knownR)
    let freq = InputStage.freqIndex([("uno", 1, false)])
    for tier in [0, 4, 20] {
        let l = InputStage.learner(EngineState(), lang: "es", resolve: resolve, now: now, tier: tier, due: [], freq: freq)
        #expect(l.p("uno") < LearnerModel.knownR)
    }
}

@Test func knownWordsCountsCardsAtTheKnownBar() {
    var s = EngineState()
    var strong = Card(); strong.stability = 100; strong.lastReview = now
    var weak = Card(); weak.stability = 1; weak.lastReview = now - 86_400_000 * 30
    s.cards["es:a"] = strong; s.cards["es:b"] = weak; s.cards["fr:a"] = strong
    #expect(InputStage.knownWords(s, lang: "es", now: now) == 1)
}
