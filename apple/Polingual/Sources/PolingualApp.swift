import BucketKit
import SwiftUI
import UserNotifications

@main
struct PolingualApp: App {
    @State private var account: Account
    @State private var store: LangStore
    @State private var gate: Gate
    @State private var subs: Subscriptions
    @State private var reminders = Reminders()
    @State private var groups: GroupStore
    @Environment(\.scenePhase) private var phase
    #if os(iOS)
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushDelegate
    #endif

    init() {
        UNUserNotificationCenter.current().delegate = NotificationPresenter.shared
        let api = BucketAPI()
        let account = Account(api: api, store: KeychainSessionStore(accessGroup: "QQ6D6A2LLS.foundation.bucket.shared"))
        let store = LangStore(api: api, token: { await account.freshToken() })
        PushRegistry.shared.api = api
        PushRegistry.shared.token = { await account.freshToken() }
        LangVoice.shared.store = store
        _account = State(initialValue: account)
        Beta.shared.account = account
        _store = State(initialValue: store)
        _gate = State(initialValue: Gate(account: account))
        _groups = State(initialValue: GroupStore(api: api, token: { await account.freshToken() }))
        _subs = State(initialValue: Subscriptions(forced: Subscriptions.launchOverride()))
    }

    var body: some Scene {
        WindowGroup {
            PolingualRoot()
                #if os(macOS)
                .frame(minWidth: 960, minHeight: 680)
                #endif
                .environment(account)
                .environment(store)
                .environment(gate)
                .environment(subs)
                .environment(reminders)
                .environment(groups)
                .onChange(of: phase) { _, p in
                    guard p == .background || p == .active else { return }
                    if p == .active { Beta.shared.foreground(account) } else { Beta.shared.background(account) }
                    backgroundSafe {
                        if p == .active {
                            await reminders.sync()
                            await PushRegistry.shared.refresh()
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
                    #if os(iOS)
                    WatchBridge.shared.allowed = { subs.access.open }
                    WatchBridge.shared.start(store)
                    #endif
                }
                .tint(Palette.green)
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
