import BucketKit
import Foundation
import Observation

@MainActor
final class BucketGraph {
    let launch: AccountLaunch
    let account: Account
    let langs: LangStore
    let science: ScienceStore
    let gate: Gate
    let groups: GroupStore
    let lobbies: LobbyStore

    init(relaunch: Bool = false) {
        let launch = AccountLaunch.make(multiAccount: BetaFlags.cached().multiAccount, appGroup: WidgetSnapshot.group, relaunch: relaunch)
        launch.defaults()
        let account = Account(api: BucketAPI(), store: launch.sessions, locks: launch.locks(appGroup: WidgetSnapshot.group))
        launch.attach(account)
        PushRegistry.shared.token = { await account.freshToken() }
        PushRegistry.shared.user = { account.session?.userId }
        let langs = LangStore(api: BucketAPI(), disk: launch.disk("polingual"), token: launch.token(account))
        LangVoice.shared.store = langs
        Beta.shared.account = account
        #if os(iOS)
        WatchBridge.shared.store = langs
        WatchBridge.shared.sink = langs
        #endif
        #if DEBUG
        let shift = (Launch.value("-clockDays").flatMap(Double.init) ?? 0) * DAY_MS
        #else
        let shift = 0.0
        #endif
        let groups = GroupStore(api: BucketAPI(), token: { await account.freshToken() })
        groups.donor = IntentShareDonor(appGroup: WidgetSnapshot.group)
        self.launch = launch
        self.account = account
        self.langs = langs
        self.science = ScienceStore(api: BucketAPI(), disk: launch.disk("academy"), token: launch.token(account), now: { Date().timeIntervalSince1970 * 1000 + shift })
        self.gate = Gate(account: account)
        self.groups = groups
        self.lobbies = LobbyStore(api: BucketAPI(), token: { await account.freshToken() }, guest: GuestPass(api: BucketAPI()) { UserDefaults.standard.string(forKey: AccountDefaults.key("groups.displayName")) ?? "" })
    }

    func close() async {
        let lobbies = lobbies, langs = langs, science = science
        let done = await Deadline.run(5) {
            await lobbies.leave()
            await science.flush()
            await langs.flush()
        }
        if !done {
            science.detach()
            langs.detach()
        }
    }
}

@MainActor
@Observable
final class BucketGraphBox {
    private(set) var graph: BucketGraph
    @ObservationIgnored private(set) var host: AccountHost?

    init() {
        graph = BucketGraph()
        host = graph.launch.switcher.map { s in AccountHost(switcher: s) { [weak self] in await self?.rebuild() } }
    }

    func rebuild() async {
        await graph.close()
        await PushRegistry.shared.unregister()
        graph = BucketGraph(relaunch: true)
        await PushRegistry.shared.upload()
    }

    func settleAfterSignIn() async {
        guard let host, graph.launch.inGuest, graph.account.stage == .signedIn else { return }
        await host.reload()
    }
}
