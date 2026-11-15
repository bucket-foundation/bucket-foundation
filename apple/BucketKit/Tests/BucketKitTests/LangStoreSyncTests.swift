import Foundation
import Testing
@testable import BucketKit

final class LangServer: @unchecked Sendable {
    let branches = LockedBox<[String: JSValue]>([:])
    let posts = LockedBox<[String]>([])
    let online = LockedBox(true)
    let refuse = LockedBox(false)
    let refusals = LockedBox(0)
    let postStatus = LockedBox<Int?>(nil)

    var api: BucketAPI {
        BucketAPI(transport: StubTransport { [self] r in
            guard online.value else { return (503, Data()) }
            guard r.url?.path.hasSuffix("api/academy/progress") == true else { return (404, Data()) }
            if r.httpMethod == "POST", let code = postStatus.value { return (code, Data()) }
            if r.httpMethod == "POST" && refuse.value { refusals.mutate { $0 += 1 }; return (409, Data(#"{"error":"blank_overwrite"}"#.utf8)) }
            if r.httpMethod == "POST", let b = r.httpBody, let j = try? JSON.parse(b), let branch = j["branch"]?.string {
                posts.mutate { $0.append(branch) }
                branches.mutate { $0[branch] = j["data"] }
                return (200, Data("{}".utf8))
            }
            var o = JSObject()
            for (k, v) in branches.value.sorted(by: { $0.key < $1.key }) { o[k] = .object(JSObject([("data", v)])) }
            return (200, JSON.data(.object(JSObject([("branches", .object(o))]))))
        })
    }
}

@MainActor
@Suite struct LangStoreSyncTests {
    static let system = LangSystem(js: try! JSON.parse(Data(#"{"id":"s1","name":"Spanish","root":"en","targets":["es"],"createdAt":1,"placement":{}}"#.utf8)))!
    static let branch = progressBranch(system)

    func seeded() -> LangServer {
        let server = LangServer()
        var studied = EngineState()
        studied = gradeCard(studied, "es", "hola", 3, now: 1_000, tz: "UTC")
        server.branches.mutate {
            $0[LangStore.systemsBranch] = SystemsDoc(systems: [Self.system]).js
            $0[Self.branch] = studied.js
        }
        return server
    }

    func store(_ server: LangServer, _ disk: LangDisk, signedIn: LockedBox<Bool>, api: BucketAPI? = nil, clock: LockedBox<Double> = LockedBox(2_000)) -> LangStore {
        LangStore(api: api ?? server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { clock.value })
    }

    @Test func signInAfterSignOutShowsServerProgress() async {
        let server = seeded()
        let signedIn = LockedBox(true)
        let s = store(server, MemoryLangDisk(), signedIn: signedIn)
        await s.load()
        #expect(s.state("s1").cards.has(cardId("es", "hola")))
        signedIn.mutate { $0 = false }
        await s.flush()
        s.clearLocal()
        #expect(s.systems.isEmpty)
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        #expect(s.systems.map(\.id) == ["s1"])
        #expect(s.state("s1").cards.has(cardId("es", "hola")))
        #expect(server.posts.value.isEmpty)
    }

    @Test func blankLocalStateNeverOverwritesServerBranch() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        let pull = await server.api.progressPull(token: "t")!
        let status = await s.send("t", Self.branch, EngineState().js, over: pull, epoch: s.epoch)
        let systems = await s.send("t", LangStore.systemsBranch, SystemsDoc().js, over: pull, epoch: s.epoch)
        #expect(status == 409 && systems == 409)
        #expect(server.posts.value.isEmpty)
        #expect(EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "hola")))
    }

    @Test func offlineStudyQueuesAndSyncsOnReconnect() async {
        let server = seeded()
        let disk = MemoryLangDisk()
        let s = store(server, disk, signedIn: LockedBox(true))
        await s.load()
        server.online.mutate { $0 = false }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(s.hasUnsyncedWork)
        #expect(s.saveState == .offline)
        server.online.mutate { $0 = true }
        let relaunched = store(server, disk, signedIn: LockedBox(true))
        #expect(relaunched.hasUnsyncedWork)
        await relaunched.load()
        #expect(!relaunched.hasUnsyncedWork)
        let saved = EngineState(js: server.branches.value[Self.branch])
        #expect(saved.cards.has(cardId("es", "adios")) && saved.cards.has(cardId("es", "hola")))
    }

    @Test func signedOutStudyPushesAfterSignIn() async {
        let server = LangServer()
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(false)
        let s = store(server, disk, signedIn: signedIn)
        await s.load()
        _ = try? await s.create(root: "en", targets: ["es"])
        let id = s.systems.first!.id
        s.grade(id, lang: "es", itemId: "hola", rating: 3)
        await s.flush()
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        let branch = progressBranch(s.systems.first!)
        #expect(EngineState(js: server.branches.value[branch]).cards.has(cardId("es", "hola")))
        #expect(!s.hasUnsyncedWork)
    }

    @Test func offlineSignOutKeepsWorkForThatAccountOnly() async {
        let server = seeded()
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(true)
        let s = store(server, disk, signedIn: signedIn)
        await s.syncAfterSignIn(account: "user-a")
        server.online.mutate { $0 = false }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        signedIn.mutate { $0 = false }
        s.clearLocal()
        #expect(s.systems.isEmpty && !s.hasUnsyncedWork)
        server.online.mutate { $0 = true }
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-b")
        #expect(!EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "adios")))
        signedIn.mutate { $0 = false }
        s.clearLocal()
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        let saved = EngineState(js: server.branches.value[Self.branch])
        #expect(saved.cards.has(cardId("es", "adios")) && saved.cards.has(cardId("es", "hola")))
        #expect(!s.hasUnsyncedWork)
    }

    @Test func reconnectWithoutRelaunchPushesQueuedWork() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        await s.load()
        server.online.mutate { $0 = false }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(s.hasUnsyncedWork)
        server.online.mutate { $0 = true }
        await s.connectivityChanged(online: true)
        #expect(!s.hasUnsyncedWork)
        #expect(EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "adios")))
    }

    @Test func secondGradeDuringSuspendedPushStaysPending() async {
        let server = seeded()
        let gate = PostGate(inner: server.api)
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true), api: BucketAPI(transport: gate))
        await s.load()
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        let first = Task { await s.push("s1", Self.branch) }
        while !gate.waiting.value { await Task.yield() }
        s.grade("s1", lang: "es", itemId: "gracias", rating: 3)
        gate.open.mutate { $0 = true }
        await first.value
        #expect(s.hasUnsyncedWork)
        await s.flush()
        #expect(!s.hasUnsyncedWork)
        #expect(EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "gracias")))
    }

    @Test func refusedPushKeepsWorkShowsRefusedAndBacksOff() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        await s.load()
        server.refuse.mutate { $0 = true }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(s.saveState == .refused)
        #expect(s.hasUnsyncedWork)
        let refusedPosts = server.refusals.value
        await s.retryPending()
        await s.connectivityChanged(online: true)
        #expect(server.refusals.value == refusedPosts)
    }

    @Test func foregroundReconnectAndLoadShareOnePush() async {
        let server = seeded()
        let gate = PostGate(inner: server.api)
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true), api: BucketAPI(transport: gate))
        await s.load()
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        let a = Task { await s.flush() }
        while !gate.waiting.value { await Task.yield() }
        await s.connectivityChanged(online: true)
        await s.retryPending()
        gate.open.mutate { $0 = true }
        await a.value
        #expect(server.posts.value.filter { $0 == Self.branch }.count == 1)
    }

    @Test func signOutDuringLoadKeepsPreviousAccountOffDisk() async {
        let server = seeded()
        let gate = LockedBox(false)
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(true)
        let s = LangStore(api: BucketAPI(transport: PullGate(inner: server.api, gate: gate)), disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { 2_000 })
        let loading = Task { await s.load() }
        try? await Task.sleep(for: .milliseconds(100))
        signedIn.mutate { $0 = false }
        s.clearLocal()
        gate.mutate { $0 = true }
        await loading.value
        #expect(s.systems.isEmpty)
        #expect(!s.hasLocalSystems)
    }

    @Test func signInDuringLoadWaitsForFreshSystems() async {
        let server = seeded()
        let gate = LockedBox(false)
        let s = LangStore(api: BucketAPI(transport: PullGate(inner: server.api, gate: gate)), disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
        let loading = Task { await s.load() }
        try? await Task.sleep(for: .milliseconds(50))
        let signIn = Task { await s.syncAfterSignIn(account: "user-a") }
        try? await Task.sleep(for: .milliseconds(50))
        gate.mutate { $0 = true }
        await loading.value
        await signIn.value
        #expect(s.systems.map(\.id) == ["s1"])
        #expect(s.state("s1").cards.has(cardId("es", "hola")))
    }

    @Test func offlineWhileSignedInShowsOffline() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        await s.load()
        server.online.mutate { $0 = false }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(s.saveState == .offline)
    }

    @Test(arguments: [(503, SaveResult.failed), (500, .failed), (401, .localOnly), (403, .needsProfile)])
    func rejectedPushNamesTheCause(code: Int, expected: SaveResult) async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        await s.load()
        server.postStatus.mutate { $0 = code }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        #expect(s.saveState == expected)
        #expect(s.hasUnsyncedWork)
    }

    @Test func settingsOnlyStateCountsAsBlankOverStudiedServer() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        var settingsOnly = EngineState()
        settingsOnly.newPerDay = 9
        let pull = await server.api.progressPull(token: "t")!
        #expect(await s.send("t", Self.branch, settingsOnly.js, over: pull, epoch: s.epoch) == 409)
        #expect(server.posts.value.isEmpty)
    }

    @Test func unknownAccountSignOutHoldsWorkAndNeverDeliversIt() async {
        let server = seeded()
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(true)
        let s = store(server, disk, signedIn: signedIn)
        await s.syncAfterSignIn(account: LangStore.unknownOwner)
        server.online.mutate { $0 = false }
        s.grade("s1", lang: "es", itemId: "adios", rating: 3)
        await s.flush()
        signedIn.mutate { $0 = false }
        s.clearLocal()
        #expect(disk.read("held-\(LangStore.unknownOwner).json") != nil)
        server.online.mutate { $0 = true }
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        #expect(!EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "adios")))
    }

    @Test func heldWorkIsDeletedAfterRestoreExpiresAndWipesOnDelete() async {
        let server = seeded()
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(true)
        let clock = LockedBox<Double>(2_000)
        let s = store(server, disk, signedIn: signedIn, clock: clock)
        func holdOffline(_ id: String, _ item: String) async {
            await s.syncAfterSignIn(account: id)
            server.online.mutate { $0 = false }
            s.grade("s1", lang: "es", itemId: item, rating: 3)
            await s.flush()
            signedIn.mutate { $0 = false }
            s.clearLocal()
            server.online.mutate { $0 = true }
            signedIn.mutate { $0 = true }
        }
        await holdOffline("user-a", "uno")
        await s.syncAfterSignIn(account: "user-a")
        #expect(disk.read("held-user-a.json") == nil)
        s.clearLocal()
        await holdOffline("user-b", "dos")
        clock.mutate { $0 += LangStore.heldTTL + 1 }
        await s.syncAfterSignIn(account: "user-b")
        #expect(disk.read("held-user-b.json") == nil)
        #expect(!EngineState(js: server.branches.value[Self.branch]).cards.has(cardId("es", "dos")))
        s.clearLocal()
        clock.mutate { $0 = 2_000 }
        await holdOffline("user-c", "tres")
        #expect(disk.read("held-user-c.json") != nil)
        s.setOwner("user-c")
        s.clearLocal(accountDeleted: true)
        #expect(disk.read("held-user-c.json") == nil)
    }

    @Test func staleEpochPersistAndHealWriteNothing() async {
        let server = seeded()
        let disk = MemoryLangDisk()
        let s = store(server, disk, signedIn: LockedBox(true))
        await s.load()
        let old = s.epoch
        s.clearLocal()
        await s.persistSystems(upsert: Self.system, epoch: old)
        await s.healPlacements(epoch: old)
        #expect(!s.hasLocalSystems)
        #expect(s.systems.isEmpty)
        #expect(server.posts.value.isEmpty)
    }

    @Test func signOutDuringSignInSyncSendsNothingForTheOldAccount() async {
        let server = LangServer()
        let gate = LockedBox(true)
        let disk = MemoryLangDisk()
        let signedIn = LockedBox(false)
        let s = LangStore(api: BucketAPI(transport: PullGate(inner: server.api, gate: gate)), disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { 2_000 })
        await s.load()
        _ = try? await s.create(root: "en", targets: ["es"])
        s.grade(s.systems.first!.id, lang: "es", itemId: "hola", rating: 3)
        await s.flush()
        gate.mutate { $0 = false }
        signedIn.mutate { $0 = true }
        let signIn = Task { await s.syncAfterSignIn(account: "user-a") }
        try? await Task.sleep(for: .milliseconds(50))
        s.clearLocal()
        gate.mutate { $0 = true }
        await signIn.value
        #expect(server.posts.value.isEmpty)
        #expect(s.systems.isEmpty && !s.hasLocalSystems)
    }

}

final class PostGate: Transport, @unchecked Sendable {
    let inner: BucketAPI
    let waiting = LockedBox(false)
    let open = LockedBox(false)
    init(inner: BucketAPI) { self.inner = inner }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        if request.httpMethod == "POST" && !open.value {
            waiting.mutate { $0 = true }
            while !open.value { try await Task.sleep(for: .milliseconds(5)) }
        }
        return try await inner.transport.send(request)
    }
}

struct PullGate: Transport {
    let inner: BucketAPI
    let gate: LockedBox<Bool>
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        if request.httpMethod != "POST" { while !gate.value { try await Task.sleep(for: .milliseconds(10)) } }
        return try await inner.transport.send(request)
    }
}
