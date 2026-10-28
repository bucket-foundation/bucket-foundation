import BucketKit
import SwiftUI
import UserNotifications

@main
struct BucketApp: App {
    @State private var account: Account
    @State private var library = Library(api: BucketAPI())
    @State private var langs: LangStore
    @State private var science: ScienceStore
    @State private var gate: Gate
    @State private var reminders = Reminders()
    @State private var groups: GroupStore
    @Environment(\.scenePhase) private var phase
    #if os(iOS)
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushDelegate
    #endif

    init() {
        UNUserNotificationCenter.current().delegate = NotificationPresenter.shared
        let account = Account(api: BucketAPI(), store: KeychainSessionStore(accessGroup: "QQ6D6A2LLS.foundation.bucket.shared"))
        PushRegistry.shared.token = { await account.freshToken() }
        let langs = LangStore(api: BucketAPI(), token: { await account.freshToken() })
        LangVoice.shared.store = langs
        _account = State(initialValue: account)
        Beta.shared.account = account
        _langs = State(initialValue: langs)
        #if DEBUG
        let shift = (Launch.value("-clockDays").flatMap(Double.init) ?? 0) * DAY_MS
        #else
        let shift = 0.0
        #endif
        _science = State(initialValue: ScienceStore(api: BucketAPI(), token: { await account.freshToken() }, now: { Date().timeIntervalSince1970 * 1000 + shift }))
        _gate = State(initialValue: Gate(account: account))
        _groups = State(initialValue: GroupStore(api: BucketAPI(), token: { await account.freshToken() }))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                #if os(macOS)
                .frame(minWidth: 960, minHeight: 680)
                #endif
                .environment(account)
                .environment(library)
                .environment(langs)
                .environment(science)
                .environment(gate)
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
                        await reminders.reschedule(title: "Bucket") { bucketForecast(library, science, langs, at: $0) }
                        await WordOfDayReminder.schedule(langs, enabled: reminders.wordOfDay)
                        WidgetSync.refresh(langs, extra: scienceWidgetExtra(library, science))
                        #if os(iOS)
                        WatchBridge.shared.store = langs
                        WatchBridge.shared.sink = langs
                        WatchBridge.shared.send()
                        #endif
                    }
                }
                .onChange(of: reminders.wordOfDay) {
                    backgroundSafe {
                        await WordOfDayReminder.schedule(langs, enabled: reminders.wordOfDay)
                        await PushRegistry.shared.refresh()
                    }
                }
                .task {
                    await reminders.sync()
                    #if os(iOS)
                    WatchBridge.shared.start(langs)
                    #endif
                }
                .onChange(of: reminders.enabled) {
                    backgroundSafe {
                        await reminders.reschedule(title: "Bucket") { bucketForecast(library, science, langs, at: $0) }
                        await PushRegistry.shared.refresh()
                    }
                }
                .tint(Palette.green)
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 820)
        #endif
    }
}

enum AppTab: String, Hashable { case today, learn, canon, account }

extension SharedLink {
    var tab: AppTab {
        switch self {
        case .word, .home: .today
        case .langs, .deck, .atom: .learn
        case .group: .account
        }
    }
}

enum Launch {
    static func value(_ flag: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: flag), i + 1 < args.count else { return nil }
        return args[i + 1]
    }

    static func flag(_ name: String) -> Bool { ProcessInfo.processInfo.arguments.contains(name) }
}

struct RootView: View {
    @Environment(Reminders.self) private var reminders
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @Environment(Gate.self) private var gate
    @Environment(Account.self) private var account
    @State private var tab = Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? .today

    var body: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: .today) { TodayView() }
            Tab("Learn", systemImage: "book.closed", value: .learn) { LearnView() }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView() }
        }
        .tabViewStyle(.sidebarAdaptable)
        .sharesScreenshots()
        .groupInvites()
        .groupsOnToday()
        .onOpenURL { DeepLink.shared.open($0) }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .onChange(of: DeepLink.shared.pending) { _, link in
            guard let link else { return }
            tab = link.tab
            if link == .home { DeepLink.shared.pending = nil }
        }
        .task { await library.loadIndex() }
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .onChange(of: account.stage) { old, new in
            if new == .signedIn && old != .signedIn {
                Task { await langs.syncAfterSignIn() }
                Task { await science.syncAfterSignIn() }
                Task { await PushRegistry.shared.refresh() }
            }
            if new == .signedOut && old == .signedIn && account.endedByUser {
                science.clearLocal()
                langs.clearLocal()
                reminders.reset()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in tab = .today }
        .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in tab = .today }
        #if DEBUG
        .task {
            guard Launch.flag("-screenshotShare") else { return }
            try? await Task.sleep(for: .seconds(6))
            ScreenShare.shared.screenshotTaken()
        }
        .onReceive(NotificationCenter.default.publisher(for: .devReset)) { _ in
            science.clearLocal()
            langs.clearLocal()
            reminders.reset()
        }
        #endif
        .task {
            account.beforeSignOut = {
                await PushRegistry.shared.unregister()
                await science.flush()
                await langs.flush()
            }
        }
    }
}
