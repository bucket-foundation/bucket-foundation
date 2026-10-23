import BucketKit
import StoreKit
import SwiftUI

import UserNotifications

struct Paywall: View {
    @Environment(Subscriptions.self) private var subs
    @Environment(Account.self) private var account
    @Environment(\.openURL) private var openURL
    @State private var products: [Product] = []
    @State private var loading = true
    @State private var note: String?
    @State private var chosen = Plan.yearly
    @State private var buying = false
    @State private var signingIn = false
    @State private var restoring = false
    @State private var redeeming = false

    var product: Product? { products.first { $0.id == chosen } }

    var body: some View {
        GeometryReader { g in
            let h = g.size.height
            ZStack(alignment: .top) {
                Dots().ignoresSafeArea()
                Diagonal(top: 0.30, rise: 0.06)
                    .fill(Color(hex: 0x5B1A4A))
                    .ignoresSafeArea()
                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 10) {
                        PoMark()
                        Text(PaywallCopy.headline(trial: subs.trialEligible))
                            .font(.system(size: 40, weight: .heavy, design: .rounded))
                            .foregroundStyle(Palette.ink)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                    PaywallArt()
                        .frame(height: min(260, h * 0.34))
                        .padding(.top, h * 0.06)
                        #if DEBUG
                        .onLongPressGesture(minimumDuration: 1.5) {
                            haptic(true)
                            subs.grantDevPass()
                        }
                        #endif
                    Spacer(minLength: 8)
                    VStack(spacing: 12) {
                        if products.isEmpty {
                            VStack(spacing: 10) {
                                if loading {
                                    ProgressView().tint(D8.parchment)
                                } else {
                                    Text("The plans did not load. Check your connection and try again.")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(D8.parchment)
                                        .multilineTextAlignment(.center)
                                    Button("Try again") { Task { await load() } }.buttonStyle(D8Option(align: .center, compact: true))
                                }
                            }
                            .frame(minHeight: 84)
                        } else {
                            HStack(spacing: 10) {
                                ForEach(products, id: \.id) { p in
                                    PlanCard(product: p, selected: chosen == p.id, trial: subs.trialEligible) {
                                        tap()
                                        chosen = p.id
                                    }
                                }
                            }
                            .frame(minHeight: 84)
                        }
                        Button(buying ? String(localized: "One moment") : subs.trialEligible ? String(localized: "Start \(Plan.trialDays) days free") : String(localized: "Subscribe")) {
                            Task { await buy() }
                        }
                        .buttonStyle(D8Primary())
                        .disabled(product == nil || buying)
                        if let note { Text(note).font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment).multilineTextAlignment(.center) }
                        if let product {
                            Text(PaywallCopy.disclosure(trial: subs.trialEligible, price: product.displayPrice, period: product.id == Plan.yearly ? "year" : "month"))
                                .font(.system(size: 12))
                                .foregroundStyle(D8.parchment.opacity(0.85))
                                .multilineTextAlignment(.center)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        FlowLayout(spacing: 4) {
                            Button(restoring ? String(localized: "Restoring") : String(localized: "Restore")) { Task { await restore() } }.disabled(restoring)
                            Button("Code") { redeeming = true }
                            if account.stage != .signedIn { Button("Sign in") { signingIn = true } }
                            Button("Terms") { openURL(Plan.terms) }
                            Button("Privacy") { openURL(Plan.privacy) }
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(D8.parchment.opacity(0.85))
                        .buttonStyle(LinkPad())
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 8)
                }
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
        }
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
        .task { await load() }
        .sheet(isPresented: $signingIn) { AccountView() }
        #if os(iOS)
        .offerCodeRedemption(isPresented: $redeeming) { _ in Task { await subs.refresh() } }
        #endif
    }

    func load() async {
        loading = true
        let found = (try? await Product.products(for: Plan.all)) ?? []
        products = Plan.all.compactMap { id in found.first { $0.id == id } }
        if !products.contains(where: { $0.id == chosen }), let first = products.first { chosen = first.id }
        loading = false
    }

    func buy() async {
        guard let product else { return }
        buying = true
        note = nil
        defer { buying = false }
        let trial = subs.trialEligible
        var options: Set<Product.PurchaseOption> = []
        if let id = account.session?.userId.flatMap(UUID.init(uuidString:)) { options.insert(.appAccountToken(id)) }
        do {
            switch try await product.purchase(options: options) {
            case .success(.verified(let t)):
                await t.finish()
                await subs.refresh()
                haptic(true)
                if trial { await TrialReminder.schedule() }
            case .success(.unverified):
                note = "The App Store could not verify this purchase. Tap Restore, or try again."
            case .pending:
                note = "Waiting for approval. Polingual opens as soon as the purchase is approved."
            case .userCancelled:
                break
            @unknown default:
                break
            }
        } catch {
            note = "The App Store did not finish the purchase. Try again."
        }
    }

    func restore() async {
        restoring = true
        note = nil
        do {
            try await AppStore.sync()
            await subs.refresh()
            if case .locked = subs.access { note = "No Polingual subscription found on this Apple Account." }
        } catch {
            note = "Restore did not finish. Check your connection and try again."
        }
        restoring = false
    }
}

struct PlanCard: View {
    let product: Product
    let selected: Bool
    let trial: Bool
    let action: () -> Void

