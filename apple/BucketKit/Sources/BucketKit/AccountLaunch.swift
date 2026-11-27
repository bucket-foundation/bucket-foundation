import Foundation

public struct AccountLaunch: Sendable {
    public let sessions: SessionStore
    public let userId: String?
    public let folderKey: String?
    public let multiAccount: Bool
    let folders: AccountFolders
    let lockUser: String?

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
            } catch {
                print("AccountLaunch: account folders stay on the root stores: \(error.localizedDescription)")
            }
        }
        return AccountLaunch(sessions: sessions, userId: userId, folderKey: folders.activeKey(userId: userId), multiAccount: multiAccount, folders: folders, lockUser: multiAccount ? userId : nil)
    }

    public static func forExtension(appGroup: String, keychainGroup: String = SessionVault.sharedGroup, items: SecretItems? = nil, index: AccountIndex? = nil) -> AccountLaunch {
        let items = items ?? KeychainItems(accessGroup: keychainGroup)
        let index = index ?? AccountIndex(appGroup: appGroup) ?? AccountIndex(defaults: .standard)
        let sessions = SessionVault.extensionStore(items: items, index: index)
        let userId = sessions.load()?.userId
        let known = userId.map { u in index.rows.contains { $0.userId == u } } ?? false
        return AccountLaunch(sessions: sessions, userId: userId, folderKey: nil, multiAccount: false, folders: AccountFolders(), lockUser: known ? userId : nil)
    }

    public func disk(_ store: String) -> FileLangDisk { folders.disk(store, key: folderKey) }

    public func lock(appGroup: String) -> RefreshLock? { FileRefreshLock(appGroup: appGroup, userId: lockUser) }

    @MainActor
    public func token(_ account: Account) -> @MainActor () async -> String? {
        guard multiAccount else { return { await account.freshToken() } }
        return BoundToken.make(owner: userId) { await account.userToken() }
    }
}
