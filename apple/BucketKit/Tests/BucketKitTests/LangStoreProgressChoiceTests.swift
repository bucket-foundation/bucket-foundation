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
