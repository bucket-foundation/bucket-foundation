import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct LangStoreKnownTests {
    static let branch = KnownLanguages.branch

    func store(_ server: LangServer, _ disk: LangDisk = MemoryLangDisk(), signedIn: LockedBox<Bool> = LockedBox(true), clock: LockedBox<Double> = LockedBox(2_000)) -> LangStore {
        LangStore(api: server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { signedIn.value ? "t" : nil }, now: { clock.value })
    }

    func saved(_ server: LangServer) -> KnownLanguages { KnownLanguages(js: server.branches.value[Self.branch]) }

    @Test func documentRoundTripsThroughJSON() {
        let known = KnownLanguages(["es", "en"], at: 42)
        #expect(KnownLanguages(js: try? JSON.parse(JSON.data(known.js))) == known)
        #expect(KnownLanguages(js: nil).isBlank)
    }

    @Test func settingKnownLanguagesPushesTheBranch() async {
        let server = LangServer()
        let s = store(server)
        await s.load()
        await s.setKnown(["es", "en"])
        #expect(s.known.codes == ["en", "es"])
        #expect(saved(server) == KnownLanguages(["en", "es"], at: 2_000))
        #expect(server.posts.value == [Self.branch])
        #expect(!s.hasUnsyncedWork && s.saveState == .synced)
    }

    @Test func twoDevicesWriteInTurnAndTheLaterOneWins() async {
        let server = LangServer()
        let phone = store(server, clock: LockedBox(1_000))
        let tablet = store(server, clock: LockedBox(3_000))
        await phone.load()
        await tablet.load()
        await phone.setKnown(["en"])
        await tablet.setKnown(["en", "pt"])
        #expect(saved(server).codes == ["en", "pt"])
        await phone.resync()
        #expect(phone.known == KnownLanguages(["en", "pt"], at: 3_000))
        #expect(server.posts.value == [Self.branch, Self.branch])
    }

    @Test func anOlderLocalAnswerYieldsToANewerServerOne() async {
        let server = LangServer()
        server.branches.mutate { $0[Self.branch] = KnownLanguages(["fr"], at: 9_000).js }
        let s = store(server, clock: LockedBox(1_000))
        await s.setKnown(["de"])
        #expect(s.known == KnownLanguages(["fr"], at: 9_000))
        #expect(saved(server).codes == ["fr"])
        #expect(server.posts.value.isEmpty && !s.hasUnsyncedWork)
    }

    @Test func anEmptyListIsRefusedOverAStoredOne() async {
        let server = LangServer()
        server.branches.mutate { $0[Self.branch] = KnownLanguages(["fr"], at: 1).js }
        let s = store(server)
        await s.load()
        let pull = await server.api.progressPull(token: "t")!
        let status = await s.send("t", Self.branch, KnownLanguages([], at: 5_000).js, over: pull, epoch: s.epoch)
        #expect(status == 409)
        await s.setKnown([])
        await s.setKnown(["xx"])
        #expect(s.known.codes == ["fr"] && saved(server).codes == ["fr"])
        #expect(server.posts.value.isEmpty)
    }

    @Test func aSystemsPushLeavesKnownLanguagesUntouched() async throws {
        let server = LangServer()
        let stored = KnownLanguages(["en", "hi"], at: 7)
        server.branches.mutate { $0[Self.branch] = stored.js }
        let s = store(server)
        await s.load()
        _ = try await s.create(root: "en", targets: ["es"])
        #expect(server.posts.value == [LangStore.systemsBranch])
        #expect(SystemsDoc(js: server.branches.value[LangStore.systemsBranch]).js["known"] == nil)
        #expect(saved(server) == stored && s.known == stored)
    }

    @Test func aGuestAnswerSyncsAfterSignIn() async {
        let server = LangServer()
        let signedIn = LockedBox(false)
        let s = store(server, signedIn: signedIn)
        await s.load()
        await s.setKnown(["es", "en"])
        #expect(s.hasUnsyncedWork && s.saveState == .localOnly && server.posts.value.isEmpty)
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        #expect(saved(server).codes == ["en", "es"])
        #expect(!s.hasUnsyncedWork)
    }

    @Test func offlineChangeSurvivesRelaunchAndSyncsOnReconnect() async {
        let server = LangServer()
        let disk = MemoryLangDisk()
        let s = store(server, disk)
        await s.load()
        server.online.mutate { $0 = false }
        await s.setKnown(["ja"])
        #expect(s.hasUnsyncedWork && s.saveState == .offline)
        server.online.mutate { $0 = true }
        let relaunched = store(server, disk)
        #expect(relaunched.hasUnsyncedWork)
        await relaunched.load()
        #expect(relaunched.known.codes == ["ja"] && saved(server).codes == ["ja"])
        #expect(!relaunched.hasUnsyncedWork)
    }

    @Test func signOutHoldsAnUnsyncedChangeForTheSameAccountOnly() async {
        let server = LangServer()
        let signedIn = LockedBox(true)
        let s = store(server, signedIn: signedIn)
        await s.syncAfterSignIn(account: "user-a")
        server.online.mutate { $0 = false }
        await s.setKnown(["ko", "en"])
        signedIn.mutate { $0 = false }
        s.clearLocal()
        #expect(s.known.isBlank && !s.hasUnsyncedWork)
        server.online.mutate { $0 = true }
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-b")
        #expect(s.known.isBlank && saved(server).isBlank)
        signedIn.mutate { $0 = false }
        s.clearLocal()
        signedIn.mutate { $0 = true }
        await s.syncAfterSignIn(account: "user-a")
        #expect(s.known.codes == ["en", "ko"] && saved(server).codes == ["en", "ko"])
        #expect(!s.hasUnsyncedWork)
    }

    @Test func signOutWithNothingPendingClearsTheAnswer() async {
        let server = LangServer()
        let signedIn = LockedBox(true)
        let s = store(server, signedIn: signedIn)
        await s.syncAfterSignIn(account: "user-a")
        await s.setKnown(["it"])
        s.clearLocal()
        #expect(s.known.isBlank)
        server.branches.mutate { $0[Self.branch] = nil }
        await s.syncAfterSignIn(account: "user-b")
        #expect(s.known.isBlank && saved(server).isBlank)
    }
}
