import Foundation
import Testing
@testable import BucketKit

private func learnerVectors() throws -> [String: Any] {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/learner-model-vectors.json").standardized
    return try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
}

private func evidence(_ o: [String: Any]) -> LemmaEvidence {
    let f = o["freq"] as? [String: Any]
    return LemmaEvidence(
        stability: (o["stability"] as? NSNumber)?.doubleValue,
        lastReview: (o["lastReview"] as? NSNumber)?.doubleValue,
        lastTap: (o["lastTap"] as? NSNumber)?.doubleValue,
        exposures: (o["exposures"] as? NSNumber)?.intValue ?? 0,
        freq: f.map { FreqPrior(rank: ($0["rank"] as! NSNumber).doubleValue, derived: $0["derived"] as! Bool) }
    )
}

@Test func learnerModelGoldenVectorsMatchTheWeb() throws {
    let v = try learnerVectors()
    let now = (v["now"] as! NSNumber).doubleValue
    for c in v["known"] as! [[String: Any]] {
        let name = c["name"] as! String
        let k = LearnerModel.known(evidence(c["evidence"] as! [String: Any]), now: now, tier: (c["tier"] as! NSNumber).intValue, lambda: (c["lambda"] as! NSNumber).doubleValue)
        let e = c["expect"] as! [String: Any]
        #expect(abs(k.p - (e["p"] as! NSNumber).doubleValue) < 1e-8, "\(name)")
        #expect(k.known == (e["known"] as! Bool), "\(name)")
        #expect(k.source == (e["source"] as! String), "\(name)")
    }
    for c in v["knownCount"] as! [[String: Any]] {
        let lemmas = (c["lemmas"] as! [String: [String: Any]]).mapValues(evidence)
        let n = LearnerModel.knownCount(lemmas, now: now, tier: (c["tier"] as! NSNumber).intValue, lambda: (c["lambda"] as! NSNumber).doubleValue)
        #expect(abs(n - (c["expect"] as! NSNumber).doubleValue) < 1e-8)
    }
    for r in v["freqRows"] as! [[String: Any]] {
        let row = (r["row"] as! [Any]).map { $0 is NSNull ? nil : $0 } as [Any?]
        let want = (r["expect"] as? [String: Any]).map { FreqPrior(rank: ($0["rank"] as! NSNumber).doubleValue, derived: $0["derived"] as! Bool) }
        #expect(LearnerModel.freqFromRow(row) == want)
    }
    for p in v["prior"] as! [[String: Any]] {
        let got = LearnerModel.frequencyPrior(FreqPrior(rank: (p["rank"] as! NSNumber).doubleValue, derived: false), tier: (p["tier"] as! NSNumber).intValue)
        #expect(abs(got - (p["expect"] as! NSNumber).doubleValue) < 1e-8)
    }
}

@Test func learnerModelPriorsMatchTheWebAndStayBelowTheBar() throws {
    let v = try learnerVectors()
    let p = v["priors"] as! [String: NSNumber]
    #expect(FrequencyPriors(halfRank: p["halfRank"]!.doubleValue, slope: p["slope"]!.doubleValue, derivedRankFactor: p["derivedRankFactor"]!.doubleValue, cap: p["cap"]!.doubleValue) == .unstudied)
    for rank in [1.0, 10, 100] { for tier in [0, 50] { #expect(!LearnerModel.known(LemmaEvidence(freq: FreqPrior(rank: rank, derived: false)), now: 0, tier: tier).known) } }
    #expect(FrequencyPriors(cap: 0.99).bounded().cap < LearnerModel.knownR)
}
