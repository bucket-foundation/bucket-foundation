import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct AccountLaunchTests {
    func setup() throws -> (MemorySecretItems, AccountIndex, AccountFolders, URL) {
        let base = FileManager.default.temporaryDirectory.appending(path: "launch-\(UUID().uuidString)", directoryHint: .isDirectory)
        let pol = base.appending(path: "polingual", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: pol, withIntermediateDirectories: true)
        try Data("S".utf8).write(to: pol.appending(path: "systems.json"))
        let items = MemorySecretItems()
        try items.setSession(Session(accessToken: "a", refreshToken: "r", expiresAt: 1, userId: "A"), SessionItem.legacy)
        return (items, AccountIndex(defaults: UserDefaults(suiteName: "launch-\(UUID().uuidString)")!), AccountFolders(base: base), base)
    }

    @Test func flagOffKeepsTheRootStoresAndLegacySession() throws {
        let (items, index, folders, _) = try setup()
        let l = AccountLaunch.make(multiAccount: false, appGroup: "none", items: items, index: index, folders: folders)
        #expect(l.userId == "A")
        #expect(l.folderKey == nil)
        #expect(folders.migrated == false)
        #expect(l.disk("polingual").read("systems.json") == Data("S".utf8))
        #expect(l.lockUser("A") == nil)
    }

    @Test func flagOnMovesIntoTheAccountFolderAndFinishesOnTheThirdLaunch() throws {
        let (items, index, folders, base) = try setup()
        let first = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        #expect(first.folderKey == AccountIndex.key("A"))
        #expect(first.disk("polingual").read("systems.json") == Data("S".utf8))
        #expect(first.lockUser("A") == "A")
        #expect(first.lockUser("B") == nil)
        _ = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        #expect(FileManager.default.fileExists(atPath: base.appending(path: "polingual/systems.json").path))
        _ = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        #expect(folders.phase == .done)
        #expect(FileManager.default.fileExists(atPath: base.appending(path: "polingual/systems.json").path) == false)
        let off = AccountLaunch.make(multiAccount: false, appGroup: "none", items: items, index: index, folders: folders)
        #expect(off.userId == "A")
        #expect(off.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    @Test func extensionLocksPerUserOnlyForIndexedAccounts() throws {
        let (items, index, _, _) = try setup()
        #expect(AccountLaunch.forExtension(appGroup: "none", items: items, index: index).lockUser("A") == nil)
        _ = SessionVault.store(multiAccount: true, items: items, index: index, launch: "x")
        let ext = AccountLaunch.forExtension(appGroup: "none", items: items, index: index)
        #expect(ext.userId == "A")
        #expect(ext.lockUser("A") == "A")
        #expect(ext.lockUser(ext.userId) == AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: AccountFolders(base: FileManager.default.temporaryDirectory.appending(path: "l-\(UUID().uuidString)"))).lockUser("A"))
    }

    @Test func aFailedMigrationLeavesARecordAndAnUnreadableMarkerStillRoutesToTheFolder() throws {
        let (items, index, folders, _) = try setup()
        _ = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        try Data("{".utf8).write(to: folders.markerURL)
        let l = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        #expect(l.migrationError != nil)
        #expect(l.folderKey == AccountIndex.key("A"))
        #expect(l.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    func guestLaunch(_ ud: UserDefaults? = nil) throws -> (MemorySecretItems, AccountIndex, AccountFolders, AccountLaunch, AccountDefaults) {
        let (items, index, folders, _) = try setup()
        items.remove(SessionItem.legacy)
        let d = AccountDefaults(defaults: ud ?? UserDefaults(suiteName: "promote-\(UUID().uuidString)")!)
        let l = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders, defaults: d)
        return (items, index, folders, l, d)
    }

    func signIn(_ user: String, _ items: MemorySecretItems, _ index: AccountIndex) throws {
        try items.setSession(Session(accessToken: "a", refreshToken: "r", expiresAt: 1, userId: user), SessionItem.user(user))
        index.upsert(userId: user)
        index.activate(user)
    }

    func signOut(_ user: String, _ items: MemorySecretItems, _ index: AccountIndex) {
        items.remove(SessionItem.user(user))
        index.remove(user)
    }

    func relaunch(_ items: MemorySecretItems, _ index: AccountIndex, _ folders: AccountFolders, _ d: AccountDefaults) -> AccountLaunch {
        AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders, defaults: d)
    }

    func asides(_ folders: AccountFolders) -> [URL] {
        ((try? FileManager.default.contentsOfDirectory(at: folders.accounts, includingPropertiesForKeys: nil)) ?? []).filter { $0.lastPathComponent.hasPrefix("guest.aside-") }
    }

    func exists(_ url: URL) -> Bool { FileManager.default.fileExists(atPath: url.path) }

    @Test func guestSignInBindsTheOwnerAndPromotesTheGuestFolderOnTheNextLaunch() throws {
        let ud = UserDefaults(suiteName: "promote-\(UUID().uuidString)")!
        ud.set(true, forKey: "guest.polingual.onboarded")
        let (items, index, folders, l, d) = try guestLaunch(ud)
        #expect(l.folderKey == AccountFolders.guest)
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        #expect(l.owner.userId == nil)
        account.onStart?("A")
        #expect(l.owner.userId == "A")
        #expect(folders.promotion == .init(userId: "A", state: .promote))
        try signIn("A", items, index)
        let next = relaunch(items, index, folders, d)
        #expect(next.folderKey == AccountIndex.key("A"))
        #expect(next.owner.userId == "A")
        #expect(next.disk("polingual").read("systems.json") == Data("S".utf8))
        #expect(exists(folders.folder(AccountFolders.guest)) == false)
        #expect(folders.promotion == nil)
        #expect(ud.bool(forKey: "\(AccountIndex.key("A")).polingual.onboarded"))
        #expect(ud.object(forKey: "guest.polingual.onboarded") == nil)
    }

    @Test func pendingOrUnreadableGuestWorkKeepsTheGuestFolderOpenUntilItSyncs() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("A", items, index)
        let guestPending = folders.folder(AccountFolders.guest).appending(path: "polingual/pending.json")
        try Data(#"{"b":"s1"}"#.utf8).write(to: guestPending)
        let held = relaunch(items, index, folders, d)
        #expect(held.folderKey == AccountFolders.guest)
        #expect(held.owner.userId == "A")
        try Data("{".utf8).write(to: guestPending)
        #expect(relaunch(items, index, folders, d).folderKey == AccountFolders.guest)
        try Data("{}".utf8).write(to: guestPending)
        let done = relaunch(items, index, folders, d)
        #expect(done.folderKey == AccountIndex.key("A"))
        #expect(done.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    @Test func promotionIntoAnExistingFolderSetsTheGuestCopyAsideWithItsAcademyFiles() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let mine = folders.folder(AccountIndex.key("A")).appending(path: "polingual", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: mine, withIntermediateDirectories: true)
        try Data("A".utf8).write(to: mine.appending(path: "systems.json"))
        let academy = folders.folder(AccountFolders.guest).appending(path: "academy", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: academy, withIntermediateDirectories: true)
        try Data("unsynced".utf8).write(to: academy.appending(path: "branch-x.json"))
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("A", items, index)
        let next = relaunch(items, index, folders, d)
        #expect(next.disk("polingual").read("systems.json") == Data("A".utf8))
        #expect(exists(folders.folder(AccountFolders.guest)) == false)
        let aside = try #require(asides(folders).first)
        #expect(try Data(contentsOf: aside.appending(path: "academy/branch-x.json")) == Data("unsynced".utf8))
    }

    @Test func signOutThenAnotherSignInInTheSameSessionNeverSyncsTheGuestFolderAsTheSecondUser() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("A", items, index)
        account.onEnd?(.signedOut, "A")
        signOut("A", items, index)
        #expect(folders.promotion == .init(userId: "A", state: .retire))
        account.onStart?("B")
        #expect(l.owner.userId == "A")
        #expect(folders.promotion?.state == .retire)
        try signIn("B", items, index)
        let next = relaunch(items, index, folders, d)
        #expect(next.folderKey == AccountIndex.key("B"))
        #expect(next.disk("polingual").read("systems.json") == nil)
        #expect(exists(folders.folder(AccountFolders.guest)) == false)
        #expect(asides(folders).count == 1)
        #expect(folders.promotion == nil)
    }

    @Test func aStaleMarkerForAnotherAccountSetsTheGuestFolderAside() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("B", items, index)
        let next = relaunch(items, index, folders, d)
        #expect(next.folderKey == AccountIndex.key("B"))
        #expect(next.owner.userId == "B")
        #expect(asides(folders).count == 1)
        #expect(folders.promotion == nil)
    }

    @Test func aGuestLaunchAfterAnExpiredSessionKeepsTheFolderBoundToItsUser() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        account.onEnd?(.expired, "A")
        #expect(folders.promotion == .init(userId: "A", state: .promote))
        let next = relaunch(items, index, folders, d)
        #expect(next.folderKey == AccountFolders.guest)
        #expect(next.owner.userId == "A")
        #expect(next.disk("polingual").read("systems.json") == Data("S".utf8))
    }

    @Test func anAccountLaunchNeverRebindsItsOwner() throws {
        let (items, index, folders, _) = try setup()
        let l = AccountLaunch.make(multiAccount: true, appGroup: "none", items: items, index: index, folders: folders)
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account)
        account.onEnd?(.expired, "A")
        account.onStart?("B")
        #expect(l.owner.userId == "A")
        #expect(folders.promotion == nil)
    }

    func locked(_ folders: AccountFolders, _ body: () throws -> Void) throws {
        let fm = FileManager.default
        try fm.setAttributes([.posixPermissions: 0o555], ofItemAtPath: folders.accounts.path)
        defer { try? fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: folders.accounts.path) }
        try body()
    }

    @Test func aFailedMoveOnAnotherAccountsLaunchOpensThatAccountsOwnFolder() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("B", items, index)
        try locked(folders) {
            let next = relaunch(items, index, folders, d)
            #expect(next.migrationError != nil)
            #expect(next.folderKey == AccountIndex.key("B"))
            #expect(next.owner.userId == "B")
        }
        #expect(folders.promotion?.userId == "A")
    }

    @Test func aFailedMoveOnTheOwnersLaunchKeepsTheGuestFolderAndItsDefaults() throws {
        let ud = UserDefaults(suiteName: "promote-\(UUID().uuidString)")!
        ud.set(true, forKey: "guest.polingual.onboarded")
        let (items, index, folders, l, d) = try guestLaunch(ud)
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        try signIn("A", items, index)
        try locked(folders) {
            let next = relaunch(items, index, folders, d)
            #expect(next.folderKey == AccountFolders.guest)
            #expect(next.owner.userId == "A")
        }
        #expect(ud.bool(forKey: "guest.polingual.onboarded"))
    }

    @Test func aFailedRetireOnAGuestLaunchKeepsTheOwnerBoundToTheSignedOutUser() throws {
        let (items, index, folders, l, d) = try guestLaunch()
        let account = Account(api: BucketAPI(), store: MemorySessionStore())
        l.attach(account, defaults: d)
        account.onStart?("A")
        account.onEnd?(.signedOut, "A")
        try locked(folders) {
            let next = relaunch(items, index, folders, d)
            #expect(next.folderKey == AccountFolders.guest)
            #expect(next.owner.userId == "A")
        }
    }
}
