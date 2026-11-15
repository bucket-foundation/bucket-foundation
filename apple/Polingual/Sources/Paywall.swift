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
    @State private var student = false
    @State private var tokens = AccountTokens()
    @State private var freeBeta = false
    @State private var otherOptions = Launch.flag("-otherOptions")
    let family: Bool

    init(family: Bool = false) {
        self.family = family
        _chosen = State(initialValue: family ? Plan.family : Plan.yearly)
    }

    var product: Product? { products.first { $0.id == chosen } }

    var body: some View {
        GeometryReader { g in
            let h = g.size.height
            if g.size.width > g.size.height {
                ZStack {
                    PLDotPaper().ignoresSafeArea()
                    PLStarLattice().mask(SideDiagonal()).ignoresSafeArea()
                    HStack(alignment: .top, spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            header
                            art.frame(height: min(220, h * 0.55))
                        }
                        .frame(maxWidth: .infinity)
                        ScrollView {
                            purchase.padding(.vertical, 12)
                        }
                        .scrollBounceBehavior(.basedOnSize)
                        .frame(maxWidth: 380)
                    }
                    .padding(.horizontal, 12)
                }
            } else {
                ZStack(alignment: .top) {
                    PLDotPaper().ignoresSafeArea()
                    PLStarLattice().mask(Diagonal(top: 0.30, rise: 0.06)).ignoresSafeArea()
                    VStack(alignment: .leading, spacing: 0) {
                        header
                        art
                            .frame(height: min(260, h * 0.34))
                            .padding(.top, h * 0.06)
                        Spacer(minLength: 8)
                        purchase
                            .padding(.horizontal, 20)
                            .padding(.bottom, 8)
                    }
                    .frame(maxWidth: 560)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
        .task { await load() }
        .task { freeBeta = await FreeBeta.active() }
        .task(id: account.session?.userId) { _ = await fetchToken(at: "prefetch") }
        .sheet(isPresented: $signingIn) { SignInSheet() }
        #if os(iOS)
        .offerCodeRedemption(isPresented: $redeeming) { _ in Task { await subs.refresh() } }
        .sheet(isPresented: $student) {
            StudentPlan(yearly: products.first { $0.id == Plan.yearly }) {
                student = false
                Task {
                    try? await Task.sleep(for: .milliseconds(450))
                    redeeming = true
                }
            }
            .presentationDetents([.medium])
        }
        #endif
    }

    var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            PoMark()
            Text(PaywallCopy.headline(trial: subs.trialEligible))
                .font(PL.title.font(scale: 1.1))
                .foregroundStyle(PL.ink)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
    }

    var art: some View {
        PaywallArt()
            #if DEBUG
            .onLongPressGesture(minimumDuration: 1.5) {
                haptic(true)
                subs.grantDevPass()
            }
            #endif
    }

    var purchase: some View {
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
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: min(max(products.count, 1), 2)), spacing: 14) {
                    ForEach(products, id: \.id) { p in
                        PlanCard(product: p, selected: chosen == p.id, trial: subs.trialEligible) {
                            tap()
                            chosen = p.id
                        }
                    }
                }
                .frame(minHeight: 84)
            }
            Button(buying ? String(localized: "One moment") : chosen == Plan.lifetime ? String(localized: "Buy once") : subs.trialEligible && Plan.hasTrial(chosen) ? String(localized: "Start \(Plan.trialDays) days free") : String(localized: "Subscribe")) {
                Task { await buy() }
            }
            .buttonStyle(D8Primary())
            .disabled(product == nil || buying)
            if freeBeta {
                Text(FreeBeta.note)
                    .font(.footnote)
                    .foregroundStyle(D8.parchment.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let note { Text(note).font(.subheadline.weight(.semibold)).foregroundStyle(D8.parchment).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true) }
            if let product {
                Text(PaywallCopy.disclosure(trial: subs.trialEligible && Plan.hasTrial(product.id), price: product.displayPrice, period: product.id == Plan.monthly ? "month" : product.id == Plan.lifetime ? "once" : "year", family: product.id == Plan.family))
                    .font(.system(size: 12))
                    .foregroundStyle(D8.parchment.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            FlowLayout(spacing: 4) {
                Button(restoring ? String(localized: "Restoring") : String(localized: "Restore")) { Task { await restore() } }.disabled(restoring)
                Button("Other options") { otherOptions = true }
                Button("Terms") { openURL(Plan.terms) }
                Button("Privacy") { openURL(Plan.privacy) }
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(D8.parchment.opacity(0.85))
            .buttonStyle(LinkPad())
            .confirmationDialog("Other options", isPresented: $otherOptions, titleVisibility: .visible) {
                Button("Redeem a code") { redeeming = true }
                Button("Student plan") { student = true }
                if account.stage != .signedIn { Button("Sign in") { signingIn = true } }
            }
        }
    }

    func load() async {
        loading = true
        let ids = Plan.shown(extra: PaywallFlags.extraPlans || family)
        let found = (try? await Product.products(for: ids)) ?? []
        products = ids.compactMap { id in found.first { $0.id == id } }
        if !products.contains(where: { $0.id == chosen }), let first = products.first { chosen = first.id }
        loading = false
    }

    func fetchToken(at stage: String) async -> Result<UUID, AccountTokenFailure> {
        let fetched = await tokens.fetch(for: account)
        if case .failure(let f) = fetched, f != .signedOut {
            Beta.shared.log("account_token_failed", ["kind": .string(f.rawValue), "stage": .string(stage)])
        }
        return fetched
    }

    func buy() async {
        guard let product else { return }
        buying = true
        note = nil
        defer { buying = false }
        guard let options = try? PurchaseOptions.make(await fetchToken(at: "purchase")).get() else {
            note = String(localized: "We could not link this purchase to your account. Check your connection and tap again.")
            return
        }
        do {
            switch try await product.purchase(options: options) {
            case .success(.verified(let t)):
                await t.finish()
                haptic(true)
                if TrialReminder.action(productID: t.productID, introductory: t.offer?.type == .introductory) == .cancel { TrialReminder.cancel() }
                if SaveProgress.offer(signedIn: account.stage == .signedIn) { UserDefaults.standard.set(true, forKey: SaveProgress.key) }
                await subs.refresh()
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
                Text(PlanCard.title(product.id)).font(.system(size: 15, weight: .heavy, design: .rounded))
                Text(product.displayPrice).font(.system(size: 22, weight: .heavy, design: .rounded))
                Text(PlanCard.period(product.id)).font(.caption).foregroundStyle(Palette.muted)
            }
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(D8Option(selected: selected, align: .center))
        .overlay(alignment: .top) {
            if yearly {
                Text("BEST VALUE").font(D8.caps(9)).tracking(1).foregroundStyle(.white)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(D8.ink, in: .capsule)
                    .offset(y: -10)
                    .allowsHitTesting(false)
            }
        }
        .accessibilityLabel("\(PlanCard.title(product.id)), \(product.displayPrice), \(PlanCard.period(product.id))")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

extension PlanCard {
    static func title(_ id: String) -> String {
        switch id {
        case Plan.yearly: String(localized: "Yearly")
        case Plan.family: String(localized: "Family")
        case Plan.lifetime: String(localized: "Lifetime")
        default: String(localized: "Monthly")
        }
    }

    static func period(_ id: String) -> String {
        switch id {
        case Plan.yearly: String(localized: "per year")
        case Plan.family: String(localized: "per year, up to 6")
        case Plan.lifetime: String(localized: "once")
        default: String(localized: "per month")
        }
    }
}

enum PurchaseOptions {
    static func make(_ fetched: Result<UUID, AccountTokenFailure>) -> Result<Set<Product.PurchaseOption>, AccountTokenFailure> {
        switch fetched {
        case .success(let id): .success([.appAccountToken(id)])
        case .failure(.signedOut): .success([])
        case .failure(let f): .failure(f)
        }
    }
}

@MainActor
enum PaywallFlags {
    static var extraPlans: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-extraPlans") { return true }
        #endif
        return Beta.shared.flags.value("extra_plans") == "on"
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

struct SideDiagonal: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.width * 0.5, y: 0))
        p.addLine(to: CGPoint(x: r.width, y: 0))
        p.addLine(to: CGPoint(x: r.width, y: r.height))
        p.addLine(to: CGPoint(x: r.width * 0.42, y: r.height))
        p.closeSubpath()
        return p
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

@MainActor
enum FreeBeta {
    static let note = String(localized: "You are on the TestFlight beta. Apple does not charge for purchases here, so any plan is free while you test.")

    static func shows(environment: AppStore.Environment, flag: String?) -> Bool {
        environment == .sandbox && flag == "on"
    }

    static func active() async -> Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-freeBeta") { return true }
        #endif
        guard case .verified(let t) = try? await AppTransaction.shared else { return false }
        return shows(environment: t.environment, flag: Beta.shared.flags.value("free_beta_note"))
    }
}

enum PaywallCopy {
    static func headline(trial: Bool) -> String {
        trial ? String(localized: "\(Plan.trialDays) days free") : String(localized: "Keep learning")
    }

    static func disclosure(trial: Bool, price: String, period: String, family: Bool = false) -> String {
        if period == "once" { return String(localized: "\(price) once. Charged to your Apple Account. No subscription and no renewal.") }
        let share = family ? " " + String(localized: "Share it with up to 5 family members through Family Sharing.") : ""
        return base(trial: trial, price: price, period: period) + share
    }

    static func base(trial: Bool, price: String, period: String) -> String {
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
    static let id = "polingual.trial.ending"

    enum Action: Equatable { case schedule, cancel }

    static func action(productID: String, introductory: Bool) -> Action {
        introductory && Plan.hasTrial(productID) ? .schedule : .cancel
    }

    static func cancel() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    }

    static func allowed(_ status: UNAuthorizationStatus) -> Bool { status == .authorized || status == .provisional }

    static func key(_ access: Access, allowed: Bool) -> String {
        guard case .trial(let until) = access else { return "none" }
        return "\(until.timeIntervalSince1970)-\(allowed)"
    }

    static func fireDate(until: Date, now: Date) -> Date? {
        let at = until.addingTimeInterval(-86_400)
        return at > now ? at : nil
    }

    enum Outcome: Equatable { case scheduled, notAllowed, tooLate }

    static func outcome(_ status: UNAuthorizationStatus, until: Date, now: Date) -> Outcome {
        guard allowed(status) else { return .notAllowed }
        return fireDate(until: until, now: now) == nil ? .tooLate : .scheduled
    }

    @discardableResult
    static func schedule(until: Date, now: Date = .now) async -> Outcome {
        let center = UNUserNotificationCenter.current()
        let result = outcome(await center.notificationSettings().authorizationStatus, until: until, now: now)
        guard result == .scheduled, let at = fireDate(until: until, now: now) else { return result }
        let content = UNMutableNotificationContent()
        content.title = String(localized: "Your Polingual trial ends tomorrow")
        content.body = String(localized: "Keep learning, or cancel in Settings before tomorrow and pay nothing.")
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: at), repeats: false)
        do {
            try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            return .scheduled
        } catch {
            return .notAllowed
        }
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
                    PLArtView(.kente, shadow: true)
                        .frame(width: w * 0.5)
                        .rotationEffect(.degrees(-9))
                        .position(x: w * 0.3, y: h * 0.8 + bob(0))
                    PLArtView(.seal, shadow: true)
                        .frame(width: 104)
                        .rotationEffect(.degrees(-7))
                        .position(x: w * 0.22, y: h * 0.32 + bob(1))
                    PLArtView(.ticket, shadow: true)
                        .frame(width: 170)
                        .rotationEffect(.degrees(5))
                        .position(x: w * 0.62, y: h * 0.5 + bob(2))
                    PLArtView(.scriptRu)
                        .frame(width: 70)
                        .rotationEffect(.degrees(-12))
                        .position(x: w * 0.08, y: h * 0.6 + bob(3))
                    PLArtView(.tornLabel, shadow: true)
                        .frame(width: 104)
                        .rotationEffect(.degrees(-4))
                        .position(x: w * 0.84, y: h * 0.82 + bob(5))
                    WordTile(word: "cien", lang: "es", reading: Reading(ipa: "θjen"), size: 92)
                        .rotationEffect(.degrees(8))
                        .position(x: w * 0.86, y: h * 0.18 + bob(6))
                }
            }
        }
        .animation(still ? nil : .easeInOut(duration: 3).repeatForever(autoreverses: true), value: floating)
        .onAppear { floating = true }
        .accessibilityHidden(true)
    }
}

