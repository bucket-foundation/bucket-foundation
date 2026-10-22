import Foundation
import Testing
@testable import BucketKit

struct StubTransport: Transport {
    let routes: @Sendable (URLRequest) -> (Int, Data)

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (status, data) = routes(request)
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }
}

func fixture(_ name: String) throws -> Data {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
    return try Data(contentsOf: url)
}

func json(_ object: [String: Any]) -> Data {
    try! JSONSerialization.data(withJSONObject: object)
}

final class LockedBox<T>: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: T
    init(_ value: T) { stored = value }
    var value: T { lock.withLock { stored } }
    func mutate(_ change: (inout T) -> Void) { lock.withLock { change(&stored) } }
}

func bodyAction(_ r: URLRequest) -> String? {
    guard let b = r.httpBody, let o = try? JSONSerialization.jsonObject(with: b) as? [String: String] else { return nil }
    return o["action"]
}

@Suite struct DecodingTests {
    @Test func deckIndexSplitsPillAndFlagsLanguages() throws {
        let index = try JSONDecoder().decode(DeckIndex.self, from: fixture("index"))
        let math = try #require(index.decks.first { $0.id == "01-mathematics" })
        #expect(math.title == "Mathematics")
        #expect(math.mark == "I")
        #expect(!math.isLanguage)
        #expect(index.decks.contains { $0.isLanguage })
    }

    @Test func deckDecodesAtomsWithQuizAndDepths() throws {
        let deck = try JSONDecoder().decode(Deck.self, from: fixture("deck"))
        #expect(deck.meta.branch == "01-mathematics")
        let atom = try #require(deck.atoms.first)
        #expect(!atom.quiz.isEmpty)
        #expect(atom.orderedDepths.map(\.key) == ["eli5", "core", "deep"])
    }

    @Test func canonSearchDecodes() throws {
        let s = try JSONDecoder().decode(CanonSearch.self, from: fixture("canon"))
        #expect(s.query == "entropy")
        #expect(!s.results.isEmpty)
    }
}

@Suite struct SessionErrorTests {
    @Test(arguments: [
        (400, "bad_email", BucketError.badEmail),
        (400, "bad_code", BucketError.badCode),
        (401, "revoked", BucketError.revoked),
        (503, "review_log_disabled", BucketError.unavailable),
    ])
    func mapsServerRefusals(status: Int, code: String, expected: BucketError) {
        #expect(BucketAPI.sessionError(status: status, data: json(["error": code])) == expected)
    }

    @Test func keepsRateLimitMessage() {
        let e = BucketAPI.sessionError(status: 429, data: json(["error": "too_many_requests", "message": "Wait."]))
        #expect(e == .rateLimited("Wait."))
    }
}

@MainActor
@Suite struct AccountTests {
    let tokens = json(["access_token": "a1", "refresh_token": "r1", "expires_at": 4_000_000_000, "user_id": "u1"])

    func signedIn(_ transport: StubTransport, expiresIn: Int = 3600) -> Account {
        let live = Session(accessToken: "tok", refreshToken: "r0", expiresAt: Int(Date.now.timeIntervalSince1970) + expiresIn, userId: "u1")
        return Account(api: BucketAPI(transport: transport), store: MemorySessionStore(live))
    }

    @Test func endingsTellWhoEndedTheSession() async {
        let out = signedIn(StubTransport { _ in (200, json(["ok": true])) })
        out.signOut()
        #expect(out.ending == .signedOut && out.endedByUser)
        let deleted = signedIn(StubTransport { _ in (200, json(["ok": true])) })
        await deleted.deleteAccount()
        #expect(deleted.ending == .deleted && deleted.endedByUser)
        let expired = signedIn(StubTransport { _ in (401, json(["error": "revoked"])) }, expiresIn: 10)
        _ = await expired.freshToken()
        #expect(expired.ending == .expired && !expired.endedByUser)
        #expect(expired.stage == .signedOut)
    }

    @Test func signOutAfterSyncRunsTheFlushFirst() async {
        let account = signedIn(StubTransport { _ in (200, json(["ok": true])) })
        let order = LockedBox<[String]>([])
        account.beforeSignOut = { order.mutate { $0.append(account.session == nil ? "after" : "before") } }
        await account.signOutAfterSync()
        #expect(order.value == ["before"])
        #expect(account.stage == .signedOut)
    }

    @Test func codeThenVerifyStoresSession() async {
        let ok = tokens
        let api = BucketAPI(transport: StubTransport { r in
            bodyAction(r) == "verify" ? (200, ok) : (200, json(["ok": true]))
        })
        let store = MemorySessionStore()
        let account = Account(api: api, store: store)
        await account.sendCode(to: " me@example.com ")
        #expect(account.stage == .codeSent("me@example.com"))
        await account.verify(code: "123 456")
        #expect(account.stage == .signedIn)
        #expect(store.load()?.accessToken == "a1")
    }

