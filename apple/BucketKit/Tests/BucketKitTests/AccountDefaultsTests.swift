import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct AccountDefaultsTests {
    func suite() -> UserDefaults { UserDefaults(suiteName: "defaults-\(UUID().uuidString)")! }

    @Test func flagOffKeepsTheUnprefixedKeys() {
        let d = AccountDefaults(defaults: suite())
        d.activate(nil)
        #expect(d.key("polingual.onboarded") == "polingual.onboarded")
    }

    @Test func perAccountKeysTakeThePrefixAndSharedKeysDoNot() {
        let d = AccountDefaults(defaults: suite())
        d.activate("k1")
        #expect(d.key("bucket.today.order") == "k1.bucket.today.order")
        #expect(d.key("bucket.lang.readings") == "bucket.lang.readings")
        #expect(d.key("AppleLanguages") == "AppleLanguages")
    }

    @Test func firstAccountAdoptsTheLegacyValuesOnceAndKeepsThemForRollback() {
        let ud = suite()
        ud.set(true, forKey: "polingual.onboarded")
        ud.set("Gia", forKey: "groups.displayName")
        let d = AccountDefaults(defaults: ud)
        d.activate("k1")
        #expect(ud.bool(forKey: "k1.polingual.onboarded"))
        #expect(ud.string(forKey: "k1.groups.displayName") == "Gia")
        #expect(ud.bool(forKey: "polingual.onboarded"))
        d.activate("k2")
        #expect(ud.object(forKey: "k2.polingual.onboarded") == nil)
        #expect(ud.object(forKey: "k2.groups.displayName") == nil)
    }

    @Test func guestLaunchLeavesLegacyValuesForTheFirstAccount() {
        let ud = suite()
        ud.set(true, forKey: "polingual.onboarded")
        AccountDefaults(defaults: ud).activate(AccountFolders.guest)
        #expect(ud.bool(forKey: "guest.polingual.onboarded"))
        AccountDefaults(defaults: ud).activate("k1")
        #expect(ud.bool(forKey: "k1.polingual.onboarded"))
        AccountDefaults(defaults: ud).activate("k2")
        #expect(ud.object(forKey: "k2.polingual.onboarded") == nil)
    }

    @Test func removingTheActiveAccountSendsWritesToTheGuestKeys() {
        let d = AccountDefaults(defaults: suite())
        d.activate("k1")
        d.remove("k2")
        #expect(d.key("bucket.today.order") == "k1.bucket.today.order")
        d.remove("k1")
        #expect(d.key("bucket.today.order") == "guest.bucket.today.order")
    }

    @Test func deleteRemovesThatAccountsDefaults() {
        let ud = suite()
        let d = AccountDefaults(defaults: ud)
        let key = "\(AccountIndex.key("A")).polingual.onboarded"
        ud.set(true, forKey: key)
        let index = AccountIndex(defaults: suite())
        let store = UserSessionStore(items: MemorySecretItems(), index: index, userId: nil)
        try? store.save(Session(accessToken: "a", refreshToken: "r", expiresAt: 9_999_999_999, userId: "A"))
        let account = Account(api: BucketAPI(), store: store)
        AccountLaunch(sessions: store, userId: "A", folderKey: AccountIndex.key("A"), multiAccount: true, owner: AccountOwner("A"), folders: AccountFolders(), index: index).attach(account, defaults: d)
        account.end(.deleted)
        #expect(ud.object(forKey: key) == nil)
    }

    @Test func adoptionKeepsAValueTheAccountAlreadyHolds() {
        let ud = suite()
        ud.set("old", forKey: "translate.targets")
        ud.set("mine", forKey: "k1.translate.targets")
        AccountDefaults(defaults: ud).activate("k1")
        #expect(ud.string(forKey: "k1.translate.targets") == "mine")
    }

    @Test func signOutRemovesOnlyThatAccountsDefaults() {
        let ud = suite()
        let d = AccountDefaults(defaults: ud)
        ud.set("A", forKey: "\(AccountIndex.key("A")).groups.displayName")
        ud.set("B", forKey: "\(AccountIndex.key("B")).groups.displayName")
        ud.set(true, forKey: "bucket.lang.audioOffers")
        let items = MemorySecretItems()
        let index = AccountIndex(defaults: suite())
        let store = UserSessionStore(items: items, index: index, userId: nil)
        try? store.save(Session(accessToken: "a", refreshToken: "r", expiresAt: 9_999_999_999, userId: "A"))
        let account = Account(api: BucketAPI(), store: store)
        let launch = AccountLaunch(sessions: store, userId: "A", folderKey: AccountIndex.key("A"), multiAccount: true, owner: AccountOwner("A"), folders: AccountFolders(), index: index)
        launch.attach(account, defaults: d)
        account.signOut()
        #expect(ud.object(forKey: "\(AccountIndex.key("A")).groups.displayName") == nil)
        #expect(ud.string(forKey: "\(AccountIndex.key("B")).groups.displayName") == "B")
        #expect(ud.bool(forKey: "bucket.lang.audioOffers"))
    }

    @Test func expiredSessionKeepsTheAccountsDefaults() {
        let ud = suite()
        let d = AccountDefaults(defaults: ud)
        let key = "\(AccountIndex.key("A")).polingual.onboarded"
        ud.set(true, forKey: key)
        let index = AccountIndex(defaults: suite())
        let store = UserSessionStore(items: MemorySecretItems(), index: index, userId: nil)
        try? store.save(Session(accessToken: "a", refreshToken: "r", expiresAt: 9_999_999_999, userId: "A"))
        let account = Account(api: BucketAPI(), store: store)
        AccountLaunch(sessions: store, userId: "A", folderKey: AccountIndex.key("A"), multiAccount: true, owner: AccountOwner("A"), folders: AccountFolders(), index: index).attach(account, defaults: d)
        account.end(.expired)
        #expect(ud.bool(forKey: key))
    }

    @Test func flagOffLaunchLeavesSignOutDefaultsAlone() {
        let ud = suite()
        let d = AccountDefaults(defaults: ud)
        ud.set(true, forKey: "polingual.onboarded")
        let store = MemorySessionStore()
        try? store.save(Session(accessToken: "a", refreshToken: "r", expiresAt: 9_999_999_999, userId: "A"))
        let account = Account(api: BucketAPI(), store: store)
        AccountLaunch(sessions: store, userId: "A", folderKey: nil, multiAccount: false, owner: AccountOwner("A"), folders: AccountFolders(), index: AccountIndex(defaults: suite())).attach(account, defaults: d)
        account.signOut()
        #expect(ud.bool(forKey: "polingual.onboarded"))
    }

    @Test func guestValuesCarryToThePromotedAccountWithoutOverwritingIt() {
        let ud = suite()
        ud.set(true, forKey: "guest.polingual.onboarded")
        ud.set("Guest", forKey: "guest.groups.displayName")
        ud.set("Kept", forKey: "k1.groups.displayName")
        let d = AccountDefaults(defaults: ud)
        d.carry(from: AccountFolders.guest, to: "k1")
        d.activate("k1")
        #expect(ud.bool(forKey: "k1.polingual.onboarded"))
        #expect(ud.string(forKey: "k1.groups.displayName") == "Kept")
        #expect(ud.object(forKey: "guest.polingual.onboarded") == nil)
        #expect(ud.object(forKey: "guest.groups.displayName") == nil)
    }
}
