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
            if !onboarded {
                Onboarding { id in
                    firstSystem = id ?? ""
                    onboarded = true
                }
            } else {
                switch subs.access {
                case .checking:
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).background(Palette.paper.ignoresSafeArea())
                case .locked:
                    Paywall()
                case .trial, .subscribed:
                    Studio()
                }
            }
        }
        .task { if subs.access == .checking { await subs.refresh() } }
        .onOpenURL { DeepLink.shared.open($0) }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .groupInvites()
        .groupsOnToday()
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

struct Studio: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(LangStore.self) private var store
    @State private var tab = Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? .today
    @State private var managing = false
    @AppStorage("polingual.firstSystem") private var firstSystem = ""

    var body: some View {
        TabView(selection: $tab) {
            Tab("Today", systemImage: "sun.max", value: .today) {
                TodayView(opening: { await place($0) }).safeAreaInset(edge: .bottom) { trial }
            }
            Tab("Learn", systemImage: "book.closed", value: .learn) { LearnView() }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView(subscription: manage) }
        }
        .tabViewStyle(.sidebarAdaptable)
        .modifier(ScreenshotShare())
        .manageSubscriptions(isPresented: $managing)
        .onChange(of: DeepLink.shared.pending) { _, link in
            guard let link else { return }
            tab = link.tab
            if link == .home { DeepLink.shared.pending = nil }
        }
        .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in tab = .today }
        .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in tab = .today }
        #if DEBUG && os(iOS)
        .task {
            if PolingualLaunch.value("-polingualOrientation") == "landscape",
               let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                scene.requestGeometryUpdate(.iOS(interfaceOrientations: .landscapeRight))
            }
        }
        #endif
    }

    @ViewBuilder var trial: some View {
        if let days = Entitlement.trialDaysLeft(subs.access, now: .now) {
            Text(days == 1 ? String(localized: "Free trial: 1 day left") : String(localized: "Free trial: \(days) days left"))
                .font(.footnote)
                .foregroundStyle(Palette.muted)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity)
                .background(.bar)
        }
    }

    func place(_ path: Binding<NavigationPath>) async {
        guard !firstSystem.isEmpty else { return }
        let id = firstSystem
        firstSystem = ""
        await store.load()
        if store.system(id) != nil { path.wrappedValue.append(LangRoute.place(id, nil)) }
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
