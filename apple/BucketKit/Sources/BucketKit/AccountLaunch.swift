import Foundation

public struct AccountLaunch: Sendable {
    public let sessions: SessionStore
    public let userId: String?
    public let folderKey: String?
    public let multiAccount: Bool
    let folders: AccountFolders
    let index: AccountIndex

    public static func make(multiAccount: Bool, appGroup: String, keychainGroup: String = SessionVault.sharedGroup, items: SecretItems? = nil, index: AccountIndex? = nil, folders: AccountFolders = AccountFolders()) -> AccountLaunch {
        let items = items ?? KeychainItems(accessGroup: keychainGroup)
        let index = index ?? AccountIndex(appGroup: appGroup) ?? AccountIndex(defaults: .standard)
        let sessions = SessionVault.store(multiAccount: multiAccount, items: items, index: index)
        let userId = sessions.load()?.userId
        if multiAccount {
            let entering = folders.phase
            do {
                try folders.migrate(userId: userId)
                if entering == .verified { try folders.finishAfterLoad() }
                folders.record(nil)
            } catch {
                folders.record(error)
            }
        }
        return AccountLaunch(sessions: sessions, userId: userId, folderKey: folders.activeKey(userId: userId), multiAccount: multiAccount, folders: folders, index: index)
    }

    public static func forExtension(appGroup: String, keychainGroup: String = SessionVault.sharedGroup, items: SecretItems? = nil, index: AccountIndex? = nil) -> AccountLaunch {
        let items = items ?? KeychainItems(accessGroup: keychainGroup)
        let index = index ?? AccountIndex(appGroup: appGroup) ?? AccountIndex(defaults: .standard)
        let sessions = SessionVault.extensionStore(items: items, index: index)
        return AccountLaunch(sessions: sessions, userId: sessions.load()?.userId, folderKey: nil, multiAccount: false, folders: AccountFolders(), index: index)
    }

    public func defaults(_ shared: AccountDefaults = .shared) {
        shared.activate(multiAccount ? folderKey : nil)
    }

    @MainActor
    public func attach(_ account: Account, defaults: AccountDefaults = .shared) {
        guard multiAccount else { return }
        account.onEnd = { how, user in
            guard how != .expired, let user else { return }
            defaults.remove(AccountIndex.key(user))
        }
    }

    public func disk(_ store: String) -> FileLangDisk { folders.disk(store, key: folderKey) }

    public var migrationError: String? { folders.lastError }

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
        return BoundToken.make(owner: userId) { await account.userToken() }
    }
}
