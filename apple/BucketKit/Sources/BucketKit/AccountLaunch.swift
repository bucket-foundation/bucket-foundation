import Foundation

public struct AccountLaunch: Sendable {
    public let sessions: SessionStore
    public let userId: String?
    public let folderKey: String?
    public let multiAccount: Bool
    public let owner: AccountOwner
    let folders: AccountFolders
    let index: AccountIndex
    let items: SecretItems

    public static func make(multiAccount: Bool, appGroup: String, keychainGroup: String = SessionVault.sharedGroup, items: SecretItems? = nil, index: AccountIndex? = nil, folders: AccountFolders = AccountFolders(), defaults: AccountDefaults = .shared, relaunch: Bool = false) -> AccountLaunch {
        let items = items ?? KeychainItems(accessGroup: keychainGroup)
        let index = index ?? AccountIndex(appGroup: appGroup) ?? AccountIndex(defaults: .standard)
        let sessions = SessionVault.store(multiAccount: multiAccount, items: items, index: index)
        let userId = sessions.load()?.userId
        if multiAccount, !(relaunch && folders.migrated) {
            let entering = folders.phase
            do {
                try folders.migrate(userId: userId)
                if entering == .verified { try folders.finishAfterLoad() }
                folders.record(nil)
            } catch {
                folders.record(error)
            }
        }
        var folderKey = folders.activeKey(userId: userId)
        var ownerId = userId
        if multiAccount, let k = folderKey, let p = folders.promotion {
            do {
                if p.state == .retire || (k != AccountFolders.guest && p.key != k) {
                    defaults.remove(AccountFolders.guest)
                    try folders.setGuestAside()
                } else if k == AccountFolders.guest {
                    ownerId = p.userId
                } else if try !folders.promoteGuest(into: k, carry: { defaults.carry(from: AccountFolders.guest, to: k) }) {
                    folderKey = AccountFolders.guest
                }
            } catch {
                folders.record(error)
                if k == AccountFolders.guest { ownerId = p.userId } else if p.state == .promote, p.key == k { folderKey = AccountFolders.guest }
            }
        }
        return AccountLaunch(sessions: sessions, userId: userId, folderKey: folderKey, multiAccount: multiAccount, owner: AccountOwner(ownerId), folders: folders, index: index, items: items)
    }

    public static func forExtension(appGroup: String, keychainGroup: String = SessionVault.sharedGroup, items: SecretItems? = nil, index: AccountIndex? = nil) -> AccountLaunch {
        let items = items ?? KeychainItems(accessGroup: keychainGroup)
        let index = index ?? AccountIndex(appGroup: appGroup) ?? AccountIndex(defaults: .standard)
        let sessions = SessionVault.extensionStore(items: items, index: index)
        return AccountLaunch(sessions: sessions, userId: sessions.load()?.userId, folderKey: nil, multiAccount: false, owner: AccountOwner(sessions.load()?.userId), folders: AccountFolders(), index: index, items: items)
    }

    public func defaults(_ shared: AccountDefaults = .shared) {
        shared.activate(multiAccount ? folderKey : nil)
    }

    @MainActor
    public func attach(_ account: Account, defaults: AccountDefaults = .shared) {
        guard multiAccount else { return }
        let owner = owner, folders = folders, inGuest = folderKey == AccountFolders.guest
        account.onStart = { user in
            guard inGuest, owner.bind(user) else { return }
            folders.record(.init(userId: user, state: .promote))
        }
        account.onEnd = { how, user in
            guard let user else { return }
            if inGuest, how != .expired, owner.userId == user { folders.record(.init(userId: user, state: .retire)) }
            guard how != .expired else { return }
            defaults.remove(AccountIndex.key(user))
        }
    }

    public func disk(_ store: String) -> FileLangDisk { folders.disk(store, key: folderKey) }

    public var migrationError: String? { folders.lastError }

    public var switcher: AccountSwitch? { multiAccount ? AccountSwitch(index: index, items: items) : nil }

    public var inGuest: Bool { multiAccount && folderKey == AccountFolders.guest }

    func lockUser(_ userId: String?) -> String? { Self.lockUser(userId, index) }

    static func lockUser(_ userId: String?, _ index: AccountIndex) -> String? {
        userId.flatMap { u in index.rows.contains { $0.userId == u } ? u : nil }
    }

    public func locks(appGroup: String) -> @Sendable (String?) -> RefreshLock? {
        let index = index
        return { user in FileRefreshLock(appGroup: appGroup, userId: Self.lockUser(user, index)) }
    }

    @MainActor
    public func token(_ account: Account) -> @MainActor () async -> String? {
        guard multiAccount else { return { await account.freshToken() } }
        return BoundToken.make(owner: owner) { await account.userToken() }
    }
}
