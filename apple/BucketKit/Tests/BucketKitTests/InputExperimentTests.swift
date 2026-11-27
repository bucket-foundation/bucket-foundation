import Foundation
import Testing
@testable import BucketKit

private func enrolment(_ raw: Any?) -> InputExperiment.Enrolment? {
    guard let o = raw as? [String: Any] else { return nil }
    return InputExperiment.Enrolment(experiment: o["experiment"] as! String, key: o["key"] as! String, arm: o["arm"] as! String, stratum: o["stratum"] as! String, at: (o["at"] as! NSNumber).doubleValue)
}

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
    for case let k as [String: Any] in v["keysFor"] as! [Any] {
        #expect(InputExperiment.enrolmentKey(account: k["account"] as? String, device: k["device"] as! String) == k["key"] as! String)
    }
    for case let a as [String: Any] in v["assign"] as! [Any] {
        #expect(InputExperiment.assignArm(a["key"] as! String) == a["arm"] as! String)
    }
    for case let f as [String: Any] in v["fill"] as! [Any] {
        #expect(InputExperiment.canFill(cards: f["cards"] as! Int, eligibleUnitSeconds: (f["seconds"] as! [NSNumber]).map(\.doubleValue)) == f["fill"] as! Bool)
    }
    for case let m as [String: Any] in v["mixes"] as! [Any] {
        let c = m["consent"] as! [String: Bool]
        let consent = InputExperiment.Consent(flag: c["flag"]!, uploadOpen: c["uploadOpen"]!, disclosed: c["disclosed"]!, optedOut: c["optedOut"]!)
        let got = InputExperiment.mix(consent: consent, enrolment: enrolment(m["enrolment"]), key: m["key"] as? String, tier: m["tier"] as! Int, cards: m["cards"] as! Int, eligibleUnitSeconds: (m["seconds"] as! [NSNumber]).map(\.doubleValue), now: (m["now"] as! NSNumber).doubleValue)
        #expect(got.arm == m["arm"] as? String)
        #expect(got.enrolment == enrolment(m["enrolment_out"]))
        #expect(got.mix.target == (m["target"] as! NSNumber).doubleValue)
        #expect(abs(got.mix.share - (m["share"] as! NSNumber).doubleValue) < 1e-9)
        #expect(got.mix.units == m["units"] as! Int)
        #expect(got.mix.positions == m["positions"] as! [Int])
    }
}

@Test func anEnrolmentRoundTripsAndRejectsUnknownArms() throws {
    let e = InputExperiment.Enrolment(experiment: InputExperiment.experimentId, key: "acct:u", arm: "s70", stratum: "past-a2", at: 9)
    #expect(InputExperiment.parseEnrolment(try JSONEncoder().encode(e)) == e)
    var bad = e
    bad.arm = "s60"
    #expect(InputExperiment.parseEnrolment(try JSONEncoder().encode(bad)) == nil)
    #expect(InputExperiment.parseEnrolment(Data("{broken".utf8)) == nil)
}
