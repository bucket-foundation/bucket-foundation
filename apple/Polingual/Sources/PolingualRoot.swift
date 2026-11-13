import BucketKit
import SwiftUI

struct PolingualRoot: View {
    @Environment(Reminders.self) private var reminders
    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Environment(Subscriptions.self) private var subs
    @Environment(LobbyStore.self) private var lobbies
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
            case .studio:
                Studio(access: subs.access)
            }
        }
        .task { if subs.access == .checking { await subs.refresh() } }
        .onChange(of: subs.access, initial: true) { _, access in LobbyAds.shared.allowed = Monetization.showsAds(access) }
        .onOpenURL { DeepLink.shared.open($0) }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .groupInvites()
        .groupsOnToday()
        .memberNamePrompt()
        .ageRangePrompt()
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .sheet(isPresented: Binding(get: { onboarded && SaveProgress.shown(pending: savePending, signedIn: account.stage == .signedIn) }, set: { if !$0 { savePending = false } })) {
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
                Task { await lobbies.mergeGuest() }
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
    case onboarding, loading, studio

    static func pick(onboarded: Bool, access: Access) -> RootScreen {
        guard onboarded else { return .onboarding }
        return access == .checking ? .loading : .studio
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
    @State private var tab: AppTab
    @State private var managing = false
    @State private var paywall = false
    @State private var trialReminder: TrialReminder.Outcome?
    @AppStorage("polingual.firstSystem") private var firstSystem = ""

    init(access: Access) {
        _tab = State(initialValue: Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? Monetization.startTab(access: access))
    }

    var body: some View {
        tabs
            .background(Palette.paper)
            .task(id: TrialReminder.key(subs.access, allowed: reminders.enabled)) {
                if case .trial(let until) = subs.access { trialReminder = await TrialReminder.schedule(until: until) } else { trialReminder = nil }
            }
    }

    var tabs: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: .today) {
                gated(.today) { TodayView(opening: { await place($0) }) }
            }
            Tab("Learn", systemImage: "book.closed", value: .learn) { gated(.learn) { LearnView() } }
            Tab("Games", systemImage: "gamecontroller", value: .games) {
                NavigationStack {
                    GamesView(embedded: true)
                        .safeAreaInset(edge: .bottom) { LobbyBanner() }
                        .onAppear { LobbyAds.shared.start() }
                }
                .environment(\.learnUpsell, upsell)
            }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView(subscription: manage, trialDaysLeft: Entitlement.trialDaysLeft(subs.access, now: .now), trialReminderOff: trialReminder == .notAllowed) }
        }
        .tabViewStyle(.sidebarAdaptable)
        .audioAccessory()
        .modifier(ScreenshotShare())
        .manageSubscriptions(isPresented: $managing)
        .sheet(isPresented: $paywall) { Paywall() }
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

    var upsell: (@MainActor () -> Void)? {
        if subs.access.open { return nil }
        return { paywall = true }
    }

    @ViewBuilder func gated<Content: View>(_ tab: AppTab, @ViewBuilder _ content: () -> Content) -> some View {
        if Monetization.locked(tab, access: subs.access) {
            LockedPreview(unlock: { paywall = true }, content: content)
        } else {
            content()
        }
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

struct LockedPreview<Content: View>: View {
    let unlock: () -> Void
    let content: Content

    init(unlock: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.unlock = unlock
        self.content = content()
    }

    var body: some View {
        content
            .allowsHitTesting(false)
            .blur(radius: 4)
            .accessibilityHidden(true)
            .overlay(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 10) {
                    Label("Lessons need a subscription", systemImage: "lock.fill")
                        .font(.headline)
                        .foregroundStyle(Palette.ink)
                    Text("Subscribe for daily lessons and courses that bring every word back at the right time, with no ads. Every game stays free.")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    Button(action: unlock) {
                        Text("See plans").font(.headline).frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(D8.vermilion)
                    .accessibilityIdentifier("unlockLessons")
                }
                .padding(16)
                .frame(maxWidth: 520)
                .background(Palette.card, in: .rect(cornerRadius: 16))
                .shadow(color: .black.opacity(0.15), radius: 10, y: 2)
                .padding()
            }
    }
}
