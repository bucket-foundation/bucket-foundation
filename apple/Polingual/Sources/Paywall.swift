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
    @State private var redeeming = false

    var body: some View {
        SubscriptionStoreView(productIDs: Plan.all) {
            VStack(alignment: .leading, spacing: 14) {
                PaywallArt()
                    .frame(height: 300)
                    #if DEBUG
                    .onLongPressGesture(minimumDuration: 1.5) {
                        haptic(true)
                        subs.grantDevPass()
                    }
                    #endif
                VStack(alignment: .leading, spacing: 8) {
                    Text(PaywallCopy.headline(trial: subs.trialEligible))
                        .font(.system(size: 40, weight: .heavy, design: .rounded))
                        .foregroundStyle(D8.parchment)
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                    Text(subs.trialEligible ? "Every language, every card. Cancel before day \(Plan.trialDays) and pay nothing." : "Every language, every card, synced with Bucket.")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(D8.parchment.opacity(0.75))
                        .fixedSize(horizontal: false, vertical: true)
                    Text(PaywallCopy.renewal(trial: subs.trialEligible))
                        .font(.system(size: 10))
                        .foregroundStyle(D8.parchment.opacity(0.5))
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 4)
                    HStack(spacing: 18) {
                        Button(restoring ? "Restoring" : "Restore") {
                            Task {
                                restoring = true
                                try? await AppStore.sync()
                                await subs.refresh()
                                restoring = false
                            }
                        }
                        .disabled(restoring)
                        Button("Have a code?") { redeeming = true }
                        if account.stage != .signedIn {
                            Button("Sign in") { signingIn = true }
                        }
                    }
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(D8.parchment.opacity(0.75))
                    .buttonStyle(.borderless)
                }
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
        .background(Color(hex: 0x5B1A4A).ignoresSafeArea())
        .environment(\.colorScheme, .dark)
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
        .sheet(isPresented: $signingIn) { AccountView() }
        #if os(iOS)
        .offerCodeRedemption(isPresented: $redeeming) { _ in Task { await subs.refresh() } }
        #endif
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

struct PaywallArt: View {
    @Environment(\.accessibilityReduceMotion) private var still

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            TimelineView(.animation(paused: still)) { t in
                let now = t.date.timeIntervalSinceReferenceDate
                let bob = { (i: Double) -> CGFloat in still ? 0 : CGFloat(sin(now * 0.9 + i) * 4) }
                ZStack {
                    Weave()
                        .frame(width: w * 0.62, height: 54)
                        .rotationEffect(.degrees(-9))
                        .position(x: w * 0.32, y: h * 0.78 + bob(0))
                    Text("百")
                        .font(.system(size: 64, weight: .black))
                        .foregroundStyle(D8.parchment)
                        .frame(width: 112, height: 112)
                        .background(D8.vermilion, in: .rect(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(D8.parchment, lineWidth: 4).padding(9))
                        .shadow(color: .black.opacity(0.25), radius: 0, x: 0, y: 6)
                        .rotationEffect(.degrees(-7))
                        .position(x: w * 0.24, y: h * 0.3 + bob(1))
                    Stamp()
                        .rotationEffect(.degrees(5))
                        .position(x: w * 0.68, y: h * 0.47 + bob(2))
                    Text("сто")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundStyle(D8.parchment.opacity(0.8))
                        .rotationEffect(.degrees(-14))
                        .position(x: w * 0.1, y: h * 0.58 + bob(3))
                    Text("מאה")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundStyle(D8.parchment.opacity(0.8))
                        .rotationEffect(.degrees(-8))
                        .position(x: w * 0.6, y: h * 0.12 + bob(4))
                    Text("शतम्")
                        .font(.system(size: 26, weight: .heavy))
                        .foregroundStyle(Color(hex: 0x5B1A4A))
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(D8.parchment, in: .rect(cornerRadius: 4))
                        .rotationEffect(.degrees(-4))
                        .position(x: w * 0.85, y: h * 0.8 + bob(5))
                    WordTile(word: "cien", lang: "es", reading: Reading(ipa: "θjen"), size: 92)
                        .rotationEffect(.degrees(8))
                        .position(x: w * 0.88, y: h * 0.2 + bob(6))
                }
            }
        }
        .accessibilityHidden(true)
    }
}

struct Stamp: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("ἑκατόν").font(.system(size: 30, weight: .bold, design: .serif)).foregroundStyle(D8.ink)
            Text("ATHENS · 400 BC").font(D8.caps(9)).tracking(1.2).foregroundStyle(D8.label)
        }
        .padding(.horizontal, 22).padding(.vertical, 16)
        .background(D8.parchment)
        .overlay(Rectangle().strokeBorder(D8.ink.opacity(0.25), style: StrokeStyle(lineWidth: 2, dash: [3, 3])).padding(5))
        .mask(Perforated())
        .shadow(color: .black.opacity(0.25), radius: 0, x: 0, y: 5)
    }
}

struct Perforated: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path(r)
        let step: CGFloat = 10, rad: CGFloat = 3
        var x = r.minX + step / 2
        while x < r.maxX {
            p.addEllipse(in: CGRect(x: x - rad, y: r.minY - rad, width: rad * 2, height: rad * 2))
            p.addEllipse(in: CGRect(x: x - rad, y: r.maxY - rad, width: rad * 2, height: rad * 2))
            x += step
        }
        var y = r.minY + step / 2
        while y < r.maxY {
            p.addEllipse(in: CGRect(x: r.minX - rad, y: y - rad, width: rad * 2, height: rad * 2))
            p.addEllipse(in: CGRect(x: r.maxX - rad, y: y - rad, width: rad * 2, height: rad * 2))
            y += step
        }
        return p
    }
}

struct Weave: View {
    var body: some View {
        Canvas { ctx, size in
            let colors: [Color] = [Color(hex: 0xE9A23B), D8.malachite, D8.vermilion, D8.ink, Color(hex: 0xE9A23B)]
            let cell: CGFloat = 12
            var col = 0
            var x: CGFloat = 0
            while x < size.width {
                var y: CGFloat = 0
                var row = 0
                while y < size.height {
                    ctx.fill(Path(CGRect(x: x, y: y, width: cell - 1, height: cell - 1)), with: .color(colors[(col + row) % colors.count]))
                    y += cell
                    row += 1
                }
                x += cell
                col += 1
            }
        }
        .clipShape(.rect(cornerRadius: 3))
        .shadow(color: .black.opacity(0.25), radius: 0, x: 0, y: 5)
    }
}
