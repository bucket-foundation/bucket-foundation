import Foundation
import Testing
@testable import BucketKit

@Test func inputSelectorGoldenVectorsMatchTheWeb() throws {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/selector-vectors.json").standardized
    let root = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    let units = root["units"] as! [[String: Any]]
    let byId = Dictionary(uniqueKeysWithValues: units.map { ($0["id"] as! String, $0) })
    for c in root["cases"] as! [[String: Any]] {
        let name = c["name"] as! String
        let lo = c["learner"] as! [String: Any]
        let p = (lo["p"] as! [String: NSNumber]).mapValues(\.doubleValue)
        let rank = (lo["rank"] as! [String: NSNumber]).mapValues(\.doubleValue)
        let l = InputLearner(p: { p[$0] ?? 0 }, due: Set(lo["due"] as! [String]), rank: { rank[$0] }, recent: (lo["recent"] as! [String: NSNumber]).mapValues(\.intValue), lastVideo: lo["lastVideo"] as? String)
        let chosen = Set(c["units"] as! [String])
        let plans = units.filter { chosen.contains($0["id"] as! String) }.map { u in
            InputSelector.plan(u["id"] as! String, lemmas: u["lemmas"] as! [String], targets: u["targets"] as! [String], media: u["media"] as! Bool, video: u["video"] as? String, learner: l)
        }
        for (got, e) in zip(plans, c["plans"] as! [[String: Any]]) {
            #expect(got.tokens == (e["tokens"] as! NSNumber).intValue, "\(name) \(got.unit)")
            #expect(got.newWords == e["newWords"] as! [String], "\(name) \(got.unit)")
            #expect(got.glossed == e["glossed"] as! [String], "\(name) \(got.unit)")
            #expect(got.eligible == e["eligible"] as! Bool, "\(name) \(got.unit)")
            #expect(abs(got.coverage - (e["coverage"] as! NSNumber).doubleValue) < 1e-8, "\(name) \(got.unit)")
            #expect(abs(got.score - (e["score"] as! NSNumber).doubleValue) < 1e-8, "\(name) \(got.unit)")
        }
        let pick = InputSelector.select(plans, learner: l) { byId[$0]!["lemmas"] as! [String] }
        let want = c["selected"] as? [String: Any]
        #expect(pick?.plan.unit == want?["unit"] as? String, "\(name)")
        if let want, let pick {
            #expect(pick.fallback == want["fallback"] as! Bool)
            #expect(pick.plan.glossed == want["glossed"] as! [String])
            #expect(pick.plan.newWords == want["newWords"] as! [String])
        }
    }
}
