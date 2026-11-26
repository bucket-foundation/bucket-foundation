import Foundation
import Testing
@testable import BucketKit

@Test func theExperimentFlagIsOffUnlessSetToOne() {
    #expect(!InputExperiment.on(nil))
    #expect(!InputExperiment.on("true"))
    #expect(InputExperiment.on("1"))
}

@Test func inputExperimentGoldenVectorsMatchTheWeb() throws {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/input-experiment-vectors.json").standardized
    let v = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    for case let h as [String: Any] in v["hashes"] as! [Any] {
        #expect(InputExperiment.fnv1a32(h["key"] as! String) == (h["hash"] as! NSNumber).uint32Value)
    }
    for case let a as [String: Any] in v["assign"] as! [Any] {
        #expect(InputExperiment.assignArm(a["key"] as! String, tier: a["tier"] as! Int) == a["arm"] as! String)
    }
    for case let f as [String: Any] in v["fill"] as! [Any] {
        #expect(InputExperiment.canFill(cards: f["cards"] as! Int, eligibleUnitSeconds: (f["seconds"] as! [NSNumber]).map(\.doubleValue)) == f["fill"] as! Bool)
    }
    for case let m as [String: Any] in v["mixes"] as! [Any] {
        let got = InputExperiment.mix(on: m["on"] as! Bool, userKey: m["key"] as? String, tier: m["tier"] as! Int, cards: m["cards"] as! Int, eligibleUnitSeconds: (m["seconds"] as! [NSNumber]).map(\.doubleValue))
        #expect(got.arm == m["arm"] as? String)
        #expect(got.mix.target == (m["target"] as! NSNumber).doubleValue)
        #expect(abs(got.mix.share - (m["share"] as! NSNumber).doubleValue) < 1e-9)
        #expect(got.mix.units == m["units"] as! Int)
        #expect(got.mix.positions == m["positions"] as! [Int])
    }
}
