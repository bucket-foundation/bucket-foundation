import Foundation
import Testing
@testable import BucketKit

struct CefrCorpusTests {
    static let shared = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appending(path: "Shared/Corpus")

    func json(_ name: String) throws -> JSValue { try JSON.parse(Data(contentsOf: Self.shared.appending(path: name))) }

    @Test(arguments: [("es", 122), ("fr", 130), ("de", 148)])
    func aB2PassOnTheFullCorpusPlacesTheWebsCount(_ lang: String, _ expected: Int) throws {
        let corpus = buildLangCorpus(core: try json("lang-core.json"), cognates: try json("lang-cognates.json"), phrases: try json("lang-phrases.json"), layers: try json("lang-layers.json"))
        let top = try JSONDecoder().decode([TopWord].self, from: Data(contentsOf: Self.shared.appending(path: "top1000/\(lang).json")))
        let t0 = 1_792_508_400_000.0
        let sys = try createSystem("en", [lang], [], now: t0)
        let src = PlacementSource(system: sys, corpus: corpus, lang: lang, top: top)
        let avail = Cefr.bandsAvailable(src)
        #expect(avail == CefrBand.allCases)
        var rng = Rng(seed: 5)
        var answers: [CefrAnswer] = []
        var seen = Set<String>()
        while true {
            let st = Cefr.step(answers, available: avail)
            guard !st.done, let next = st.next else { break }
            let q = try #require(Cefr.question(src, next.band, next.task, seen: seen, &rng))
            seen.insert(q.ex.itemId)
            answers.append(CefrAnswer(band: next.band, task: q.task, itemId: q.ex.itemId, correct: true))
        }
        let st = Cefr.step(answers, available: avail)
        #expect(st.level == "B2" && answers.count == 24)
        let p = Cefr.placement(src, answers, st)
        let placed = Cefr.apply(EngineState(), sys, corpus, lang, p, now: t0, tz: TimeZone(identifier: "UTC")!)
        #expect(placed.cards.count == expected)
        let days = Set(placed.cards.entries.map { Int((($0.value.due ?? 0) - t0) / DAY_MS) })
        #expect(days.allSatisfy { (1...PLACED_SPREAD_DAYS).contains($0) })
    }

    @Test func twoBandsMustPassBeforeAnythingIsPlaced() throws {
        let corpus = buildLangCorpus(core: try json("lang-core.json"), cognates: try json("lang-cognates.json"), phrases: try json("lang-phrases.json"), layers: try json("lang-layers.json"))
        let sys = try createSystem("en", ["es"], [], now: 0)
        let top = try JSONDecoder().decode([TopWord].self, from: Data(contentsOf: Self.shared.appending(path: "top1000/es.json")))
        let src = PlacementSource(system: sys, corpus: corpus, lang: "es", top: top)
        var answers = (0..<6).map { CefrAnswer(band: .a1, task: $0 == 0 ? .recall : .recognize, itemId: "top:\($0 + 1)", correct: true) }
        answers += (0..<3).map { CefrAnswer(band: .a2, task: .recall, itemId: "top:\($0 + 300)", correct: false) }
        let st = Cefr.step(answers)
        #expect(st.done && st.level == "A1")
        #expect(Cefr.placement(src, answers, st).placeIds.isEmpty)
        let noRecall = (0..<6).map { CefrAnswer(band: .a1, task: .recognize, itemId: "top:\($0 + 1)", correct: true) }
        #expect(!Cefr.bandResult(.a1, noRecall).passed)
        #expect(Cefr.wilsonLower(6, 6) == 0.61 && Cefr.wilsonLower(0, 0) == 0)
    }
}
