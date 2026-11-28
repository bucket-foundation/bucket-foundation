import BucketKit
import SwiftUI
import UserNotifications

@main
struct PolingualApp: App {
    @State private var box: PolingualGraphBox
    @State private var subs: Subscriptions
    @State private var reminders = Reminders()
    @Environment(\.scenePhase) private var phase
    #if os(iOS)
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushDelegate
    #endif

    init() {
        InterfaceLanguage.restore()
        UNUserNotificationCenter.current().delegate = NotificationPresenter.shared
        #if DEBUG
        let api = BucketAPI(base: BucketAPI.debugBase(arguments: ProcessInfo.processInfo.arguments, environment: ProcessInfo.processInfo.environment) ?? BucketAPI.production)
        #else
        let api = BucketAPI()
        #endif
        let box = PolingualGraphBox(api: api)
        NetworkWatch.shared.onReconnect { await box.graph.store.resync() }
        NetworkWatch.shared.start()
        _box = State(initialValue: box)
        let web = WebMembership(vault: KeychainWebEntitlementVault(), userId: box.graph.account.session?.userId) { token, user in await api.webEntitlement(token: token, userId: user) }
        let subs = Subscriptions(forced: Subscriptions.launchOverride(), web: web)
        subs.owner = Self.launchOwner(box.graph)
        _subs = State(initialValue: subs)
    }

    private var account: Account { box.graph.account }
    private var store: LangStore { box.graph.store }
    private var groups: GroupStore { box.graph.groups }

    static func launchOwner(_ graph: PolingualGraph) -> PurchaseOwner? {
        guard graph.launch.multiAccount else { return nil }
        return PurchaseOwner(token: graph.account.session?.userId.flatMap { AccountTokens().cached(for: $0) }, legacy: graph.launch.ownsLegacyPurchases)
    }

    private func rescopeWithoutToken() async {
        guard let owner = subs.owner, owner.token == nil, account.session != nil else { return }
        await scopePurchases()
    }

    private func scopePurchases() async {
        let launch = box.graph.launch
        guard launch.multiAccount else { return }
        let account = account
        var token: UUID?
        if account.session != nil, case .success(let id) = await AccountTokens().fetch(for: account) { token = id }
        subs.owner = PurchaseOwner(token: token, legacy: launch.ownsLegacyPurchases)
        await subs.refresh()
    }

    var body: some Scene {
        WindowGroup {
            PolingualRoot()
                .id(box.host?.generation ?? 0)
                #if os(macOS)
                .frame(minWidth: 960, minHeight: 680)
                #endif
                .environment(account)
                .environment(store)
                .environment(box.graph.gate)
                .environment(subs)
                .environment(reminders)
                .environment(groups)
                .environment(box.graph.lobbies)
                .environment(\.accountHost, box.host)
                .interfaceLanguage(store)
                .preferredColorScheme(.light)
                .task(id: box.host?.generation ?? 0) {
                    Connectivity.shared.watch("lang-store") { online in Task { await store.connectivityChanged(online: online) } }
                    guard (box.host?.generation ?? 0) > 0 else { return }
                    await reminders.reschedule(title: "Polingual") { langForecast(store, at: $0) }
                    await WordOfDayReminder.schedule(store, enabled: reminders.wordOfDay)
                    WidgetSync.refresh(store)
                }
                .onChange(of: phase) { _, p in
                    guard p == .background || p == .active else { return }
                    if p == .active { Beta.shared.foreground(account) } else { Beta.shared.background(account) }
                    backgroundSafe {
                        if p == .active {
                            await store.retryPending()
                            await subs.web.refresh(userId: account.session?.userId) { await account.freshToken() }
                            await rescopeWithoutToken()
                            await NetworkWatch.shared.resync().value
                            await reminders.sync()
                            await PushRegistry.shared.refresh()
                            #if DEBUG
                            if !DemoGroup.on { await groups.load() }
                            #else
                            await groups.load()
                            #endif
                        }
                        if p == .background { await CheerNotifier.post(groups) }
                        await reminders.reschedule(title: "Polingual") { langForecast(store, at: $0) }
                        WidgetSync.refresh(store)
                        #if os(iOS)
                        WatchBridge.shared.store = store
                        WatchBridge.shared.sink = store
                        WatchBridge.shared.send()
                        #endif
                        await WordOfDayReminder.schedule(store, enabled: reminders.wordOfDay)
                    }
                }
                .task(id: account.session?.userId) {
                    await box.settleAfterSignIn()
                    await subs.web.refresh(userId: account.session?.userId) { await account.freshToken() }
                    await scopePurchases()
                }
                .onChange(of: subs.access) {
                    #if os(iOS)
                    WatchBridge.shared.send()
                    #endif
                }
                .onChange(of: reminders.wordOfDay) {
                    backgroundSafe {
                        await WordOfDayReminder.schedule(store, enabled: reminders.wordOfDay)
                        await PushRegistry.shared.refresh()
                    }
                }
                .onChange(of: reminders.enabled) {
                    backgroundSafe {
                        await reminders.reschedule(title: "Polingual") { langForecast(store, at: $0) }
                        await PushRegistry.shared.refresh()
                    }
                }
                .task {
                    await reminders.sync()
                    await PushRegistry.shared.retryPending()
                    #if os(iOS)
                    WatchBridge.shared.allowed = { subs.access.open }
                    WatchBridge.shared.start(store)
                    #endif
                }
                .tint(PL.tyrian)
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 820)
        #endif
    }
}

enum PolingualLaunch {
    static func value(_ flag: String) -> String? {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: flag), i + 1 < args.count else { return nil }
        return args[i + 1]
        #else
        return nil
        #endif
    }
}
