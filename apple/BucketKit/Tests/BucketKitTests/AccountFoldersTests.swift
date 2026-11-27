import Foundation
import Testing
@testable import BucketKit

@Suite struct AccountFoldersTests {
    struct Interrupted: Error {}

    func base() -> URL {
        let u = FileManager.default.temporaryDirectory.appending(path: "folders-\(UUID().uuidString)", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    func put(_ base: URL, _ store: String, _ name: String, _ text: String) throws {
        let dir = base.appending(path: store, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try Data(text.utf8).write(to: dir.appending(path: name))
    }

    func text(_ url: URL) -> String? { (try? Data(contentsOf: url)).map { String(decoding: $0, as: UTF8.self) } }

    func seed(_ base: URL) throws {
        try put(base, "polingual", "systems.json", "S")
        try put(base, "polingual", "branch-lang-es.json", "ES")
        try put(base, "polingual", "pending.json", "P")
        try put(base, "polingual", "owner.json", "A")
        try put(base, "academy", "branch-physics.json", "PHY")
    }

    @Test func migrationIsAtomicAndResumesAfterInterrupt() throws {
        let b = base()
        try seed(b)
        let calls = LockedBox(0)
        let flaky = AccountFolders(base: b) { from, to in
            calls.mutate { $0 += 1 }
            if calls.value == 3 { throw Interrupted() }
            try FileManager.default.copyItem(at: from, to: to)
        }
        #expect(throws: Interrupted.self) { try flaky.migrate(userId: "A") }
        let key = AccountIndex.key("A")
        #expect(flaky.migrated == false)
        #expect(FileManager.default.fileExists(atPath: flaky.folder(key).path) == false)
        #expect(FileManager.default.fileExists(atPath: flaky.tmp(key).path))

        let folders = AccountFolders(base: b)
        #expect(try folders.migrate(userId: "A") == key)
        #expect(FileManager.default.fileExists(atPath: folders.tmp(key).path) == false)
        let pol = folders.folder(key).appending(path: "polingual")
        #expect(text(pol.appending(path: "systems.json")) == "S")
        #expect(text(pol.appending(path: "branch-lang-es.json")) == "ES")
        #expect(text(pol.appending(path: "pending.json")) == "P")
        #expect(text(folders.folder(key).appending(path: "academy/branch-physics.json")) == "PHY")
        #expect(folders.phase == .copied)
        #expect(text(b.appending(path: "polingual/systems.json")) == "S")
    }

    @Test func rootsStayUntilALaterLaunchLoads() throws {
        let b = base()
        try seed(b)
        let folders = AccountFolders(base: b)
        try folders.migrate(userId: "A")
        try folders.finishAfterLoad()
        #expect(text(b.appending(path: "polingual/systems.json")) == "S")
        try folders.migrate(userId: "A")
        #expect(folders.phase == .verified)
        #expect(text(b.appending(path: "polingual/systems.json")) == "S")
        try folders.finishAfterLoad()
        #expect(folders.phase == .done)
        #expect(FileManager.default.fileExists(atPath: b.appending(path: "polingual/systems.json").path) == false)
        #expect(FileManager.default.fileExists(atPath: b.appending(path: "academy/branch-physics.json").path) == false)
        #expect(text(folders.folder(AccountIndex.key("A")).appending(path: "polingual/systems.json")) == "S")
    }

    @Test func heldBlobsMigrateIntoAccountFolders() throws {
        let b = base()
        try seed(b)
        try put(b, "polingual", "held-index.json", #"["A","B"]"#)
        try put(b, "polingual", "held-A.json", "HA")
        try put(b, "polingual", "held-B.json", "HB")
        let folders = AccountFolders(base: b)
        try folders.migrate(userId: "A")
        let a = folders.folder(AccountIndex.key("A")).appending(path: "polingual")
        let bb = folders.folder(AccountIndex.key("B")).appending(path: "polingual")
        #expect(text(a.appending(path: "held-A.json")) == "HA")
        #expect(text(bb.appending(path: "held-B.json")) == "HB")
        #expect(text(bb.appending(path: "held-index.json")) == #"["B"]"#)
        #expect(FileManager.default.fileExists(atPath: a.appending(path: "held-B.json").path) == false)
        #expect(FileManager.default.fileExists(atPath: a.appending(path: "owner.json").path) == false)
        #expect(text(a.appending(path: "systems.json")) == "S")
    }

    @Test func nestedFoldersMigrateAndOnlyMovedFilesLeaveTheRoots() throws {
        let b = base()
        try seed(b)
        try put(b, "academy/science", "branch-02.json", "NEST")
        try put(b, "polingual", "held-index.json", #"["A"]"#)
        try put(b, "polingual", "held-A.json", "HA")
        try put(b, "polingual", "held-Z.json", "HZ")
        let folders = AccountFolders(base: b)
        try folders.migrate(userId: "A")
        let key = AccountIndex.key("A")
        #expect(text(folders.folder(key).appending(path: "academy/science/branch-02.json")) == "NEST")
        try folders.migrate(userId: "A")
        try folders.finishAfterLoad()
        let fm = FileManager.default
        #expect(fm.fileExists(atPath: b.appending(path: "academy/science").path) == false)
        #expect(fm.fileExists(atPath: b.appending(path: "polingual/held-A.json").path) == false)
        #expect(fm.fileExists(atPath: b.appending(path: "polingual/held-index.json").path) == false)
        #expect(text(b.appending(path: "polingual/held-Z.json")) == "HZ")
        #expect(text(b.appending(path: "polingual/owner.json")) == "A")
        #expect(folders.disk("polingual", key: folders.activeKey(userId: "A")).read("systems.json") == Data("S".utf8))
    }

    @Test func aHalfBuiltMigrationForAnotherUserLeavesNoOrphan() throws {
        let b = base()
        try seed(b)
        let calls = LockedBox(0)
        let flaky = AccountFolders(base: b) { from, to in
            calls.mutate { $0 += 1 }
            if calls.value == 4 { throw Interrupted() }
            try FileManager.default.copyItem(at: from, to: to)
        }
        #expect(throws: Interrupted.self) { try flaky.migrate(userId: "A") }
        let folders = AccountFolders(base: b)
        try folders.migrate(userId: nil)
        let names = try FileManager.default.contentsOfDirectory(atPath: b.appending(path: "accounts").path).sorted()
        #expect(names == ["guest", "migration.json"])
    }

    @Test func aCorruptRecordStopsMigrationAndKeepsEveryFolder() throws {
        let b = base()
        try seed(b)
        let folders = AccountFolders(base: b)
        let key = try folders.migrate(userId: "A")
        try Data("{".utf8).write(to: folders.markerURL)
        #expect(throws: BucketError.self) { try folders.migrate(userId: "A") }
        #expect(text(folders.folder(key).appending(path: "polingual/systems.json")) == "S")
    }

    @Test func heldBlobRestoresThroughTheStoreAtSignIn() async throws {
        let disk = MemoryLangDisk()
        disk.write("held-index.json", JSON.data(.array([.string("B")])))
        disk.write("held-B.json", JSON.data(.object(JSObject([("pending", .object(JSObject([("lang-es", .string("es"))]))), ("at", .number(Date().timeIntervalSince1970 * 1000))]))))
        let store = await LangStore(api: BucketAPI(), disk: disk, token: { nil })
        await store.restoreHeld("B")
        #expect(disk.read("held-B.json") == nil)
        #expect(disk.read("pending.json").map { String(decoding: $0, as: UTF8.self).contains("lang-es") } == true)
    }

    @Test func signedOutDeviceGoesToTheGuestSlot() throws {
        let b = base()
        try seed(b)
        let folders = AccountFolders(base: b)
        #expect(try folders.migrate(userId: nil) == AccountFolders.guest)
        #expect(text(folders.folder("guest").appending(path: "polingual/pending.json")) == "P")
    }

    @Test func emptyDeviceMigratesToEmptyFolders() throws {
        let folders = AccountFolders(base: base())
        let key = try folders.migrate(userId: "A")
        #expect(FileManager.default.fileExists(atPath: folders.folder(key).appending(path: "polingual").path))
        #expect(folders.disk("polingual", key: key).read("systems.json") == nil)
    }

    @Test func storesReadTheActiveFolderAfterMigration() throws {
        let b = base()
        try seed(b)
        let folders = AccountFolders(base: b)
        #expect(folders.activeKey(userId: "A") == nil)
        #expect(folders.disk("polingual", key: nil).read("systems.json") == Data("S".utf8))
        try folders.migrate(userId: "A")
        let key = AccountIndex.key("A")
        #expect(folders.activeKey(userId: "A") == key)
        #expect(folders.activeKey(userId: nil) == "guest")
        #expect(folders.disk("polingual", key: key).read("systems.json") == Data("S".utf8))
    }
}
