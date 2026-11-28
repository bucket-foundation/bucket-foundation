import BucketKit
import SwiftUI
import UserNotifications

@main
struct BucketApp: App {
    @State private var box: BucketGraphBox
    @State private var library = Library(api: BucketAPI())
    @State private var reminders = Reminders()
    @Environment(\.scenePhase) private var phase
    #if os(iOS)
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var pushDelegate
    #endif

    init() {
        InterfaceLanguage.restore()
        UNUserNotificationCenter.current().delegate = NotificationPresenter.shared
        let box = BucketGraphBox()
        NetworkWatch.shared.onReconnect { await box.graph.langs.resync() }
        NetworkWatch.shared.onReconnect { await box.graph.science.resync() }
        NetworkWatch.shared.start()
        _box = State(initialValue: box)
    }

    private var account: Account { box.graph.account }
    private var langs: LangStore { box.graph.langs }
    private var science: ScienceStore { box.graph.science }
    private var groups: GroupStore { box.graph.groups }

    var body: some Scene {
        WindowGroup {
            RootView()
                .id(box.host?.generation ?? 0)
                #if os(macOS)
                .frame(minWidth: 960, minHeight: 680)
                #endif
                .environment(account)
                .environment(library)
                .environment(langs)
                .environment(science)
                .environment(box.graph.gate)
                .environment(reminders)
                .environment(groups)
                .environment(box.graph.lobbies)
                .environment(\.accountHost, box.host)
                .interfaceLanguage(langs)
                .task(id: box.host?.generation ?? 0) {
                    Connectivity.shared.watch("lang-store") { online in Task { await langs.connectivityChanged(online: online) } }
                    guard (box.host?.generation ?? 0) > 0 else { return }
                    await reminders.reschedule(title: "Bucket") { bucketForecast(library, science, langs, at: $0) }
                    await WordOfDayReminder.schedule(langs, enabled: reminders.wordOfDay)
                    WidgetSync.refresh(langs, extra: scienceWidgetExtra(library, science))
                    #if os(iOS)
                    WatchBridge.shared.store = langs
                    WatchBridge.shared.sink = langs
                    WatchBridge.shared.send()
                    #endif
                }
                .task(id: account.session?.userId) { await box.settleAfterSignIn() }
                .onChange(of: phase) { _, p in
                    guard p == .background || p == .active else { return }
                    if p == .active { Beta.shared.foreground(account) } else { Beta.shared.background(account) }
                    backgroundSafe {
                        if p == .active {
                            await langs.retryPending()
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
                    await PushRegistry.shared.retryPending()
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

struct RootView: View {
    @Environment(Reminders.self) private var reminders
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @Environment(Gate.self) private var gate
    @Environment(Account.self) private var account
    @Environment(LobbyStore.self) private var lobbies
    @State private var tab = Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? .today

    var subjects: ScienceSubjects { ScienceSubjects(library: library, science: science) }

    var body: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: .today) { TodayView(subjects: subjects) }
            Tab("Learn", systemImage: "book.closed", value: .learn) { LearnView(subjects: subjects) }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView() }
        }
        .tabViewStyle(.sidebarAdaptable)
        .audioAccessory()
        .modifier(ScreenshotShare())
        .voiceNotices()
        .groupInvites()
        .groupsOnToday()
        .memberNamePrompt()
        .ageRangePrompt()
        .progressChoicePrompt()
        .onOpenURL { DeepLink.shared.open($0) }
        .inviteShareOnLink()
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .linkTabs($tab)
        .task { await library.loadIndex() }
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .rootSheet(.gate, open: gate.asking)
        .knownLanguagesPrompt(busy: gate.asking || PlayActivity.shared.playing)
        .onChange(of: account.stage) { old, new in
            let change = SessionChange.of(old: old, new: new, endedByUser: account.endedByUser)
            change.mergeGuest(lobbies)
            if change == .signedIn {
                ProgressChoice.shared.signedIn(langs, account: account.session?.userId ?? LangStore.unknownOwner)
                Task { await science.syncAfterSignIn() }
                Task { await PushRegistry.shared.refresh() }
            }
            if change == .endedByUser {
                ProgressChoice.shared.cancel()
                science.clearLocal()
                langs.clearLocal(accountDeleted: account.ending == .deleted)
                reminders.reset()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in tab = .today }
        .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in tab = .today }
        #if DEBUG
        .task {
            if let link = Launch.value("-openLink").flatMap(URL.init(string:)) { DeepLink.shared.open(link) }
            #if os(iOS)
            if Launch.value("-bucketOrientation") == "landscape",
               let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight))
            }
            #endif
        }
        .onReceive(NotificationCenter.default.publisher(for: .devReset)) { _ in
            science.clearLocal()
            langs.clearLocal()
            reminders.reset()
        }
        #endif
        .task {
            if let id = account.session?.userId, !ProgressChoice.shared.inFlight { langs.setOwner(id) }
        }
        .task(id: account.session?.userId) {
            account.beforeSignOut = {
                await PushRegistry.shared.unregister()
                await science.flush()
                await langs.flush()
            }
        }
    }
}