    var body: some View {
        let yearly = product.id == Plan.yearly
        Button(action: action) {
            VStack(spacing: 3) {
                Text(yearly ? String(localized: "Yearly") : String(localized: "Monthly")).font(.system(size: 15, weight: .heavy, design: .rounded))
                Text(product.displayPrice).font(.system(size: 22, weight: .heavy, design: .rounded))
                Text(yearly ? String(localized: "per year") : String(localized: "per month")).font(.caption).foregroundStyle(D8.label)
            }
            .foregroundStyle(D8.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .overlay(alignment: .top) {
                if yearly {
                    Text("BEST VALUE").font(D8.caps(9)).tracking(1).foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(D8.vermilion, in: .capsule)
                        .offset(y: -10)
                }
            }
        }
        .buttonStyle(D8Option(selected: selected, align: .center))
        .accessibilityLabel("\(yearly ? "Yearly" : "Monthly"), \(product.displayPrice)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct LinkPad: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 8)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
            .opacity(configuration.isPressed ? 0.6 : 1)
    }
}

struct Diagonal: Shape {
    var top: CGFloat
    var rise: CGFloat

    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: 0, y: r.height * (top + rise)))
        p.addLine(to: CGPoint(x: r.width, y: r.height * top))
        p.addLine(to: CGPoint(x: r.width, y: r.height))
        p.addLine(to: CGPoint(x: 0, y: r.height))
        p.closeSubpath()
        return p
    }
}

enum PaywallCopy {
    static func headline(trial: Bool) -> String {
        trial ? String(localized: "\(Plan.trialDays) days free") : String(localized: "Keep learning")
    }

    static func disclosure(trial: Bool, price: String, period: String) -> String {
        let per = period == "year" ? String(localized: "\(price) a year") : String(localized: "\(price) a month")
        let lead = trial ? String(localized: "\(Plan.trialDays) days free, then \(per).") : String(localized: "\(per).")
        return lead + " " + String(localized: "Charged to your Apple Account. Renews automatically unless cancelled at least 24 hours before the period ends, in Settings.")
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
    @State private var floating = false

    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            do {
                let bob = { (i: Double) -> CGFloat in still ? 0 : (floating ? 1 : -1) * CGFloat(Int(i).isMultiple(of: 2) ? 4 : -4) }
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
                        .foregroundStyle(Color(hex: 0x5B1A4A).opacity(0.85))
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
        .animation(still ? nil : .easeInOut(duration: 3).repeatForever(autoreverses: true), value: floating)
        .onAppear { floating = true }
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
