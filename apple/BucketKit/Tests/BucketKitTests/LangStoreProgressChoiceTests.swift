import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct LangStoreProgressChoiceTests {
    static let system = LangStoreSyncTests.system
    static let branch = LangStoreSyncTests.branch
    static let hola = cardId("es", "hola")
    static let adios = cardId("es", "adiós")

    func guestDisk() -> MemoryLangDisk {
        let disk = MemoryLangDisk()
        disk.write("systems.json", JSON.data(SystemsDoc(systems: [Self.system]).js))
        let guest = gradeCard(EngineState(), "es", "adiós", 3, now: 1_500, tz: "UTC")
        disk.write("branch-\(Self.branch).json", JSON.data(guest.js))
        return disk
    }

    func store(_ server: LangServer, _ disk: LangDisk) -> LangStore {
        LangStore(api: server.api, disk: disk, cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { 2_000 })
    }

    @Test func bothSidesAreCountedForAGuestSigningIn() async {
        let s = store(LangStoreSyncTests().seeded(), guestDisk())
        #expect(s.deviceCards(account: "user-a") == 1)
        #expect(await s.accountCards() == 1)
    }

    @Test func progressAlreadyOwnedByTheAccountIsNoChoice() {
        let disk = guestDisk()
        let s = store(LangStoreSyncTests().seeded(), disk)
        s.setOwner("user-a")
        #expect(s.deviceCards(account: "user-a") == 0)
        #expect(s.deviceCards(account: "user-b") == 1)
    }

    @Test func keepingBothMergesTheCards() async {
        let server = LangStoreSyncTests().seeded()
        let s = store(server, guestDisk())
        await s.syncAfterSignIn(account: "user-a")
        #expect(s.state("s1").cards.has(Self.hola))
        #expect(s.state("s1").cards.has(Self.adios))
    }

    @Test func keepingTheAccountDropsThePhoneCards() async {
        let server = LangStoreSyncTests().seeded()
        let s = store(server, guestDisk())
        await s.syncAfterSignIn(account: "user-a", keep: .account)
        #expect(s.state("s1").cards.has(Self.hola))
        #expect(!s.state("s1").cards.has(Self.adios))
        #expect(!server.posts.value.contains(Self.branch))
    }

    @Test func keepingThePhoneReplacesTheAccountBranch() async {
        let server = LangStoreSyncTests().seeded()
        let s = store(server, guestDisk())
        await s.syncAfterSignIn(account: "user-a", keep: .device)
        #expect(s.state("s1").cards.has(Self.adios))
        #expect(!s.state("s1").cards.has(Self.hola))
        let stored = server.branches.value[Self.branch].map { EngineState(js: $0) }
        #expect(stored?.cards.has(Self.adios) == true)
        #expect(stored?.cards.has(Self.hola) == false)
    }
}

@MainActor
@Suite struct ProgressChoiceTests {
    func setup() -> (LangServer, LangStore) {
        let server = LangStoreSyncTests().seeded()
        let s = LangStoreProgressChoiceTests().store(server, LangStoreProgressChoiceTests().guestDisk())
        return (server, s)
    }

    func waitForAsk(_ c: ProgressChoice) async {
        for _ in 0..<200 where c.ask == nil { try? await Task.sleep(for: .milliseconds(5)) }
    }

    @Test func theChoiceDecidesTheSync() async {
        let (_, s) = setup()
        let c = ProgressChoice()
        let run = c.signedIn(s, account: "user-a")
        await waitForAsk(c)
        #expect(c.ask == ProgressChoice.Ask(device: 1, account: 1))
        c.choose(.account)
        await run.value
        #expect(!c.inFlight)
        #expect(!s.state("s1").cards.has(LangStoreProgressChoiceTests.adios))
    }

    @Test func signOutDuringTheChoiceSyncsNothing() async {
        let (server, s) = setup()
        let c = ProgressChoice()
        let run = c.signedIn(s, account: "user-a")
        await waitForAsk(c)
        c.cancel()
        s.clearLocal()
        await run.value
        c.choose(.device)
        #expect(c.ask == nil)
        #expect(server.posts.value.isEmpty)
        #expect(s.systems.isEmpty)
    }

    @Test func resyncWaitsWhileTheChoiceIsOpen() async {
        let (server, s) = setup()
        let c = ProgressChoice()
        let run = c.signedIn(s, account: "user-a")
        #expect(c.inFlight)
        await c.resync(s, account: "user-a")
        #expect(server.posts.value.isEmpty)
        await waitForAsk(c)
        c.choose(.both)
        await run.value
        #expect(s.state("s1").cards.has(LangStoreProgressChoiceTests.adios))
    }

    @Test func noAccountProgressMeansNoQuestion() async {
        let server = LangServer()
        let s = LangStoreProgressChoiceTests().store(server, LangStoreProgressChoiceTests().guestDisk())
        let c = ProgressChoice()
        await c.signedIn(s, account: "user-a").value
        #expect(c.ask == nil)
        #expect(s.state("s1").cards.has(LangStoreProgressChoiceTests.adios))
    }
}

extension LangStoreProgressChoiceTests {
    @Test func aFailedPhonePushStillReplacesOnRetry() async {
        let server = LangStoreSyncTests().seeded()
        server.postStatus.mutate { $0 = 500 }
        let s = store(server, guestDisk())
        await s.syncAfterSignIn(account: "user-a", keep: .device)
        #expect(!s.state("s1").cards.has(Self.hola))
        server.postStatus.mutate { $0 = nil }
        await s.retryPending()
        let stored = server.branches.value[Self.branch].map { EngineState(js: $0) }
        #expect(stored?.cards.has(Self.adios) == true)
        #expect(stored?.cards.has(Self.hola) == false)
    }
}

extension ProgressChoiceTests {
    @Test func aSecondSignInAsksAgain() async {
        let (_, s) = setup()
        let c = ProgressChoice()
        let first = c.signedIn(s, account: "user-a")
        await waitForAsk(c)
        let second = c.signedIn(s, account: "user-a")
        await first.value
        await waitForAsk(c)
        #expect(c.ask != nil)
        c.choose(.account)
        await second.value
        #expect(!s.state("s1").cards.has(LangStoreProgressChoiceTests.adios))
    }
}
