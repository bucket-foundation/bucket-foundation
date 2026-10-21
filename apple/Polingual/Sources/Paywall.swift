import BucketKit
import StoreKit
import SwiftUI

struct Paywall: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(Account.self) private var account
    @State private var signingIn = false

    var body: some View {
        SubscriptionStoreView(productIDs: Plan.all) {
            PaywallHeader(trial: subs.trialEligible)
        }
        .id(subs.epoch)
        .subscriptionStoreControlStyle(.prominentPicker)
        .subscriptionStoreButtonLabel(.multiline)
        .storeButton(.visible, for: .restorePurchases, .redeemCode, .policies)
        .subscriptionStorePolicyDestination(url: Plan.terms, for: .termsOfService)
        .subscriptionStorePolicyDestination(url: Plan.privacy, for: .privacyPolicy)
        .inAppPurchaseOptions { _ in
            guard let id = account.session?.userId.flatMap(UUID.init(uuidString:)) else { return [] }
            return [.appAccountToken(id)]
        }
        .onInAppPurchaseCompletion { _, _ in await subs.refresh() }
        .tint(Palette.green)
        .background(Palette.paper.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                Text(PaywallCopy.renewal(trial: subs.trialEligible))
                    .font(.caption2)
                    .foregroundStyle(Palette.muted)
                    .multilineTextAlignment(.center)
                if account.stage != .signedIn {
                    Button("Already learning in Bucket? Sign in") { signingIn = true }
                        .font(.footnote)
                        .buttonStyle(.borderless)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 6)
        }
        .sheet(isPresented: $signingIn) { AccountView() }
    }
}

enum PaywallCopy {
    static func headline(trial: Bool) -> String {
        trial ? "\(Plan.trialDays) days free" : "Keep learning"
    }

    static func renewal(trial: Bool) -> String {
        let start = trial ? "New subscribers get \(Plan.trialDays) days free, then the price shown. Cancel during the trial and you pay nothing. " : ""
        return start + "Payment is charged to your Apple Account when you confirm. The plan renews automatically at the price shown unless you cancel at least 24 hours before the period ends. Cancel any time in Settings."
    }
}

struct PaywallHeader: View {
    let trial: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(text: "Polingual")
            Text(PaywallCopy.headline(trial: trial))
                .font(.serif(.largeTitle, weight: .semibold))
                .foregroundStyle(Palette.ink)
            Text("Every language system, every word in all 29 languages, placement, spaced review and speaking practice. Progress syncs with Bucket.")
                .font(.serif(.body))
                .foregroundStyle(Palette.muted)
            VStack(alignment: .leading, spacing: 8) {
                Label("Unlimited language systems", systemImage: "square.stack.3d.up")
                Label("Placement in each language", systemImage: "scope")
                Label("Speak and listen on every card", systemImage: "waveform")
                Label("Sync across iPhone, iPad and Mac", systemImage: "arrow.triangle.2.circlepath")
            }
            .font(.subheadline)
            .foregroundStyle(Palette.ink)
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
        .frame(maxWidth: 560, alignment: .leading)
        .frame(maxWidth: .infinity)
    }
}
