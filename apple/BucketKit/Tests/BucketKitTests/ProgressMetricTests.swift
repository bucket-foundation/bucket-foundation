import Foundation
import Testing
@testable import BucketKit

private func metricVectors() throws -> [String: Any] {
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../src/lib/academy/progress-metric-vectors.json").standardized
    return try #require(try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
}

private func num(_ v: Any?) -> Double? { (v as? NSNumber)?.doubleValue }

private func rows(_ c: [String: Any]) -> [MetricRow] {
    (c["rows"] as! [[String: Any]]).map { o in
        MetricRow(kind: o["kind"] as? String, lang: o["lang"] as? String, reviewedAt: num(o["reviewed_at"])!, tz: o["tz"] as? String,
                  seconds: num(o["seconds"]), coveragePred: num(o["coverage_pred"]), started: num(o["started"]), ended: num(o["ended"]),
                  lemmasSeen: o["lemmas_seen"] as? [String] ?? [], taps: o["taps"] as? [String] ?? [])
    }
}

@Test func progressMetricGoldenRows() throws {
    for c in try metricVectors()["rows"] as! [[String: Any]] {
        let lang = c["lang"] as! String
        let e = c["expect"] as! [String: Any]
        #expect(ProgressMetric.inputSeconds(rows(c), lang: lang) == num(e["inputSeconds"]), "\(c["name"]!)")
        #expect(ProgressMetric.inputDays(rows(c), lang: lang) == e["inputDays"] as! [String], "\(c["name"]!)")
    }
}

@Test func progressMetricGoldenStreak() throws {
    for c in try metricVectors()["streak"] as! [[String: Any]] {
        let e = c["expect"] as! [String: Any]
        let got = ProgressMetric.streakFromDays(c["days"] as! [String], today: c["today"] as! String)
        #expect(got == InputStreak(streak: (e["streak"] as! NSNumber).intValue, studiedToday: e["studiedToday"] as! Bool), "\(c["name"]!)")
    }
}

@Test func progressMetricGoldenMetrics() throws {
    let v = try metricVectors()
    let now = num(v["now"])!
    for c in v["metrics"] as! [[String: Any]] {
        let cards = (c["cards"] as! [String: [String: Any]]).mapValues { MetricCard(stability: num($0["stability"]), lastReview: num($0["lastReview"])) }
        let e = c["expect"] as! [String: Any]
        let got = ProgressMetric.langMetrics(lang: c["lang"] as! String, cards: cards, rows: rows(c), now: now)
        #expect(got == LangMetrics(inputSeconds: num(e["inputSeconds"])!, inputHours: num(e["inputHours"])!, knownWords: (e["knownWords"] as! NSNumber).intValue), "\(c["name"]!)")
    }
}

@Test func epochDayMatchesTheCalendar() {
    #expect(ProgressMetric.epochDay("1970-1-1") == 0)
    #expect(ProgressMetric.epochDay("2028-3-1") - ProgressMetric.epochDay("2028-2-28") == 2)
}
