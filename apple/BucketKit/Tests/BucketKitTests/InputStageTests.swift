import Foundation
import Testing
@testable import BucketKit

private func repoFile(_ path: String) -> URL {
    URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../" + path).standardized
}

@Test func inputStageGoldenRowsMatchTheWeb() throws {
    let v = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: repoFile("src/lib/academy/input-stage-vectors.json"))) as? [String: Any])
    let items = (v["items"] as! [[String: Any]]).map { o in
        InputItem(id: o["id"] as! String, tokens: (o["tokens"] as! [[String: String]]).map { InputToken(surface: $0["surface"]!, lemma: $0["lemma"]!) })
    }
    let unitId = v["unit"] as! String
    for c in v["cases"] as! [[String: Any]] {
        let plan = InputPlan(unit: unitId, tokens: 41, media: false, coverage: (c["coverage"] as! NSNumber).doubleValue, newWords: [], glossed: [], eligible: true, score: 0)
        let choice = StageChoice(unit: InputUnitRef(id: unitId, kind: "sentence_set", itemIds: items.map(\.id), targetLemmas: []), items: items, plan: plan, fallback: false)
        var view = Viewing()
        for op in c["ops"] as! [[String: Any]] {
            switch op["op"] as! String {
            case "tap":
                let it = items[(op["item"] as! NSNumber).intValue]
                view = InputStage.toggleTap(view, item: it.id, lemma: it.tokens[(op["token"] as! NSNumber).intValue].lemma)
            case "seen":
                view = InputStage.addSeen(view, visible: (op["items"] as! [NSNumber]).map { items[$0.intValue].id }, ms: (op["ms"] as! NSNumber).doubleValue)
            default:
                view = InputStage.reveal(view, item: items[(op["item"] as! NSNumber).intValue].id)
            }
        }
        let rows = InputStage.exposureRows(choice, viewing: view, completed: c["completed"] as! Bool)
        let want = c["expect"] as! [[String: Any]]
        #expect(rows.count == want.count, "\(c["name"] as! String)")
        for (r, w) in zip(rows, want) {
            #expect(r.item == w["item"] as! String)
            #expect(r.lemmasSeen == w["lemmas_seen"] as! [String])
            #expect(r.taps == w["taps"] as! [String])
            #expect(r.seconds == (w["seconds"] as! NSNumber).intValue)
            #expect(r.coveragePred == (w["coverage_pred"] as! NSNumber).doubleValue)
            #expect(r.completed == w["completed"] as! Bool)
            #expect(r.revealed == w["revealed"] as! Bool)
        }
    }
}

@Test func inputStageFixtureParsesAndABeginnerGetsNoEligibleUnit() throws {
    let b = try #require(InputStage.parseBundle(Data(contentsOf: repoFile("scripts/fixtures/polingual-input/es.json"))))
    #expect(b.lang == "es")
    let nothing = InputLearner(p: { _ in 0 }, due: [], rank: { _ in nil }, recent: [:], lastVideo: nil)
    #expect(InputStage.choose(b, learner: nothing, allowFallback: false) == nil)
    #expect(InputStage.choose(b, learner: nothing, allowFallback: true) != nil)
}
