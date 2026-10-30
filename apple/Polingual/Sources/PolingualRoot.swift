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
        .radioAtBottom()
        .keepsLinksInApp()
        .onOpenURL { DeepLink.shared.open($0) }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { DeepLink.shared.open(u) } }
        .groupInvites()
        .groupsOnToday()
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .onChange(of: account.stage) { old, new in
            if new == .signedIn && old != .signedIn {
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

enum LaunchRouting {
    enum Step: Equatable { case study, place(String), none }

    static func step(requestTaken: Bool, firstSystem: String) -> Step {
        if requestTaken { return .study }
        return firstSystem.isEmpty ? .none : .place(firstSystem)
    }
}

struct Studio: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(LangStore.self) private var store
    @State private var path = NavigationPath()
    @State private var showAccount = false
    @State private var managing = false
    @State private var extra: Extra?

    enum Extra: String, Identifiable {
        case games, content, meetups
        var id: String { rawValue }
    }
    @AppStorage("polingual.firstSystem") private var firstSystem = ""

    @State private var section: String? = "home"

    var body: some View {
        #if os(macOS)
        NavigationSplitView {
            List(selection: $section) {
                Label("Home", systemImage: "house").tag("home")
                Section("Language sets") {
                    ForEach(store.systems) { s in
                        HStack(spacing: 6) {
                            HStack(spacing: 2) { ForEach(s.targets.prefix(3), id: \.self) { FlagTile(lang: $0, size: 18) } }
                            Text(s.name).lineLimit(1)
                        }
                        .tag("sys:\(s.id)")
                    }
                }
                Section {
                    Button { extra = .games } label: { Label("Games", systemImage: "gamecontroller") }.buttonStyle(.plain)
                    Button { extra = .content } label: { Label("Content", systemImage: "play.square.stack") }.buttonStyle(.plain)
                    Button { extra = .meetups } label: { Label("Meetups", systemImage: "person.3.fill") }.buttonStyle(.plain)
                    Button { showAccount = true } label: { Label("Account", systemImage: "person.crop.circle") }.buttonStyle(.plain)
                    Button { manage() } label: { Label("Subscription", systemImage: "creditcard") }.buttonStyle(.plain)
                }
            }
            .navigationSplitViewColumnWidth(min: 200, ideal: 240)
        } detail: {
            stack
        }
        .onChange(of: section) { _, s in
            path = NavigationPath()
            if let s, s.hasPrefix("sys:") { path.append(LangRoute.system(String(s.dropFirst(4)))) }
        }
        .sheet(isPresented: $showAccount) { AccountView() }
        .sheet(item: $extra) { e in
            switch e {
            case .games: GamesView()
            case .content: ContentHub()
            case .meetups: ContentHub(start: .meet)
            }
        }
        .manageSubscriptions(isPresented: $managing)
        .task { await openFromLaunch() }
        .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in Task { await openRequested() } }
        .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in
            section = "home"
            path = NavigationPath()
        }
        #else
        stack
            .sheet(isPresented: $showAccount) { AccountView() }
            .sheet(item: $extra) { e in
                switch e {
                case .games: GamesView()
                case .content: ContentHub()
                case .meetups: ContentHub(start: .meet)
                }
            }
            .manageSubscriptions(isPresented: $managing)
            .task { await openFromLaunch() }
            .onReceive(NotificationCenter.default.publisher(for: .startStudy)) { _ in Task { await openRequested() } }
            .onReceive(NotificationCenter.default.publisher(for: .openToday)) { _ in path = NavigationPath() }
        #endif
    }

    var stack: some View {
        NavigationStack(path: $path) {
            LanguagesHome(path: $path)
                .langDestinations(path: $path)
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("Meetups", systemImage: "person.3.fill") { extra = .meetups }
                            Button("Games", systemImage: "gamecontroller") { extra = .games }
                            Button("Content", systemImage: "play.square.stack") { extra = .content }
                            Button("Account", systemImage: "person.crop.circle") { showAccount = true }
                            Button("Subscription", systemImage: "creditcard") { manage() }
                        } label: {
                            Image(systemName: "person.crop.circle")
                        }
                        .accessibilityLabel("Games, content and account")
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    if let days = Entitlement.trialDaysLeft(subs.access, now: .now) {
                        Text(days == 1 ? String(localized: "Free trial: 1 day left") : String(localized: "Free trial: \(days) days left"))
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                            .padding(.vertical, 6)
                            .frame(maxWidth: .infinity)
                            .background(.bar)
                    }
                }
        }
    }

    @discardableResult
    func openRequested() async -> Bool {
        guard StudyRequest.take() else { return false }
        await store.load()
        guard let first = store.systems.first else { return false }
        path = NavigationPath()
        path.append(LangRoute.study(first.id))
        return true
    }

    func openFromLaunch() async {
        let step = LaunchRouting.step(requestTaken: StudyRequest.pending && StudyRequest.take(), firstSystem: firstSystem)
        if step == .study {
            await store.load()
            if let first = store.systems.first {
                path = NavigationPath()
                path.append(LangRoute.study(first.id))
                return
            }
        }
        if !firstSystem.isEmpty {
            await store.load()
            if store.system(firstSystem) != nil { path.append(LangRoute.place(firstSystem, nil)) }
            firstSystem = ""
            return
        }
        guard let spec = PolingualLaunch.value("-openLang") else { return }
        await store.load()
        for _ in 0..<150 where store.status != .ready { try? await Task.sleep(for: .milliseconds(200)) }
        let parts = spec.split(separator: ":").map(String.init)
        guard parts.count == 3 else { return }
        let targets = parts[1].split(separator: ",").map(String.init)
        let existing = store.systems.first { $0.root == parts[0] && $0.targets == targets }
        let system: LangSystem? = if let existing { existing } else { try? await store.create(root: parts[0], targets: targets) }
        guard let system else { return }
        #if DEBUG
        if existing == nil, let n = PolingualLaunch.value("-polingualDemo").flatMap(Int.init), let corpus = store.corpus {
            for (i, lang) in system.targets.enumerated() { await store.place(system.id, lang: lang, tier: Double(max(0, 2 - i))) }
            for item in corpus.items.prefix(n) {
                for lang in system.targets { store.grade(system.id, lang: lang, itemId: item.id, rating: 3) }
            }
        }
        #endif
        switch parts[2] {
        case "study": path.append(LangRoute.study(system.id))
        case "place": path.append(LangRoute.place(system.id, nil))
        case "system": path.append(LangRoute.system(system.id))
        default: break
        }
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
