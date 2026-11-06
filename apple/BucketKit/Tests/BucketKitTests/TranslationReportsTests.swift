import Foundation
import Testing
@testable import BucketKit

final class ReportTransport: Transport, @unchecked Sendable {
    var statuses: [Int?]
    var requests: [URLRequest] = []
    init(_ statuses: [Int?]) { self.statuses = statuses }
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        requests.append(request)
        guard let status = statuses.isEmpty ? 200 : statuses.removeFirst() else { throw URLError(.notConnectedToInternet) }
        return (Data("{}".utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

private let subject = ReportSubject(lang: "zh", root: "en", itemId: "w:water", text: "水", shown: "fire", context: "study:translate")

private func reportFile() -> URL { FileManager.default.temporaryDirectory.appending(path: "reports-\(UUID().uuidString).json") }

@Test func translationReportSendsTheServerContract() async throws {
    let t = ReportTransport([200])
    let reports = TranslationReports(transport: t, file: reportFile(), suite: UUID().uuidString)
    let sent = await reports.submit(subject, reason: .meaning, suggestion: "  water ", token: "tok")
    #expect(sent == 1)
    #expect(await reports.pending == 0)
    let r = t.requests[0]
    #expect(r.url?.path == "/api/academy/translation-report")
    #expect(r.value(forHTTPHeaderField: "authorization") == "Bearer tok")
    let b = try JSONSerialization.jsonObject(with: r.httpBody!) as! [String: Any]
    #expect(b["item_id"] as? String == "w:water")
    #expect(b["reason"] as? String == "meaning")
    #expect(b["suggestion"] as? String == "water")
    #expect(b["shown"] as? String == "fire")
    #expect((b["device_id"] as? String)?.count == 36)
}

@Test func translationReportQueuesOfflineAndSendsLater() async {
    let file = reportFile()
    let suite = UUID().uuidString
    let offline = TranslationReports(transport: ReportTransport([nil]), file: file, suite: suite)
    #expect(await offline.submit(subject, reason: .spelling, suggestion: nil, token: nil) == 0)
    #expect(await offline.pending == 1)
    let t = ReportTransport([200])
    let online = TranslationReports(transport: t, file: file, suite: suite)
    #expect(await online.pending == 1)
    #expect(await online.flush(token: nil) == 1)
    #expect(await online.pending == 0)
    #expect(t.requests[0].value(forHTTPHeaderField: "authorization") == nil)
}

@Test func translationReportFallsBackToAnonymousOnAStaleToken() async {
    let t = ReportTransport([401, 200])
    let reports = TranslationReports(transport: t, file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .sound, suggestion: nil, token: "stale") == 1)
    #expect(t.requests.map { $0.value(forHTTPHeaderField: "authorization") } == ["Bearer stale", nil])
}

@Test func translationReportKeepsTheQueueWhenRateLimited() async {
    let reports = TranslationReports(transport: ReportTransport([429]), file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .script, suggestion: nil, token: nil) == 0)
    #expect(await reports.pending == 1)
}

@Test func translationReportDeviceIdIsStable() async {
    let suite = UUID().uuidString
    let a = TranslationReports(transport: ReportTransport([]), file: reportFile(), suite: suite)
    let b = TranslationReports(transport: ReportTransport([]), file: reportFile(), suite: suite)
    #expect(await a.deviceId == b.deviceId)
}
