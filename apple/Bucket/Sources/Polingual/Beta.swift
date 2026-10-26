import BucketKit
import Foundation

@MainActor
final class Beta {
    static let shared = Beta()

    let events: BetaEvents
    private(set) var flags = BetaFlags.cached()
    private var sessionId = UUID().uuidString.lowercased()
    private var sessionStarted: Date?
    weak var account: Account?

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        events = BetaEvents(app: BucketAPI.appName, file: dir.appending(path: "beta-events.json"))
    }

    func log(_ name: String, _ props: [String: JSONScalar] = [:]) {
        guard account?.session != nil else { return }
        let event = BetaEvent(name: name, sessionId: sessionId, props: props)
        Task { await events.log(event) }
    }

    func foreground(_ account: Account) {
        self.account = account
        sessionId = UUID().uuidString.lowercased()
        log("app_open")
        Task {
            let token = await account.freshToken()
            flags = await BetaFlags.fetch(app: BucketAPI.appName, token: token)
            _ = await events.flush(token: token)
        }
    }

    func background(_ account: Account) {
        self.account = account
        Task { _ = await events.flush(token: await account.freshToken()) }
    }

    func studyStarted(_ deck: String) {
        sessionStarted = .now
        log("session_start", ["deck": .string(deck)])
    }

    func answered(_ deck: String, correct: Bool, ms: Int, kind: String) {
        log("card_answered", ["deck": .string(deck), "correct": .bool(correct), "ms": .number(Double(ms)), "kind": .string(kind)])
    }

    func studyEnded(_ deck: String, graded: Int, correct: Int) {
        let seconds = sessionStarted.map { Date.now.timeIntervalSince($0) } ?? 0
        sessionStarted = nil
        log("session_end", ["deck": .string(deck), "seconds": .number(seconds.rounded()), "graded": .number(Double(graded)), "correct": .number(Double(correct))])
    }
}
