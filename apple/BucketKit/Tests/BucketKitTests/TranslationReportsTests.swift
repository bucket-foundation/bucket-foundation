import Foundation
import Testing
@testable import BucketKit

final class ReportTransport: Transport, @unchecked Sendable {
    let lock = NSLock()
    var statuses: [Int?]
    var requests: [URLRequest] = []
    let delay: Duration
    init(_ statuses: [Int?], delay: Duration = .zero) {
        self.statuses = statuses
        self.delay = delay
    }
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let status: Int? = lock.withLock {
            requests.append(request)
            return statuses.isEmpty ? 200 : statuses.removeFirst()
        }
        if delay > .zero { try await Task.sleep(for: delay) }
        guard let status else { throw URLError(.notConnectedToInternet) }
        return (Data("{}".utf8), HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
    var ids: [String] {
        lock.withLock { requests.compactMap { r in r.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }?["id"] as? String } }
    }
}

private let subject = ReportSubject(lang: "zh", root: "en", itemId: "w:water", text: "水", shown: "fire", context: "study:translate")

private func reportFile() -> URL { FileManager.default.temporaryDirectory.appending(path: "reports-\(UUID().uuidString).json") }

@Test func translationReportSendsTheServerContract() async throws {
    let t = ReportTransport([200])
    let reports = TranslationReports(transport: t, file: reportFile(), suite: UUID().uuidString)
    let sent = await reports.submit(subject, reason: .meaning, suggestion: "  water ", token: "tok")
    #expect(sent == .sent)
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
    #expect(await offline.submit(subject, reason: .spelling, suggestion: nil, token: nil) == .queued)
    #expect(await offline.pending == 1)
    let t = ReportTransport([200])
    let online = TranslationReports(transport: t, file: file, suite: suite)
    #expect(await online.pending == 1)
    #expect(await online.flush(token: nil).sent.count == 1)
    #expect(await online.pending == 0)
    #expect(t.requests[0].value(forHTTPHeaderField: "authorization") == nil)
}

@Test func translationReportFallsBackToAnonymousOnAStaleToken() async {
    let t = ReportTransport([401, 200])
    let reports = TranslationReports(transport: t, file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .sound, suggestion: nil, token: "stale") == .sent)
    #expect(t.requests.map { $0.value(forHTTPHeaderField: "authorization") } == ["Bearer stale", nil])
}

@Test func translationReportKeepsTheQueueWhenRateLimited() async {
    let reports = TranslationReports(transport: ReportTransport([429]), file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .script, suggestion: nil, token: nil) == .queued)
    #expect(await reports.pending == 1)
}

@Test func translationReportKeepsTheQueueOnAServerError() async {
    let reports = TranslationReports(transport: ReportTransport([503]), file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .meaning, suggestion: nil, token: nil) == .queued)
    #expect(await reports.pending == 1)
    #expect(await reports.dropped == 0)
}

@Test func translationReportDropsAndFlagsARejectedReport() async {
    let t = ReportTransport([400, 200])
    let file = reportFile()
    let suite = UUID().uuidString
    let offline = TranslationReports(transport: ReportTransport([nil, nil]), file: file, suite: suite)
    _ = await offline.submit(subject, reason: .meaning, suggestion: nil, token: nil)
    _ = await offline.submit(subject, reason: .sound, suggestion: nil, token: nil)
    let reports = TranslationReports(transport: t, file: file, suite: suite)
    let result = await reports.flush(token: nil)
    #expect(result.rejected.count == 1)
    #expect(result.sent.count == 1)
    #expect(await reports.pending == 0)
    #expect(await reports.dropped == 1)
    #expect(result.delivery(of: result.rejected[0]) == .rejected)
}

@Test func translationReportSubmitSaysRejected() async {
    let reports = TranslationReports(transport: ReportTransport([413]), file: reportFile(), suite: UUID().uuidString)
    #expect(await reports.submit(subject, reason: .meaning, suggestion: nil, token: nil) == .rejected)
    #expect(await reports.pending == 0)
}

@Test func translationReportConcurrentFlushesSendEachReportOnce() async {
    let file = reportFile()
    let suite = UUID().uuidString
    let offline = TranslationReports(transport: ReportTransport([nil]), file: file, suite: suite)
    _ = await offline.submit(subject, reason: .meaning, suggestion: nil, token: nil)
    let t = ReportTransport([], delay: .milliseconds(50))
    let reports = TranslationReports(transport: t, file: file, suite: suite)
    async let a = reports.flush(token: nil)
    async let b = reports.submit(subject, reason: .spelling, suggestion: nil, token: nil)
    async let c = reports.flush(token: nil)
    let (_, rb, _) = await (a, b, c)
    #expect(rb == .sent)
    #expect(t.ids.count == 2)
    #expect(Set(t.ids).count == 2)
    #expect(await reports.pending == 0)
}

@Test func translationReportClipsContextAndFreeTextToTheServerCaps() throws {
    let long = ReportSubject(lang: "zh", itemId: "w:x", text: String(repeating: "水", count: 400), shown: String(repeating: "火", count: 400), context: String(repeating: "a", count: 60))
    let r = TranslationReport(subject: long, reason: .meaning, suggestion: String(repeating: "山", count: 400), deviceId: UUID().uuidString.lowercased())
    #expect(r.context.count == TranslationReport.contextLimit)
    #expect(try JSONEncoder().encode(r).count <= TranslationReport.maxBytes)
}

@Test func translationReportDeviceIdIsStable() async {
    let suite = UUID().uuidString
    let a = TranslationReports(transport: ReportTransport([]), file: reportFile(), suite: suite)
    let b = TranslationReports(transport: ReportTransport([]), file: reportFile(), suite: suite)
    #expect(await a.deviceId == b.deviceId)
}
