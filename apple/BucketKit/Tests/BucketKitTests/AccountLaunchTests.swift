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
}