struct StudentPlan: View {
    let yearly: Product?
    let redeem: () -> Void

    static let studentUSD: Decimal = 29.99

    var price: String {
        guard let yearly else { return String(localized: "Half the yearly price") }
        let style = yearly.priceFormatStyle
        return style.currencyCode == "USD" ? String(localized: "\(Self.studentUSD.formatted(style)) a year") : String(localized: "Half the yearly price")
    }

    static var mail: URL {
        var c = URLComponents()
        c.scheme = "mailto"
        c.path = "support@polingual.com"
        c.queryItems = [URLQueryItem(name: "subject", value: String(localized: "Polingual student plan")),
                        URLQueryItem(name: "body", value: String(localized: "Sending from my school email for the student plan."))]
        return c.url!
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Student plan").font(.system(size: 26, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
            Text(price).font(.title3.weight(.bold)).foregroundStyle(PL.tyrian)
            Text("Email us from your school address. We reply with a one-time code for the student price.")
                .font(.body).foregroundStyle(Palette.muted).fixedSize(horizontal: false, vertical: true)
            MailButton(url: Self.mail, address: "support@polingual.com") { Text("Email from my school address") }.buttonStyle(D8Primary())
            Button("I have a code") { redeem() }.buttonStyle(D8Option(align: .center, compact: true))
        }
        .padding(24)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(D8.parchment)
    }
}
