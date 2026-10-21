import BucketKit
import SwiftUI

struct PolingualRoot: View {
    @Environment(Account.self) private var account
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Environment(Subscriptions.self) private var subs
    @AppStorage("polingual.onboarded") private var onboarded = false

    var body: some View {
        Group {
            if !onboarded {
                Onboarding { onboarded = true }
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
        }
    }
}

struct Studio: View {
    @Environment(Subscriptions.self) private var subs
    @State private var path = NavigationPath()
    @State private var showAccount = false
    @State private var managing = false

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
