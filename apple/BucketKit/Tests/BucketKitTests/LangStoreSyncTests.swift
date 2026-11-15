import Foundation
import Testing
@testable import BucketKit

final class LangServer: @unchecked Sendable {
    let branches = LockedBox<[String: JSValue]>([:])
    let posts = LockedBox<[String]>([])
    let online = LockedBox(true)

    var api: BucketAPI {
        BucketAPI(transport: StubTransport { [self] r in
            guard online.value else { return (503, Data()) }
            guard r.url?.path.hasSuffix("api/academy/progress") == true else { return (404, Data()) }
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

    func store(_ server: LangServer, _ disk: LangDisk, signedIn: LockedBox<Bool>) -> LangStore {
        LangStore(api: server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { 2_000 })
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
        await s.syncAfterSignIn()
        #expect(s.systems.map(\.id) == ["s1"])
        #expect(s.state("s1").cards.has(cardId("es", "hola")))
        #expect(server.posts.value.isEmpty)
    }

    @Test func blankLocalStateNeverOverwritesServerBranch() async {
        let server = seeded()
        let s = store(server, MemoryLangDisk(), signedIn: LockedBox(true))
        let pull = await server.api.progressPull(token: "t")!
        let status = await s.send("t", Self.branch, EngineState().js, over: pull)
        let systems = await s.send("t", LangStore.systemsBranch, SystemsDoc().js, over: pull)
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
        #expect(s.saveState == .localOnly)
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
        await s.syncAfterSignIn()
        let branch = progressBranch(s.systems.first!)
        #expect(EngineState(js: server.branches.value[branch]).cards.has(cardId("es", "hola")))
        #expect(!s.hasUnsyncedWork)
    }
}
