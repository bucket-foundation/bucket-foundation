import Foundation
import Testing
@testable import BucketKit

struct ProgressServer: Sendable {
    let branches = LockedBox<[String: JSValue]>([:])
    let posts = LockedBox<[String]>([])

    var transport: StubTransport {
        StubTransport { r in
            if r.httpMethod == "POST", let b = r.httpBody, let j = try? JSON.parse(b), let branch = j["branch"]?.string {
                posts.mutate { $0.append(branch) }
                branches.mutate { $0[branch] = j["data"] }
                return (200, Data("{}".utf8))
            }
            var o = JSObject()
            for (k, v) in branches.value.sorted(by: { $0.key < $1.key }) { o[k] = .object(JSObject([("data", v)])) }
            return (200, JSON.data(.object(JSObject([("branches", .object(o))]))))
        }
    }
}

@MainActor
@Suite struct ScienceStoreTests {
    func deck() throws -> PreparedDeck {
        PreparedDeck(branch: "02-physics", atoms: try JSONDecoder().decode(Deck.self, from: scienceFixture("deck")).atoms)
    }

    @Test func signedOutGradesStayOnDevice() async throws {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { nil }, now: { 1_000_000 }, tz: { TimeZone(identifier: "UTC")! })
        let d = try deck()
        let first = try #require(store.route(d).first)
        store.grade(d, id: first.id, rating: 3, level: "recall")
        await store.flush()
        #expect(server.posts.value.isEmpty)
        #expect(store.saveState == .localOnly)
        let again = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { nil }, now: { 1_000_000 })
        await again.load([d.branch])
        #expect(again.state(d.branch).cards.has(first.id))
    }

    @Test func loadMergesTheServerBranchAndPushesTheUnion() async throws {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let d = try deck()
        let utc = { @MainActor in TimeZone(identifier: "UTC")! }
        let offline = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { nil }, now: { 1_000_000 }, tz: utc)
        let a = try #require(offline.route(d).first)
        offline.grade(d, id: a.id, rating: 3, level: "recall")
        var remote = EngineState()
        let other = try #require(route(EngineState(), d.atoms, now: 0, tz: utc()).dropFirst().first)
        remote = grade(remote, id: other.id, rating: 4, now: 500_000, tz: "UTC")
        server.branches.mutate { $0[d.branch] = remote.js }
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { "t" }, now: { 2_000_000 }, tz: utc)
        await store.load([d.branch])
        let s = store.state(d.branch)
        #expect(s.cards.has(a.id) && s.cards.has(other.id))
        #expect(server.posts.value == [d.branch])
        #expect(EngineState(js: server.branches.value[d.branch]) == s)
    }

    @Test func signInUploadsBranchesTheServerLacks() async throws {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let d = try deck()
        let signedIn = LockedBox(false)
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { signedIn.value ? "t" : nil }, now: { 1_000_000 }, tz: { TimeZone(identifier: "UTC")! })
        let a = try #require(store.route(d).first)
        store.grade(d, id: a.id, rating: 3, level: "recall")
        signedIn.mutate { $0 = true }
        await store.syncAfterSignIn()
        #expect(server.posts.value == [d.branch])
        #expect(EngineState(js: server.branches.value[d.branch]).cards.has(a.id))
    }
}
