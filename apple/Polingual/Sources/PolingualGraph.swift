import BucketKit
import Foundation
import Observation

@MainActor
final class PolingualGraph {
    let launch: AccountLaunch
    let account: Account
    let store: LangStore
    let gate: Gate
    let groups: GroupStore
    let lobbies: LobbyStore

    init(api: BucketAPI, relaunch: Bool = false) {
        let launch = AccountLaunch.make(multiAccount: BetaFlags.cached().multiAccount, appGroup: WidgetSnapshot.group, relaunch: relaunch)
        launch.defaults()
        #if DEBUG
        let fresh = !relaunch && Launch.flag("-freshGuest")
        let sessions: SessionStore = fresh ? MemorySessionStore() : launch.sessions
        let disk = fresh ? FileLangDisk(root: FileManager.default.temporaryDirectory.appending(path: "langs-\(UUID().uuidString)", directoryHint: .isDirectory)) : launch.disk("polingual")
        #else
        let sessions: SessionStore = launch.sessions
        let disk = launch.disk("polingual")
        #endif
        let account = Account(api: api, store: sessions, locks: launch.locks(appGroup: WidgetSnapshot.group))
        launch.attach(account)
        let store = LangStore(api: api, disk: disk, token: launch.token(account))
        PushRegistry.shared.api = api
        PushRegistry.shared.token = { await account.freshToken() }
        PushRegistry.shared.user = { account.session?.userId }
        LangVoice.shared.store = store
        Beta.shared.account = account
        #if os(iOS)
        WatchBridge.shared.store = store
        WatchBridge.shared.sink = store
        #endif
        let groups = GroupStore(api: api, token: { await account.freshToken() })
        groups.donor = IntentShareDonor(appGroup: WidgetSnapshot.group)
        self.launch = launch
        self.account = account
        self.store = store
        self.gate = Gate(account: account)
        self.groups = groups
        self.lobbies = LobbyStore(api: api, token: { await account.freshToken() }, guest: GuestPass(api: api) { UserDefaults.standard.string(forKey: AccountDefaults.key("groups.displayName")) ?? "" })
    }

    func close() async {
        let lobbies = lobbies, store = store
        let done = await Deadline.run(5) {
            await lobbies.leave()
            await store.flush()
        }
        if !done { store.detach() }
    }
}

@MainActor
@Observable
final class PolingualGraphBox {
    private(set) var graph: PolingualGraph
    @ObservationIgnored let api: BucketAPI
    @ObservationIgnored private(set) var host: AccountHost?

    init(api: BucketAPI) {
        self.api = api
        graph = PolingualGraph(api: api)
        host = graph.launch.switcher.map { s in AccountHost(switcher: s) { [weak self] in await self?.rebuild() } }
    }

    func rebuild() async {
        let signedIn = graph.account.session != nil
        await graph.close()
        if signedIn { await PushRegistry.shared.unregister() }
        graph = PolingualGraph(api: api, relaunch: true)
        await PushRegistry.shared.upload()
    }

    func settleAfterSignIn() async {
        guard let host, graph.launch.inGuest, graph.account.stage == .signedIn else { return }
        await host.reload()
    }
}
