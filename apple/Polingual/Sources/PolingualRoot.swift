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
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).background(PL.paper.ignoresSafeArea())
            case .studio:
                Studio(access: subs.access)
            }
        }
        .task { if subs.store == .checking { await subs.refresh() } }
        .onChange(of: subs.access, initial: true) { _, access in
            LobbyAds.shared.allowed = Monetization.showsAds(access)
            DailyLedger.shared.capped = Monetization.capped(access)
        }
        .voiceNotices()
        #if DEBUG
        .task {
            guard Launch.flag("-voiceProbe") else { return }
            try? await Task.sleep(for: .seconds(3))
            let words = [("hola", "es"), ("bonjour", "fr"), ("ciao", "it"), ("hallo", "de"), ("perro", "es"), ("chien", "fr"), ("cane", "it"), ("Hund", "de")]
            for (w, l) in words {
                LangVoice.shared.speak(w, l)
                try? await Task.sleep(for: .milliseconds(450))
            }
            for (w, l) in words.prefix(4) {
                LangVoice.shared.speak(w, l)
                try? await Task.sleep(for: .milliseconds(120))
            }
            try? await Task.sleep(for: .seconds(2))
            let l = LangVoice.shared.latency
            print("voiceProbe samples \(l.samples.count) median \(l.median ?? -1) worst \(l.worst ?? -1) budget \(l.withinBudget)")
        }
        #endif
        .onOpenURL { DeepLink.shared.open($0) }
        .inviteShareOnLink()
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .groupInvites()
        .groupsOnToday()
        .memberNamePrompt()
        .ageRangePrompt()
        .progressChoicePrompt()
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .rootSheet(.gate, open: gate.asking)
        .rootSheet(.saveProgress, open: onboarded && SaveProgress.shown(pending: savePending, signedIn: account.stage == .signedIn))
        .sheet(isPresented: Binding(get: { onboarded && SaveProgress.shown(pending: savePending, signedIn: account.stage == .signedIn) }, set: { if !$0 { savePending = false } })) {
            SaveProgressSheet()
                .presentationDetents([.large])
        }
        .knownLanguagesPrompt(busy: !onboarded || gate.asking || PlayActivity.shared.playing || SaveProgress.shown(pending: savePending, signedIn: account.stage == .signedIn))
        #if DEBUG
        .task { if ProcessInfo.processInfo.arguments.contains("-saveProgress") { savePending = true } }
        .task { if let link = Launch.value("-openLink").flatMap(URL.init(string:)) { DeepLink.shared.open(link) } }
        #endif
        .onChange(of: account.stage) { old, new in
            let change = SessionChange.of(old: old, new: new, endedByUser: account.endedByUser)
            change.mergeGuest(lobbies)
            if change == .signedIn {
                savePending = false
                ProgressChoice.shared.signedIn(store, account: account.session?.userId ?? LangStore.unknownOwner)
                Task { await PushRegistry.shared.refresh() }
            }
            if change == .endedByUser {
                ProgressChoice.shared.cancel()
                store.clearLocal(accountDeleted: account.ending == .deleted)
                reminders.reset()
            }
        }
        .task {
            if let id = account.session?.userId, !ProgressChoice.shared.inFlight { store.setOwner(id) }
        }
        .task(id: account.session?.userId) {
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
        AppTab.following(link, current: current)
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
            .background(PL.paper)
            .task(id: TrialReminder.key(subs.access, allowed: reminders.enabled)) {
                if case .trial(let until) = subs.access { trialReminder = await TrialReminder.schedule(until: until) } else { trialReminder = nil }
            }
    }

    var tabs: some View {
        TabView(selection: $tab) {
            Tab(value: AppTab.today) {
                gated(.today) { TodayView(opening: { await place($0) }) }
            } label: { Label { Text("Today") } icon: { PLArt.streakFlame.image(height: 26) } }
            Tab(value: AppTab.learn) { gated(.learn) { LearnView(games: false) } } label: { Label { Text("Learn") } icon: { PLArt.seal.image(height: 24) } }
            Tab(value: AppTab.games) {
                NavigationStack {
                    GamesView(embedded: true)
                        .safeAreaInset(edge: .bottom) { AdBanner(surface: .gamesHub) }
                        .task(id: LobbyAds.shared.allowed) { LobbyAds.shared.start() }
                }
                .environment(\.learnUpsell, upsell)
                .tint(PL.tyrian)
            } label: { Label { Text(String(localized: "Play tab", defaultValue: "Play", bundle: InterfaceLanguage.bundle)) } icon: { PLArt.blocks.image(height: 24) } }
            Tab(value: AppTab.account) { AccountView(subscription: manageAction, memberLine: memberLine, trialDaysLeft: Entitlement.trialDaysLeft(subs.access, now: .now), trialReminderOff: trialReminder == .notAllowed, betaFree: subs.access == .beta) } label: { Label { Text("Account") } icon: { PLArt.azulejo.image(height: 24) } }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tint(TabTint.selected(tab))
        .audioAccessory()
        .modifier(ScreenshotShare())
        .manageSubscriptions(isPresented: $managing)
        .sheet(isPresented: $paywall) { Paywall() }
        .onReceive(NotificationCenter.default.publisher(for: FirstLesson.finished)) { _ in
            if FirstLesson.paywallAfter(open: subs.access.open, done: FirstLesson.done()) { paywall = true }
        }
        .rootSheet(.paywall, open: paywall)
        .environment(\.limitPaywall, limitPaywall)
        .modifier(GrantNoticeToast())
        #if DEBUG
        .task { if Launch.flag("-showPaywall") { paywall = true } }
        #endif
        .linkTabs($tab)
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

    var limitPaywall: (@MainActor () -> Void)? {
        guard Monetization.capped(subs.access) else { return nil }
        return { paywall = true }
    }

    var memberLine: String? { subs.webMember.map { Entitlement.memberLine($0) } }

    var manageAction: (() -> Void)? {
        guard subs.webMember == nil else { return nil }
        return { manage() }
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
                    HStack(spacing: 10) {
                        PLArtView(.seal).frame(width: 28)
                        Text("Lessons need a subscription").font(PL.heading.font(scale: 0.8)).foregroundStyle(PL.ink)
                    }
                    Text("Subscribe for daily lessons and courses that bring every word back at the right time, with no ads. Every game stays free.")
                        .font(PL.small.font())
                        .foregroundStyle(PL.inkDim)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("See plans", action: unlock)
                        .buttonStyle(.pl(.primary))
                    .accessibilityIdentifier("unlockLessons")
                }
                .padding(16)
                .frame(maxWidth: 520)
                .background(PL.card, in: .rect(cornerRadius: PL.Radius.md))
                .shadow(color: .black.opacity(0.15), radius: 10, y: 2)
                .padding()
            }
    }
}

enum TabTint {
    static func selected(_ tab: AppTab) -> Color { tab == .games ? PL.ochre : PL.tyrian }
}
