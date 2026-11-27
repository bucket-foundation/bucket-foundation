import Foundation
import Testing
@testable import BucketKit

@Test func exposureReplayGoldenVectorsMatchTheWeb() throws {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/exposure-vectors.json").standardized
    let root = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    func d(_ o: [String: Any], _ k: String) -> Double? { (o[k] as? NSNumber)?.doubleValue }
    for c in root["cases"] as! [[String: Any]] {
        let name = c["name"] as! String
        let s = c["card"] as! [String: Any]
        var card: ExposureCard? = ExposureCard(state: s["state"] as! String, stability: d(s, "stability"), lastReview: d(s, "lastReview"), due: d(s, "due"), exposureDay: s["exposureDay"] as? String)
        for step in c["steps"] as! [[String: Any]] {
            card = ExposureReplay.group(card, tapped: step["tapped"] as! [Bool], at: d(step, "at")!, day: step["day"] as! String, alpha: d(step, "alpha")!)
            let e = step["expect"] as! [String: Any]
            #expect(card?.stability == d(e, "stability"), "\(name)")
            #expect(card?.due == d(e, "due"), "\(name)")
            #expect(card?.lastReview == d(e, "lastReview"), "\(name)")
            #expect(card?.exposureDay == e["exposureDay"] as? String, "\(name)")
        }
    }
    #expect(ExposureReplay.alpha == 0)
    #expect(ExposureReplay.gain(9) == 0.15)
}
