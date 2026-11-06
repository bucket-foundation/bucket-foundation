import BucketKit
import SwiftUI

struct PolingualRoot: View {
    @Environment(Reminders.self) private var reminders
    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Environment(Subscriptions.self) private var subs
    @AppStorage("polingual.onboarded") private var onboarded = false
    @AppStorage("polingual.firstSystem") private var firstSystem = ""
    @AppStorage(SaveProgress.key) private var savePending = false

    var body: some View {
        Group {
            switch RootScreen.pick(onboarded: onboarded, access: subs.access) {
            case .onboarding:
                Onboarding { id in
                    firstSystem = id ?? ""
                    onboarded = true
                }
            case .loading:
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).background(Palette.paper.ignoresSafeArea())
            case .paywall:
                Paywall()
            case .studio:
                Studio()
            }
        }
        .task { if subs.access == .checking { await subs.refresh() } }
        .onOpenURL { DeepLink.shared.open($0) }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .groupInvites()
        .groupsOnToday()
        .ageRangePrompt()
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .sheet(isPresented: Binding(get: { onboarded && SaveProgress.shown(pending: savePending, signedIn: account.stage == .signedIn, access: subs.access) }, set: { if !$0 { savePending = false } })) {
            SaveProgressSheet()
                .presentationDetents([.large])
        }
        #if DEBUG
        .task { if ProcessInfo.processInfo.arguments.contains("-saveProgress") { savePending = true } }
        #endif
        .onChange(of: account.stage) { old, new in
            if new == .signedIn && old != .signedIn {
                savePending = false
                Task { await store.syncAfterSignIn() }
                Task { await PushRegistry.shared.refresh() }
            }
            if new == .signedOut && old == .signedIn && account.endedByUser {
                store.clearLocal()
                reminders.reset()
            }
        }
        .task {
            account.beforeSignOut = {
                await PushRegistry.shared.unregister()
                await store.flush()
            }
        }
        #if DEBUG
        .onReceive(NotificationCenter.default.publisher(for: .devReset)) { _ in
            store.clearLocal()
            reminders.reset()
        }
        #endif
    }
}

enum RootScreen: Equatable {
    case onboarding, loading, paywall, studio

    static func pick(onboarded: Bool, access: Access) -> RootScreen {
        guard onboarded else { return .onboarding }
        switch access {
        case .checking: return .loading
        case .locked: return .paywall
        case .trial, .subscribed: return .studio
        }
    }
}

enum LaunchRouting {
    enum Step: Equatable { case study, place(String), none }

    static func step(studyFresh: Bool, firstSystem: String) -> Step {
        if studyFresh { return .study }
        return firstSystem.isEmpty ? .none : .place(firstSystem)
    }

    static func tab(for link: SharedLink?, current: AppTab) -> AppTab {
        link?.tab ?? current
    }
}

struct Studio: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(Reminders.self) private var reminders
    @Environment(LangStore.self) private var store
    @State private var tab = Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? .today
    @State private var managing = false
    @AppStorage("polingual.firstSystem") private var firstSystem = ""

    var body: some View {
        tabs
            .background(Palette.paper)
            .task(id: TrialReminder.key(subs.access, allowed: reminders.enabled)) {
                if case .trial(let until) = subs.access { await TrialReminder.schedule(until: until) }
            }
    }

    var tabs: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: .today) {
                TodayView(opening: { await place($0) })
            }
            Tab("Learn", systemImage: "book.closed", value: .learn) { LearnView() }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView(subscription: manage, trialDaysLeft: Entitlement.trialDaysLeft(subs.access, now: .now)) }
        }
        .tabViewStyle(.sidebarAdaptable)
        .modifier(ScreenshotShare())
        .manageSubscriptions(isPresented: $managing)
        .onChange(of: DeepLink.shared.pending, initial: true) { _, link in
            tab = LaunchRouting.tab(for: link, current: tab)
            if link == .home { DeepLink.shared.pending = nil }
        }
        .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in tab = .today }
        .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in tab = .today }
        #if DEBUG && os(iOS)
        .task {
            if let start = PolingualLaunch.value("-startTab").flatMap(AppTab.init(rawValue:)) { tab = start }
            if PolingualLaunch.value("-polingualOrientation") == "landscape",
               let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight))
            }
        }
        #endif
    }

    func place(_ path: Binding<NavigationPath>) async {
        guard case .place(let id) = LaunchRouting.step(studyFresh: StudyRequest.fresh(), firstSystem: firstSystem) else { return }
        await store.load()
        guard store.system(id) != nil else { return }
        firstSystem = ""
        path.wrappedValue.append(LangRoute.place(id, nil))
    }

    func manage() {
        #if os(iOS)
        managing = true
        #else
        NSWorkspace.shared.open(URL(string: "https://apps.apple.com/account/subscriptions")!)
        #endif
    }
}

extension View {
    @ViewBuilder func manageSubscriptions(isPresented: Binding<Bool>) -> some View {
        #if os(iOS)
        manageSubscriptionsSheet(isPresented: isPresented)
        #else
        self
        #endif
    }
}
