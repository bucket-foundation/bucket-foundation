import Foundation
import Testing
@testable import BucketKit

private func root() throws -> [String: Any] {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/review-log-vectors.json").standardized
    return try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
}

@Test func reviewLogDeviceHashMatchesTheWeb() throws {
    for v in try #require(try root()["deviceHash"] as? [[String: String]]) {
        #expect(ReviewLog.deviceHash(salt: v["salt"]!, device: v["device"]!) == v["hash"]!)
    }
}

private func vectors() throws -> [[String: Any]] {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/review-log-vectors.json").standardized
    let root = try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    return try #require(root["cases"] as? [[String: Any]])
}

@Test func reviewLogGoldenVectorsMatchTheWebReplay() throws {
    let cases = try vectors()
    #expect(cases.count >= 5)
    for c in cases {
        let name = c["name"] as! String
        let got = ReviewLog.replay(c["rows"] as! [Any])
        let expect = c["expect"] as! [String: Any]
        #expect(got.accepted == expect["accepted"] as! [String], "\(name)")
        let want = expect["cards"] as! [String: [String: Any]]
        #expect(Set(got.cards.keys) == Set(want.keys), "\(name)")
        for (id, w) in want {
            let card = try #require(got.cards[id])
            #expect(card.reps == (w["reps"] as! NSNumber).intValue, "\(name) \(id)")
            #expect(card.lapses == (w["lapses"] as! NSNumber).intValue, "\(name) \(id)")
            #expect(card.stability == (w["stability"] as? NSNumber)?.doubleValue, "\(name) \(id)")
            #expect(card.difficulty == (w["difficulty"] as? NSNumber)?.doubleValue, "\(name) \(id)")
            #expect(card.lastReview == (w["lastReview"] as! NSNumber).doubleValue, "\(name) \(id)")
        }
    }
}

@Test func reviewLogKeepsExposureAndSessionRowsLocalUntilTheGateOpens() throws {
    let rows = (try vectors()[1]["rows"] as! [Any]).compactMap(ReviewLog.parse)
    #expect(rows.count == 4)
    #expect(ReviewLog.shareable(rows, gate: .unknown).count == 1)
    #expect(ReviewLog.shareable(rows, gate: .closed).isEmpty)
    #expect(ReviewLog.shareable(rows, gate: .open).count == 4)
    #expect(ReviewLog.batch(rows, gate: .closed) == nil)
    #expect(ReviewLog.batch(rows, gate: .unknown)?.map { $0["name"] as! String } == ["exposure", "exposure", "session_mix"])
    let mix = try #require(ReviewLog.batch(rows, gate: .open)?.last?["props"] as? [String: Any])
    #expect(mix["arm"] is NSNull && mix["units"] is NSNull && mix["share_target"] is NSNull && (mix["cards"] as? Int) == 12)
    #expect(ReviewLog.gate(after: "under_age", from: .open) == .closed)
    #expect(ReviewLog.gate(after: "no_consent", from: .unknown) == .closed)
    #expect(ReviewLog.gate(after: "recorded", from: .unknown) == .open)
    #expect(ReviewLog.gate(after: nil, from: .unknown) == .unknown)
}