    @Test func badCodeKeepsCodeStageWithMessage() async {
        let api = BucketAPI(transport: StubTransport { r in
            bodyAction(r) == "verify" ? (400, json(["error": "bad_code"])) : (200, json(["ok": true]))
        })
        let account = Account(api: api, store: MemorySessionStore())
        await account.sendCode(to: "me@example.com")
        await account.verify(code: "000000")
        #expect(account.stage == .codeSent("me@example.com"))
        #expect(account.error == BucketError.badCode.errorDescription)
    }

    @Test func deleteAccountSendsBearerAndClearsTheSession() async {
        let live = Session(accessToken: "tok", refreshToken: "r0", expiresAt: Int(Date.now.timeIntervalSince1970) + 3600, userId: "u1")
        let seen = LockedBox<[String]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append("\(bodyAction(r) ?? "") \(r.value(forHTTPHeaderField: "authorization") ?? "")") }
            return (200, json(["ok": true]))
        })
        let store = MemorySessionStore(live)
        let account = Account(api: api, store: store)
        await account.deleteAccount()
        #expect(seen.value == ["delete_account Bearer tok"])
        #expect(account.stage == .signedOut)
        #expect(store.load() == nil)
        #expect(account.error == nil)
    }

    @Test func failedDeleteKeepsTheSession() async {
        let live = Session(accessToken: "tok", refreshToken: "r0", expiresAt: Int(Date.now.timeIntervalSince1970) + 3600, userId: "u1")
        let store = MemorySessionStore(live)
        let account = Account(api: BucketAPI(transport: StubTransport { _ in (502, json(["error": "delete_failed"])) }), store: store)
        await account.deleteAccount()
        #expect(account.stage == .signedIn)
        #expect(store.load() != nil)
        #expect(account.error != nil)
    }

    @Test func expiredSessionRefreshesAndRevokedSignsOut() async {
        let stale = Session(accessToken: "old", refreshToken: "r0", expiresAt: 0, userId: "u1")
        let fresh = tokens
        let refreshed = Account(api: BucketAPI(transport: StubTransport { _ in (200, fresh) }), store: MemorySessionStore(stale))
        #expect(await refreshed.freshToken() == "a1")

        let soon = Session(accessToken: "soon", refreshToken: "r0", expiresAt: Int(Date.now.timeIntervalSince1970) + 30, userId: "u1")
        let offline = Account(api: BucketAPI(transport: StubTransport { _ in (502, json(["error": "refresh_failed"])) }), store: MemorySessionStore(soon))
        #expect(await offline.freshToken() == "soon")
        let expiredOffline = Account(api: BucketAPI(transport: StubTransport { _ in (502, json(["error": "refresh_failed"])) }), store: MemorySessionStore(stale))
        #expect(await expiredOffline.freshToken() == nil)

        let revoked = Account(api: BucketAPI(transport: StubTransport { _ in (401, json(["error": "revoked"])) }), store: MemorySessionStore(stale))
        #expect(await revoked.freshToken() == nil)
        #expect(revoked.stage == .signedOut)
    }
}

@Suite struct TeXLiteTests {
    @Test func functionNamesAndEscapedSpace() {
        #expect(TeXLite.render("|a\\times b| = ab\\sin\\theta") == "|a× b| = ab sin θ")
        #expect(TeXLite.render("20\\ km/h") == "20 km/h")
    }

    @Test(arguments: [
        ("f\\colon X \\to Y,\\quad x \\mapsto f(x)", "f: X → Y,  x ↦ f(x)"),
        ("E = mc^2", "E = mc²"),
        ("x_{n+1} = x_n", "xₙ₊₁ = xₙ"),
        ("\\frac{a}{b}", "(a)⁄(b)"),
        ("\\alpha + \\beta \\leq \\gamma", "α + β ≤ γ"),
        ("e^{i\\pi} + 1 = 0", "e^(iπ) + 1 = 0"),
    ])
    func renders(tex: String, expected: String) {
        #expect(TeXLite.render(tex) == expected)
    }
}

final class Counter: @unchecked Sendable {
    private let lock = NSLock()
    private var n = 0
    func bump() { lock.withLock { n += 1 } }
    var value: Int { lock.withLock { n } }
}

@MainActor
@Suite struct RefreshTests {
    @Test func concurrentCallersShareOneRefresh() async {
        let calls = Counter()
        let fresh = json(["access_token": "a2", "refresh_token": "r2", "expires_at": 4_000_000_000, "user_id": "u1"])
        let api = BucketAPI(transport: StubTransport { _ in calls.bump(); return (200, fresh) })
        let account = Account(api: api, store: MemorySessionStore(Session(accessToken: "old", refreshToken: "r0", expiresAt: 0, userId: "u1")))
        async let a = account.freshToken()
        async let b = account.freshToken()
        async let c = account.freshToken()
        let tokens = await [a, b, c]
        #expect(tokens == ["a2", "a2", "a2"])
        #expect(calls.value == 1)
    }
}
