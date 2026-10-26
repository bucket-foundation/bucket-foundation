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
    @Environment(\.scenePhase) private var phase

    init() {
        UNUserNotificationCenter.current().delegate = NotificationPresenter.shared
        let api = BucketAPI()
        let account = Account(api: api, store: KeychainSessionStore(accessGroup: "QQ6D6A2LLS.foundation.bucket.shared"))
        let store = LangStore(api: api, token: { await account.freshToken() })
        LangVoice.shared.store = store
        _account = State(initialValue: account)
        Beta.shared.account = account
        _store = State(initialValue: store)
        _gate = State(initialValue: Gate(account: account))
        _subs = State(initialValue: Subscriptions(forced: Subscriptions.launchOverride()))
    }

    var body: some Scene {
        WindowGroup {
            PolingualRoot()
                .environment(account)
                .environment(store)
                .environment(gate)
                .environment(subs)
                .environment(reminders)
                .onChange(of: phase) { _, p in
                    guard p == .background || p == .active else { return }
                    if p == .active { Beta.shared.foreground(account) } else { Beta.shared.background(account) }
                    backgroundSafe {
                        await reminders.reschedule(title: "Polingual") { langForecast(store, at: $0) }
                        WidgetSync.refresh(store)
                        await WidgetSync.scheduleWordOfDay(store, enabled: reminders.wordOfDay)
                    }
                }
                .onChange(of: reminders.wordOfDay) {
                    backgroundSafe { await WidgetSync.scheduleWordOfDay(store, enabled: reminders.wordOfDay) }
                }
                .onChange(of: reminders.enabled) {
                    backgroundSafe { await reminders.reschedule(title: "Polingual") { langForecast(store, at: $0) } }
                }
                .tint(Palette.green)
        }
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
