import Foundation
import Testing
@testable import BucketKit

@Suite struct AccountVaultTests {
    func fresh() -> (MemorySecretItems, AccountIndex) {
        (MemorySecretItems(), AccountIndex(defaults: UserDefaults(suiteName: "vault-\(UUID().uuidString)")!))
    }

    func session(_ user: String, _ refresh: String = "r", expires: Int = 1_000) -> Session {
        Session(accessToken: "a-\(user)-\(refresh)", refreshToken: "\(refresh)-\(user)", expiresAt: expires, userId: user)
    }

    @Test func sessionStoreKeepsOneItemPerUser() throws {
        let (items, index) = fresh()
        let a = UserSessionStore(items: items, index: index, userId: nil)
        try a.save(session("A"))
        let b = UserSessionStore(items: items, index: index, userId: nil)
        try b.save(session("B"))
        try a.save(session("A", "r2", expires: 2_000))
        #expect(items.accounts == ["session.A", "session.B"])
        #expect(UserSessionStore(items: items, index: index, userId: "A").load()?.refreshToken == "r2-A")
        #expect(UserSessionStore(items: items, index: index, userId: "B").load()?.refreshToken == "r-B")
        #expect(index.rows.map(\.userId) == ["A", "B"])
        #expect(index.activeUserId == "B")
        b.clear()
        #expect(items.accounts == ["session.A"])
        #expect(index.rows.map(\.userId) == ["A"])
        #expect(index.activeUserId == nil)
    }

    @Test func boundStoreRefusesAnotherUsersSession() throws {
        let (items, index) = fresh()
        let a = UserSessionStore(items: items, index: index, userId: nil)
        try a.save(session("A"))
        #expect(throws: BucketError.self) { try a.save(session("B")) }
        #expect(items.accounts == ["session.A"])
    }

    @Test func fourthAccountIsRefused() throws {
        let (items, index) = fresh()
        for u in ["A", "B", "C"] { try UserSessionStore(items: items, index: index, userId: nil).save(session(u)) }
        let d = UserSessionStore(items: items, index: index, userId: nil)
        #expect(throws: BucketError.self) { try d.save(session("D")) }
        #expect(d.userId == nil)
        #expect(items.accounts.contains("session.D") == false)
        #expect(index.rows.count == AccountIndex.cap)
    }

    @Test func legacySessionMigratesToUserKey() throws {
        let (items, index) = fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        let store = SessionVault.store(multiAccount: true, items: items, index: index, label: "a***@example.com")
        #expect(store.load() == session("A"))
        #expect(items.session(SessionItem.user("A")) == session("A"))
        #expect(items.data(SessionItem.legacy) != nil)
        #expect(index.activeUserId == "A")
        #expect(index.rows.first?.label == "a***@example.com")
        #expect(index.rows.first?.accountKey == AccountIndex.key("A"))
        _ = SessionVault.store(multiAccount: true, items: items, index: index)
        #expect(items.data(SessionItem.legacy) == nil)
        #expect(items.session(SessionItem.user("A")) == session("A"))
    }

    @Test func flagOffWritesReachTheUserItem() throws {
        let (items, index) = fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        _ = SessionVault.store(multiAccount: true, items: items, index: index)
        let off = SessionVault.store(multiAccount: false, items: items, index: index)
        try off.save(session("A", "r2", expires: 2_000))
        let on = SessionVault.store(multiAccount: true, items: items, index: index)
        #expect(on.load()?.refreshToken == "r2-A")
        #expect(items.data(SessionItem.legacy) == nil)
    }

    @Test func flagOffReadsLegacyItem() throws {
        let (items, index) = fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        let store = SessionVault.store(multiAccount: false, items: items, index: index)
        #expect(store.load() == session("A"))
        try store.save(session("A", "r2", expires: 2_000))
        #expect(items.accounts == ["session"])
        #expect(store.load()?.refreshToken == "r2-A")
        store.clear()
        #expect(store.load() == nil)
        #expect(items.accounts.isEmpty)
    }

    @Test func flagOffAfterSecondLaunchKeepsSession() throws {
        let (items, index) = fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        _ = SessionVault.store(multiAccount: true, items: items, index: index)
        _ = SessionVault.store(multiAccount: true, items: items, index: index)
        #expect(items.data(SessionItem.legacy) == nil)
        let off = SessionVault.store(multiAccount: false, items: items, index: index)
        #expect(off.load() == session("A"))
        try off.save(session("A", "r2", expires: 2_000))
        #expect(items.session(SessionItem.user("A"))?.refreshToken == "r2-A")
        #expect(items.data(SessionItem.legacy) == nil)
        off.clear()
        #expect(off.load() == nil)
        #expect(items.accounts.isEmpty)
        #expect(index.rows.isEmpty)
    }

    @Test func flagOffPrefersNewerLegacyForSameUser() throws {
        let (items, index) = fresh()
        try items.setSession(session("A"), SessionItem.legacy)
        _ = SessionVault.store(multiAccount: true, items: items, index: index)
        try items.setSession(session("A", "r3", expires: 3_000), SessionItem.legacy)
        #expect(SessionVault.store(multiAccount: false, items: items, index: index).load()?.refreshToken == "r3-A")
    }

    @Test func shareExtensionResolvesActiveAccount() throws {
        let (items, index) = fresh()
        try UserSessionStore(items: items, index: index, userId: nil).save(session("A"))
        try UserSessionStore(items: items, index: index, userId: nil).save(session("B"))
        let share = SessionVault.extensionStore(items: items, index: index)
        #expect(share.load()?.userId == "B")
        index.activate("A")
        #expect(share.load()?.userId == "A")
        try share.save(session("A", "r2", expires: 2_000))
        #expect(items.session(SessionItem.user("A"))?.refreshToken == "r2-A")
        #expect(items.data(SessionItem.legacy) == nil)
        #expect(items.session(SessionItem.user("B")) == session("B"))
    }

    @Test func rowsWithoutKeychainItemAreDroppedAfterRestore() throws {
        let (items, index) = fresh()
        try UserSessionStore(items: items, index: index, userId: nil).save(session("A"))
        try UserSessionStore(items: items, index: index, userId: nil).save(session("B"))
        items.remove(SessionItem.user("B"))
        let store = SessionVault.store(multiAccount: true, items: items, index: index)
        #expect(index.rows.map(\.userId) == ["A"])
        #expect(index.activeUserId == nil)
        #expect(store.load() == nil)
    }

    @Test func accountKeyAndMask() {
        #expect(AccountIndex.key("A").count == 16)
        #expect(AccountIndex.key("A") == AccountIndex.key("A"))
        #expect(AccountIndex.key("A") != AccountIndex.key("B"))
        #expect(AccountIndex.mask("ada@example.com") == "a***@example.com")
        #expect(AccountIndex.mask("nope") == "")
    }

    @Test func refreshLockFileIsPerUser() {
        #expect(FileRefreshLock.fileName(userId: nil) == "session-refresh.lock")
        #expect(FileRefreshLock.fileName(userId: "A") == "refresh-A.lock")
    }

    @Test func multiAccountFlagDefaultsOff() {
        #expect(BetaFlags().multiAccount == false)
        #expect(BetaFlags(values: ["multi_account": "on"]).multiAccount)
    }
}
