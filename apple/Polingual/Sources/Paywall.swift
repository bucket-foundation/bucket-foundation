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
        .tint(D8.vermilion)
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
        VStack(alignment: .leading, spacing: 16) {
            PoMark()
            Text(PaywallCopy.headline(trial: trial))
                .font(.system(size: 38, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
            Text("Every language set, every word in all 29 languages, placement, spaced review and speaking practice. Progress syncs with Bucket.")
                .font(.body)
                .foregroundStyle(Palette.muted)
                .fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: 12) {
                Point(icon: "square.stack.3d.up.fill", color: D8.lapis, title: "Unlimited language sets", detail: "Learn up to five languages side by side.")
                Point(icon: "scope", color: D8.malachite, title: "Placement in each language", detail: "Start at your level.")
                Point(icon: "speaker.wave.2.fill", color: D8.vermilion, title: "Hear and say every word", detail: "Native audio and speech checks.")
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
        .frame(maxWidth: 560, alignment: .leading)
        .frame(maxWidth: .infinity)
    }
}
