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
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .onChange(of: account.stage) { old, new in
            if new == .signedIn && old != .signedIn { Task { await store.syncAfterSignIn() } }
            if new == .signedOut && old == .signedIn && account.endedByUser {
                store.clearLocal()
                reminders.reset()
            }
        }
        .task { account.beforeSignOut = { await store.flush() } }
    }
}

struct Studio: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(LangStore.self) private var store
    @State private var path = NavigationPath()
    @State private var showAccount = false
    @State private var managing = false
    @AppStorage("polingual.firstSystem") private var firstSystem = ""

    var body: some View {
        NavigationStack(path: $path) {
            LanguagesHome(path: $path)
                .langDestinations(path: $path)
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("Account", systemImage: "person.crop.circle") { showAccount = true }
                            Button("Subscription", systemImage: "creditcard") { manage() }
                        } label: {
                            Image(systemName: "person.crop.circle")
                        }
                        .accessibilityLabel("Account and subscription")
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    if let days = Entitlement.trialDaysLeft(subs.access, now: .now) {
                        Text(days == 1 ? "Free trial: 1 day left" : "Free trial: \(days) days left")
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                            .padding(.vertical, 6)
                            .frame(maxWidth: .infinity)
                            .background(.bar)
                    }
                }
        }
        .sheet(isPresented: $showAccount) { AccountView() }
        .manageSubscriptions(isPresented: $managing)
        .task { await openFromLaunch() }
    }

    func openFromLaunch() async {
        if !firstSystem.isEmpty {
            await store.load()
            if store.system(firstSystem) != nil { path.append(LangRoute.place(firstSystem, nil)) }
            firstSystem = ""
            return
        }
        guard let spec = PolingualLaunch.value("-openLang") else { return }
        await store.load()
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
