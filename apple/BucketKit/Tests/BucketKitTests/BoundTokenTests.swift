import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct BoundTokenTests {
    @Test func tokenForAnotherUserIsWithheld() async {
        let who = LockedBox<String?>("B")
        let bound = BoundToken.make(owner: "A") { UserToken(userId: who.value, token: "t-\(who.value ?? "")") }
        #expect(await bound() == nil)
        who.mutate { $0 = "A" }
        #expect(await bound() == "t-A")
        #expect(await BoundToken.make(owner: nil) { UserToken(userId: nil, token: "t") }() == nil)
    }

    @Test func sendRefusesTokenForAnotherUser() async {
        let server = LangStoreSyncTests().seeded()
        let who = LockedBox<String?>("A")
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: BoundToken.make(owner: "A") { UserToken(userId: who.value, token: "t") }, now: { 2_000 })
        await s.load()
        let before = server.posts.value.count
        who.mutate { $0 = "B" }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(server.posts.value.count == before)
        #expect(s.hasUnsyncedWork)
        #expect(s.saveState == .localOnly)
        who.mutate { $0 = "A" }
        await s.retryPending()
        #expect(!s.hasUnsyncedWork)
        #expect(EngineState(js: server.branches.value[LangStoreSyncTests.branch]).cards.has(cardId("es", "adios")))
    }

    @Test func scienceSendRefusesTokenForAnotherUserAndRecoversOnResync() async throws {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let who = LockedBox<String?>("B")
        let utc = { @MainActor in TimeZone(identifier: "UTC")! }
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: BoundToken.make(owner: "A") { UserToken(userId: who.value, token: "t") }, now: { 1_000_000 }, tz: utc)
        let d = try ScienceStoreTests().deck()
        let first = try #require(store.route(d).first)
        store.grade(d, id: first.id, rating: 3, level: "recall")
        await store.flush()
        #expect(server.posts.value.isEmpty)
        #expect(store.saveState == .localOnly)
        who.mutate { $0 = "A" }
        await store.resync()
        #expect(server.posts.value == [d.branch])
        #expect(EngineState(js: server.branches.value[d.branch]).cards.has(first.id))
    }
}
