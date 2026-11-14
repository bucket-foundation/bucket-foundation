import Foundation
import Testing
@testable import BucketKit

struct FlakyServer: Sendable {
    let progress = ProgressServer()
    let up = LockedBox(true)
    let clipIndex = LockedBox(Data(#"{"es":["hola"]}"#.utf8))

    var transport: StubTransport {
        let inner = progress.transport
        return StubTransport { r in
            guard up.value else { return (503, Data()) }
            if r.url?.path.hasSuffix("audio/index.json") == true { return (200, clipIndex.value) }
            if r.url?.path.hasSuffix("api/academy/progress") == true { return inner.routes(r) }
            return (404, Data())
        }
    }
}

@MainActor
@Suite struct OfflineSyncTests {
    @Test func reconnectRunsEveryHandlerOnce() async {
        let watch = NetworkWatch()
        let calls = LockedBox(0)
        watch.onReconnect { calls.mutate { $0 += 1 } }
        watch.onReconnect { calls.mutate { $0 += 10 } }
        watch.update(true)
        #expect(calls.value == 0)
        watch.update(false)
        #expect(!watch.online)
        watch.update(true)
        await watch.resync().value
        #expect(calls.value == 11)
        #expect(watch.online)
    }

    @Test func overlappingResyncsShareOneRun() async {
        let watch = NetworkWatch()
        let calls = LockedBox(0)
        watch.onReconnect { calls.mutate { $0 += 1 } }
        let a = watch.resync()
        let b = watch.resync()
        await a.value
        await b.value
        #expect(calls.value == 1)
    }

    @Test func languageWorkDoneOfflineUploadsOnResync() async throws {
        let server = FlakyServer()
        server.up.mutate { $0 = false }
        let store = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 1_000_000 })
        let s = try await store.create(root: "en", targets: ["es"])
        #expect(store.saveState == .localOnly)
        store.grade(s.id, lang: "es", itemId: "hola", rating: 3)
        await store.flush()
        #expect(server.progress.posts.value.isEmpty)
        server.up.mutate { $0 = true }
        await store.resync()
        let branch = progressBranch(s)
        #expect(Set(server.progress.posts.value) == [LangStore.systemsBranch, branch])
        #expect(EngineState(js: server.progress.branches.value[branch]).cards.has(cardId("es", "hola")))
        #expect(SystemsDoc(js: server.progress.branches.value[LangStore.systemsBranch]).systems.map(\.id) == [s.id])
        #expect(store.saveState == .synced)
    }

    @Test func resyncKeepsWorkFromBothDevices() async throws {
        let server = FlakyServer()
        let other = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 1_000_000 })
        let s = try await other.create(root: "en", targets: ["es"])
        other.grade(s.id, lang: "es", itemId: "adios", rating: 3)
        await other.flush()
        let phone = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000_000 })
        await phone.resync()
        server.up.mutate { $0 = false }
        phone.grade(s.id, lang: "es", itemId: "hola", rating: 3)
        await phone.flush()
        server.up.mutate { $0 = true }
        server.progress.posts.mutate { $0 = [] }
        await phone.resync()
        let both = EngineState(js: server.progress.branches.value[progressBranch(s)])
        #expect(both.cards.has(cardId("es", "hola")) && both.cards.has(cardId("es", "adios")))
        #expect(phone.state(s.id) == both)
        #expect(server.progress.posts.value == [progressBranch(s)])
    }

    @Test func resyncWhileOfflineChangesNothing() async throws {
        let server = FlakyServer()
        server.up.mutate { $0 = false }
        let store = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 1_000_000 })
        let s = try await store.create(root: "en", targets: ["es"])
        store.grade(s.id, lang: "es", itemId: "hola", rating: 3)
        let before = store.state(s.id)
        await store.resync()
        #expect(store.state(s.id) == before)
        #expect(store.saveState == .localOnly)
        #expect(server.progress.posts.value.isEmpty)
    }

    @Test func clipIndexStaysAvailableOffline() async {
        let server = FlakyServer()
        let cache = MemoryLangDisk()
        let online = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: cache, seed: { _ in nil }, token: { nil })
        await online.load()
        #expect(online.clips["es"] == ["hola"])
        server.up.mutate { $0 = false }
        let offline = LangStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), cache: cache, seed: { _ in nil }, token: { nil })
        await offline.load()
        #expect(offline.clips["es"] == ["hola"])
    }

    @Test func scienceGradesFromOfflineUploadOnResync() async throws {
        let server = FlakyServer()
        server.up.mutate { $0 = false }
        let d = PreparedDeck(branch: "02-physics", atoms: try JSONDecoder().decode(Deck.self, from: scienceFixture("deck")).atoms)
        let store = ScienceStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), token: { "t" }, now: { 1_000_000 }, tz: { TimeZone(identifier: "UTC")! })
        let first = try #require(store.route(d).first)
        store.grade(d, id: first.id, rating: 3, level: "recall")
        await store.flush()
        #expect(store.saveState == .localOnly)
        server.up.mutate { $0 = true }
        await store.resync()
        #expect(server.progress.posts.value == [d.branch])
        #expect(EngineState(js: server.progress.branches.value[d.branch]).cards.has(first.id))
        #expect(store.saveState == .synced)
    }
}
