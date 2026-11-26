import Foundation
import Testing
@testable import BucketKit

private func items(_ raw: Any?) -> [YesNoTest.TestItem]? {
    (raw as? [[String: Any]])?.map { YesNoTest.TestItem(word: $0["word"] as! String, real: $0["real"] as! Bool, band: $0["band"] as? Int) }
}

@Test func yesNoGoldenVectorsMatchTheWeb() throws {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/yes-no-vectors.json").standardized
    let v = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    let lex = YesNoTest.buildLexicon(v["words"] as! [String])
    let candidates = (v["candidates"] as! [[String: Any]]).map { YesNoTest.RankedWord(word: $0["word"] as! String, rank: $0["rank"] as! Int) }
    let r = YesNoTest.mulberry32(42)
    for x in v["rand"] as! [NSNumber] { #expect(r() == x.doubleValue) }
    for case let s as [String: Any] in v["syllables"] as! [Any] {
        let want = (s["syllables"] as? [[String: String]])?.map { YesNoTest.Syllable(o: $0["o"]!, n: $0["n"]!, c: $0["c"]!) }
        #expect(YesNoTest.syllabify(s["word"] as! String) == want, "\(s["word"]!)")
    }
    let pr = YesNoTest.mulberry32(7)
    for case let p as [String: Any] in v["pseudo"] as! [Any] {
        #expect(YesNoTest.pseudoword(p["word"] as! String, lex: lex, rand: pr) == p["out"] as? String)
    }
    let lexR = YesNoTest.buildLexicon(v["words"] as! [String], reject: v["reject"] as! [String])
    let pr2 = YesNoTest.mulberry32(7)
    for case let p as [String: Any] in v["pseudoReject"] as! [Any] {
        #expect(YesNoTest.pseudoword(p["word"] as! String, lex: lexR, rand: pr2) == p["out"] as? String)
    }
    let a = try #require(YesNoTest.assemble(candidates, exclude: [], seed: 1001, lex: lex))
    #expect(a == items(v["formA"]))
    #expect(YesNoTest.assemble(candidates, exclude: [], seed: 1002, lex: lex, avoid: Set(a.map(\.word))) == items(v["formB"]))
    let score = YesNoTest.score(items(v["formA"])!, yes: Set(v["yes"] as! [String]))
    let ws = v["score"] as! [String: Any]
    #expect(score.hits == ws["hits"] as! Int)
    #expect(score.falseAlarms == ws["falseAlarms"] as! Int)
    #expect(abs(score.known - (ws["known"] as! NSNumber).doubleValue) < 1e-9)
    for case let k as [String: Any] in v["known"] as! [Any] {
        let a4 = k["args"] as! [Int]
        #expect(abs(YesNoTest.known(hits: a4[0], words: a4[1], falseAlarms: a4[2], pseudowords: a4[3]) - (k["known"] as! NSNumber).doubleValue) < 1e-9)
    }
    for case let d as [String: Any] in v["due"] as! [Any] {
        let t = d["taken"] as! [String: Bool]
        #expect(YesNoTest.due(enrolledAt: (d["enrolledAt"] as? NSNumber)?.doubleValue, now: (d["now"] as! NSNumber).doubleValue, baseline: t["baseline"]!, day28: t["day28"]!) == d["due"] as? String)
    }
}
