import Foundation
import Testing
@testable import BucketKit

@Test func inputMixGoldenVectorsMatchTheWeb() throws {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/input-mix-vectors.json").standardized
    let v = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    func n(_ o: [String: Any], _ k: String) -> Double { (o[k] as! NSNumber).doubleValue }
    func i(_ o: [String: Any], _ k: String) -> Int { (o[k] as! NSNumber).intValue }
    for t in v["target"] as! [[String: Any]] { #expect(abs(SessionMix.inputTarget(tier: i(t, "tier")) - n(t, "expect")) < 1e-9) }
    for s in v["share"] as! [[String: Any]] { #expect(abs(SessionMix.inputShare(tier: i(s, "tier"), eligibleSeconds: n(s, "eligible"), sessionSeconds: n(s, "session")) - n(s, "expect")) < 1e-8) }
    for p in v["plan"] as! [[String: Any]] {
        let m = SessionMix.planInputMix(tier: i(p, "tier"), cards: i(p, "cards"), eligibleUnitSeconds: (p["units"] as! [NSNumber]).map(\.doubleValue))
        let e = p["expect"] as! [String: Any]
        #expect(m.units == i(e, "units"))
        #expect(m.positions == (e["positions"] as! [NSNumber]).map(\.intValue))
        #expect(abs(m.share - n(e, "share")) < 1e-8)
        #expect(abs(m.plannedShare - n(e, "plannedShare")) < 1e-8)
    }
    for r in v["rounded"] as! [[String: Any]] { #expect(SessionMix.roundedItems(targetPermille: i(r, "targetPermille"), items: i(r, "items")) == i(r, "expect")) }
    for a in v["activity"] as! [[String: Any]] {
        let marks = (a["marks"] as! [[String: Any]]).map { SessionMix.ActivityMark(at: n($0, "at"), visible: $0["visible"] as? Bool, focused: $0["focused"] as? Bool, playing: $0["playing"] as? Bool) }
        #expect(SessionMix.activeMs(marks, end: n(a, "end"), needsPlayer: a["needsPlayer"] as! Bool) == n(a, "expect"), "\(a["name"] as! String)")
    }
}
