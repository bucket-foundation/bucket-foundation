import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct AccountSwitchTests {
    func fresh() throws -> (MemorySecretItems, AccountIndex, AccountFolders, AccountDefaults) {
        let base = FileManager.default.temporaryDirectory.appending(path: "switch-\(UUID().uuidString)", directoryHint: .isDirectory)
        let pol = base.appending(path: "polingual", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: pol, withIntermediateDirectories: true)
        try Data("S".utf8).write(to: pol.appending(path: "systems.json"))
        let items = MemorySecretItems()
        let index = AccountIndex(defaults: UserDefaults(suiteName: "switch-\(UUID().uuidString)")!)
        return (items, index, AccountFolders(base: base), AccountDefaults(defaults: UserDefaults(suiteName: "switchd-\(UUID().uuidString)")!))
    }

    func session(_ user: String) -> Session {
        Session(accessToken: "a-\(user)", refreshToken: "r-\(user)", expiresAt: 1_000, userId: user)
    }

    func signIn(_ user: String, _ items: MemorySecretItems, _ index: AccountIndex, label: String = "", at: TimeInterval = 0) throws {
        let store = UserSessionStore(items: items, index: index, userId: nil)
        store.pendingLabel = label
        try store.save(session(user))
        index.upsert(userId: user, now: Date(timeIntervalSince1970: at))
    }

    func launch(_ items: MemorySecretItems, _ index: AccountIndex, _ folders: AccountFolders, _ d: AccountDefaults, relaunch: Bool = false) -> AccountLaunch {
        AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders, defaults: d, relaunch: relaunch)
    }

    @Test func choicesListNewestFirstAndMarkTheActiveAccount() throws {
        let (items, index, _, _) = try fresh()
        try signIn("alice-1", items, index, label: "a***@example.com", at: 10)
        try signIn("bob-22", items, index, at: 20)
        index.activate("alice-1")
        let s = AccountSwitch(index: index, items: items)
        #expect(s.choices.map(\.userId) == ["bob-22", "alice-1"])
        #expect(s.choices.map(\.active) == [false, true])
        #expect(s.choices[1].initial == "A")
        #expect(s.choices[0].label.isEmpty)
        #expect(s.choices[0].shortId == "bob-22")
        #expect(s.choices[0].initial == "B")
    }

    @Test func selectNeedsAStoredSession() throws {
        let (items, index, _, _) = try fresh()
        try signIn("A", items, index)
        try signIn("B", items, index)
        let s = AccountSwitch(index: index, items: items)
        #expect(s.select("A"))
        #expect(index.activeUserId == "A")
        items.remove(SessionItem.user("B"))
        #expect(s.select("B") == false)
        #expect(s.select("Z") == false)
        #expect(index.activeUserId == "A")
    }

    @Test func addIsRefusedAtTheCap() throws {
        let (items, index, _, _) = try fresh()
        for u in ["A", "B", "C"] { try signIn(u, items, index) }
        let s = AccountSwitch(index: index, items: items)
        #expect(s.canAdd == false)
        #expect(s.add() == false)
        #expect(index.activeUserId == "C")
    }

    @Test func switchOpensTheOtherAccountFolderAndKeepsTheFirst() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index)
        let a = launch(items, index, folders, d)
        #expect(a.folderKey == AccountIndex.key("A"))
        try signIn("B", items, index)
        index.activate("A")
        let s = try #require(a.switcher)
        #expect(s.select("B"))
        let b = launch(items, index, folders, d, relaunch: true)
        #expect(b.userId == "B")
        #expect(b.folderKey == AccountIndex.key("B"))
        #expect(b.disk("polingual").read("systems.json") == nil)
        #expect(s.select("A"))
        let back = launch(items, index, folders, d, relaunch: true)
        #expect(back.userId == "A")
        #expect(back.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    @Test func signOutRebuildOpensTheNextAccountThenTheGuestSlot() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index, at: 10)
        try signIn("B", items, index, at: 20)
        index.activate("A")
        let a = launch(items, index, folders, d)
        #expect(a.userId == "A")
        let account = Account(api: BucketAPI(), store: a.sessions)
        a.attach(account, defaults: d)
        account.signOut()
        #expect(index.activeUserId == "B")
        let b = launch(items, index, folders, d, relaunch: true)
        #expect(b.userId == "B")
        #expect(b.folderKey == AccountIndex.key("B"))
        let bAccount = Account(api: BucketAPI(), store: b.sessions)
        b.attach(bAccount, defaults: d)
        bAccount.signOut()
        let guest = launch(items, index, folders, d, relaunch: true)
        #expect(guest.userId == nil)
        #expect(guest.inGuest)
        #expect(index.rows.isEmpty)
    }

    @Test func onlyTheFirstMigratedAccountOwnsUntaggedPurchases() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index)
        let a = launch(items, index, folders, d)
        #expect(a.ownsLegacyPurchases)
        try signIn("B", items, index)
        let b = launch(items, index, folders, d, relaunch: true)
        #expect(b.userId == "B")
        #expect(b.ownsLegacyPurchases == false)
        #expect(try #require(b.switcher).add())
        #expect(launch(items, index, folders, d, relaunch: true).ownsLegacyPurchases == false)
        let off = AccountLaunch.make(multiAccount: false, appGroup: "none", items: items, index: index, folders: folders, defaults: d)
        #expect(off.ownsLegacyPurchases == false)
    }

    @Test func relaunchLeavesTheFolderMoveWhereItWas() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index)
        _ = launch(items, index, folders, d)
        #expect(folders.phase == .copied)
        _ = launch(items, index, folders, d, relaunch: true)
        _ = launch(items, index, folders, d, relaunch: true)
        #expect(folders.phase == .copied)
        #expect(FileManager.default.fileExists(atPath: folders.root("polingual").appending(path: "systems.json").path))
    }

    @Test func relaunchStillMigratesAnUnmovedInstall() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index)
        let l = launch(items, index, folders, d, relaunch: true)
        #expect(folders.phase == .copied)
        #expect(l.folderKey == AccountIndex.key("A"))
        #expect(l.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    @Test func addOpensTheGuestSlotAndSignInPromotesItOnRebuild() throws {
        let (items, index, folders, d) = try fresh()
        try signIn("A", items, index)
        let a = launch(items, index, folders, d)
        #expect(try #require(a.switcher).add())
        let added = launch(items, index, folders, d, relaunch: true)
        #expect(added.userId == nil)
        #expect(added.inGuest)
        added.disk("polingual").write("guest-lesson.json", Data("G".utf8))
        let account = Account(api: BucketAPI(), store: added.sessions)
        added.attach(account, defaults: d)
        account.onStart?("B")
        try added.sessions.save(session("B"))
        #expect(index.activeUserId == "B")
        let b = launch(items, index, folders, d, relaunch: true)
        #expect(b.folderKey == AccountIndex.key("B"))
        #expect(b.inGuest == false)
        #expect(b.disk("polingual").read("guest-lesson.json") == Data("G".utf8))
        #expect(Set(index.rows.map(\.userId)) == ["A", "B"])
    }

    @Test func addDuringTheLegacyWindowKeepsTheSlotEmpty() throws {
        let (items, index, folders, d) = try fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        let a = launch(items, index, folders, d)
        #expect(a.userId == "A")
        #expect(try #require(a.switcher).add())
        let added = launch(items, index, folders, d, relaunch: true)
        #expect(added.userId == nil)
        #expect(index.activeUserId == nil)
        #expect(items.data(SessionItem.legacy) != nil)
    }

    @Test func signOutRemovesTheLegacyItemSoTheNextLaunchStaysSignedOut() throws {
        let (items, index, folders, d) = try fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        let a = launch(items, index, folders, d)
        a.sessions.clear()
        #expect(items.data(SessionItem.legacy) == nil)
        let next = launch(items, index, folders, d)
        #expect(next.userId == nil)
        #expect(index.rows.isEmpty)
    }

    @Test func flagOffHasNoSwitcher() throws {
        let (items, index, folders, d) = try fresh()
        let off = AccountLaunch.make(multiAccount: false, appGroup: "none", items: items, index: index, folders: folders, defaults: d)
        #expect(off.switcher == nil)
        #expect(off.inGuest == false)
    }

    @Test func hostRebuildsOnceAndIgnoresTheActiveAccount() async throws {
        let (items, index, _, _) = try fresh()
        try signIn("A", items, index)
        try signIn("B", items, index)
        var builds = 0
        let host = AccountHost(switcher: AccountSwitch(index: index, items: items)) { builds += 1 }
        #expect(await host.open("B") == false)
        #expect(await host.open("A"))
        #expect(builds == 1)
        #expect(host.generation == 1)
        #expect(host.choices.first { $0.active }?.userId == "A")
        #expect(host.switching == false)
        #expect(await host.add())
        #expect(host.choices.contains { $0.active } == false)
        #expect(builds == 2)
    }

    @Test func reloadDuringASwitchRunsOnceMoreAfterIt() async throws {
        let (items, index, _, _) = try fresh()
        try signIn("A", items, index)
        try signIn("B", items, index)
        var builds = 0
        let gate = AsyncStream<Void>.makeStream()
        var host: AccountHost!
        host = AccountHost(switcher: AccountSwitch(index: index, items: items)) {
            builds += 1
            if builds == 1 {
                host.afterSignOut()
                await host.reload()
                var it = gate.stream.makeAsyncIterator()
                await it.next()
            }
        }
        let opening = Task { await host.open("A") }
        try await Task.sleep(for: .milliseconds(50))
        gate.continuation.yield()
        #expect(await opening.value)
        try await Task.sleep(for: .milliseconds(50))
        #expect(builds == 2)
        #expect(host.generation == 2)
        #expect(host.switching == false)
    }
}

@MainActor
@Suite struct DeadlineTests {
    @Test func finishedWorkReportsTrue() async {
        var ran = false
        #expect(await Deadline.run(5) { ran = true })
        #expect(ran)
    }

    @Test func stalledWorkIsLeftBehindAtTheDeadline() async {
        let start = Date()
        #expect(await Deadline.run(0.1) { try? await Task.sleep(for: .seconds(120)) } == false)
        #expect(Date().timeIntervalSince(start) < 60)
    }
}
