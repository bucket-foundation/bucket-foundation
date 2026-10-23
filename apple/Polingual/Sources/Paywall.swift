import BucketKit
import StoreKit
import SwiftUI

import UserNotifications

struct Paywall: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(Reminders.self) private var reminders
    @Environment(Account.self) private var account
    @State private var signingIn = false
    @State private var restoring = false

    var body: some View {
        SubscriptionStoreView(productIDs: Plan.all) {
            VStack(alignment: .leading, spacing: 12) {
                PaywallHeader(trial: subs.trialEligible, reminded: reminders.enabled)
                Text(PaywallCopy.renewal(trial: subs.trialEligible))
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.muted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 24)
                HStack(spacing: 18) {
                    Button(restoring ? "Restoring" : "Restore purchases") {
                        Task {
                            restoring = true
                            try? await AppStore.sync()
                            await subs.refresh()
                            restoring = false
                        }
                    }
                    .disabled(restoring)
                    if account.stage != .signedIn {
                        Button("Sign in") { signingIn = true }
                    }
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.muted)
                .buttonStyle(.borderless)
                .padding(.horizontal, 24)
            }
            .frame(maxWidth: 560, alignment: .leading)
        }
        .id(subs.epoch)
        .subscriptionStoreControlStyle(.compactPicker)
        .subscriptionStoreButtonLabel(.multiline)
        .storeButton(.hidden, for: .redeemCode, .restorePurchases)
        .storeButton(.visible, for: .policies)
        .subscriptionStorePolicyDestination(url: Plan.terms, for: .termsOfService)
        .subscriptionStorePolicyDestination(url: Plan.privacy, for: .privacyPolicy)
        .inAppPurchaseOptions { _ in
            guard let id = account.session?.userId.flatMap(UUID.init(uuidString:)) else { return [] }
            return [.appAccountToken(id)]
        }
        .onInAppPurchaseCompletion { _, result in
            let trial = subs.trialEligible
            await subs.refresh()
            if trial, case .success(.success) = result { await TrialReminder.schedule() }
        }
        .tint(D8.vermilion)
        .background(Dots().ignoresSafeArea())
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
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

enum TrialReminder {
    static func schedule(now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        guard await center.notificationSettings().authorizationStatus == .authorized else { return }
        let content = UNMutableNotificationContent()
        content.title = "Your Polingual trial ends tomorrow"
        content.body = "Keep learning, or cancel in Settings before tomorrow and pay nothing."
        let at = now.addingTimeInterval(Double(Plan.trialDays - 1) * 86_400)
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: at), repeats: false)
        try? await center.add(UNNotificationRequest(identifier: "polingual.trial.ending", content: content, trigger: trigger))
    }
}

struct PaywallHeader: View {
    let trial: Bool
    var reminded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                ForEach(Array(["fr", "ja", "es", "el", "ar", "it"].enumerated()), id: \.offset) { i, l in
                    FlagTile(lang: l, size: 42).rotationEffect(.degrees(i.isMultiple(of: 2) ? -6 : 5))
                }
            }
            .accessibilityHidden(true)
            PoMark()
            Text(PaywallCopy.headline(trial: trial))
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .foregroundStyle(Palette.ink)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            if trial {
                VStack(alignment: .leading, spacing: 0) {
                    TimelineRow(icon: "lock.open.fill", color: D8.malachite, title: "Today", detail: "Every language, every card.", last: false)
                    if reminded {
                        TimelineRow(icon: "bell.fill", color: D8.lapis, title: "Day \(Plan.trialDays - 1)", detail: "A reminder that the trial ends.", last: false)
                    }
                    TimelineRow(icon: "star.fill", color: D8.vermilion, title: "Day \(Plan.trialDays)", detail: "Plan starts. Cancel before, pay nothing.", last: true)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.card, in: .rect(cornerRadius: 18))
            } else {
                Text("Every language set, placement, spaced review and speaking practice. Progress syncs with Bucket.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .frame(maxWidth: 560, alignment: .leading)
        .frame(maxWidth: .infinity)
    }
}

struct TimelineRow: View {
    let icon: String
    let color: Color
    let title: String
    let detail: String
    let last: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 0) {
                Image(systemName: icon).font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 26, height: 26).background(color, in: .circle)
                if !last { Rectangle().fill(Palette.rule).frame(width: 3, height: 14) }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.bold)).foregroundStyle(Palette.ink)
                Text(detail).font(.footnote).foregroundStyle(Palette.muted)
            }
            .padding(.bottom, last ? 0 : 4)
        }
    }
}
