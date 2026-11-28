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

    @Test func anOwnerBoundInSessionKeepsItsFirstUser() async {
        let who = LockedBox<String?>("A")
        let owner = AccountOwner(nil)
        let bound = BoundToken.make(owner: owner) { UserToken(userId: who.value, token: "t-\(who.value ?? "")") }
        #expect(await bound() == nil)
        #expect(owner.bind("A"))
        #expect(await bound() == "t-A")
        #expect(owner.bind("B") == false)
        who.mutate { $0 = "B" }
        #expect(await bound() == nil)
        #expect(owner.userId == "A")
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

    @Test func detachedStoreKeepsItsPendingWorkOnDisk() async {
        let server = LangStoreSyncTests().seeded()
        let disk = MemoryLangDisk()
        let s = LangStore(api: server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: BoundToken.make(owner: "A") { UserToken(userId: "A", token: "t") }, now: { 2_000 })
        await s.load()
        let before = server.posts.value.count
        let epoch = s.epoch
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        s.detach()
        #expect(s.epoch == epoch + 1)
        try? await Task.sleep(for: .seconds(1.5))
        #expect(server.posts.value.count == before)
        #expect(disk.read("pending.json") != nil)
        let reopened = LangStore(api: server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: BoundToken.make(owner: "A") { UserToken(userId: "A", token: "t") }, now: { 2_000 })
        await reopened.load()
        await reopened.retryPending()
        #expect(!reopened.hasUnsyncedWork)
        #expect(EngineState(js: server.branches.value[LangStoreSyncTests.branch]).cards.has(cardId("es", "adios")))
    }

    @Test func detachedScienceStoreSendsNothingAndKeepsItsGradesOnDisk() async throws {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let utc = { @MainActor in TimeZone(identifier: "UTC")! }
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { "t" }, now: { 1_000_000 }, tz: utc)
        let d = try ScienceStoreTests().deck()
        let first = try #require(store.route(d).first)
        let epoch = store.epoch
        store.grade(d, id: first.id, rating: 3, level: "recall")
        store.detach()
        #expect(store.epoch == epoch + 1)
        try? await Task.sleep(for: .seconds(1.5))
        #expect(server.posts.value.isEmpty)
        #expect(store.localBranches() == [d.branch])
        let reopened = ScienceStore(api: BucketAPI(transport: server.transport), disk: disk, token: { "t" }, now: { 1_000_000 }, tz: utc)
        await reopened.resync()
        #expect(server.posts.value == [d.branch])
        #expect(EngineState(js: server.branches.value[d.branch]).cards.has(first.id))
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

@MainActor
@Test func refreshTakesTheLockOfTheRefreshingUser() async {
    let asked = LockedBox<[String?]>([])
    let expired = Session(accessToken: "old", refreshToken: "r", expiresAt: 0, userId: "user-1")
    let api = BucketAPI(transport: ThrowingTransport(error: URLError(.notConnectedToInternet)))
    let a = Account(api: api, store: MemorySessionStore(expired), locks: { user in asked.mutate { $0.append(user) }; return nil })
    _ = await a.freshToken()
    #expect(asked.value == ["user-1"])
}

@MainActor
@Test func userTokenNamesTheUserWhoseSessionWasUsed() async {
    let a = Account(api: BucketAPI(transport: StubTransport { _ in (500, Data()) }), store: MemorySessionStore(liveSession))
    #expect(await a.userToken() == UserToken(userId: "user-1", token: "bearer-1"))
}
