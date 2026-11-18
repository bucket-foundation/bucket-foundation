import BucketKit
import SwiftUI

extension EnvironmentValues {
    @Entry var limitPaywall: (@MainActor () -> Void)?
}

@MainActor
@Observable
final class DailyLedger {
    static let shared = DailyLedger()
    static let key = "polingual.dailyBudget"

    var capped = false
    private(set) var budget: DailyBudget
    @ObservationIgnored var ad: @MainActor () async -> AdOutcome = { await LobbyAds.shared.showRewarded() }
    @ObservationIgnored private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        budget = DailyBudget.load(defaults, key: Self.key, day: dayKey(Date().timeIntervalSince1970 * 1000))
    }

    var today: String { dayKey(Date().timeIntervalSince1970 * 1000) }
    var limits: DailyLimits { DailyLimits(flags: Beta.shared.flags) }
    var now: DailyBudget { budget.on(today) }
    var spent: Bool { now.spent(limits, capped: capped) }

    private func update(_ change: (inout DailyBudget) -> Void) {
        var next = now
        change(&next)
        budget = next
        next.save(defaults, key: Self.key)
    }

    func charge(newWords: Int = 0, cards: Int) {
        let day = today
        update { $0.charge(newWords: newWords, cards: cards, day: day) }
    }

    func gate(dueReviews: Int) -> LessonGate { now.lessonGate(limits, capped: capped, dueReviews: dueReviews) }

    func hasPlayed(_ kind: GameKind) -> Bool { now.hasPlayed(kind.rawValue) }

    func markPlayed(_ kind: GameKind) {
        let day = today
        update { $0.markPlayed(kind.rawValue, day: day) }
    }

    func retryOffer(_ kind: GameKind) -> RetryOffer { now.retryOffer(kind.rawValue, capped: capped) }

    func retry(_ kind: GameKind) async -> Bool {
        guard capped else { return true }
        guard now.retriesLeft(kind.rawValue) > 0 else { return false }
        guard let via = await watch(for: "retry", game: kind.rawValue) else { return false }
        let day = today
        update { $0.grantRetry(kind.rawValue, capped: true, day: day) }
        Beta.shared.log("retry_granted", ["for": .string("retry"), "game": .string(kind.rawValue), "via": .string(via)])
        return true
    }

    func moreCards(place: String) async -> Bool {
        guard capped, now.canWatchForCards else { return false }
        guard let via = await watch(for: "cards", game: place) else { return false }
        let day = today
        update { $0.grantCards(day: day) }
        Beta.shared.log("retry_granted", ["for": .string("cards"), "game": .string(place), "via": .string(via)])
        return true
    }

    private func watch(for reason: String, game: String) async -> String? {
        let outcome = await ad()
        if outcome != .unavailable { Beta.shared.log("retry_ad_shown", ["for": .string(reason), "game": .string(game)]) }
        return outcome.grants ? outcome.via : nil
    }
}

struct SubscribeOffer: View {
    @Environment(\.limitPaywall) private var paywall
    let place: String

    var body: some View {
        if let paywall {
            Button("Subscribe for unlimited learning with no ads") {
                Beta.shared.log("limit_paywall_tap", ["from": .string(place)])
                paywall()
            }
            .buttonStyle(.pl(.quiet, size: .sm))
            .accessibilityIdentifier("limitPaywall")
        }
    }
}

struct TryAgainOffer: View {
    let kind: GameKind
    let start: () -> Void
    @State private var busy = false

    var body: some View {
        switch DailyLedger.shared.retryOffer(kind) {
        case .free:
            Button("Try again", action: start).buttonStyle(.pl(.secondary, size: .lg)).accessibilityIdentifier("tryAgain")
        case .ad(let left):
            VStack(spacing: PL.Space.s2) {
                Button("Try again") {
                    busy = true
                    Task {
                        if await DailyLedger.shared.retry(kind) { start() }
                        busy = false
                    }
                }
                .buttonStyle(.pl(.secondary, size: .lg))
                .disabled(busy)
                .accessibilityIdentifier("tryAgain")
                Text("Watch one ad to try again. Retries left today: \(left).")
                    .font(PL.small.font()).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
                SubscribeOffer(place: "retry:\(kind.rawValue)")
            }
        case .none:
            SubscribeOffer(place: "retry:\(kind.rawValue)")
        }
    }
}

struct DailyLimitCard: View {
    let place: String
    @State private var busy = false

    var body: some View {
        let ledger = DailyLedger.shared
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s3) {
                Text("That is today's learning").font(PL.heading.font()).foregroundStyle(PL.ink)
                Text("New words today: \(ledger.now.newWords). Cards today: \(ledger.now.cards).")
                    .font(PL.body.font()).foregroundStyle(PL.ink).monospacedDigit()
                Text("Your daily limit resets at midnight.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                if ledger.now.canWatchForCards {
                    Button("Watch an ad for \(DailyLimits.adCards) more cards") {
                        busy = true
                        Task {
                            _ = await ledger.moreCards(place: place)
                            busy = false
                        }
                    }
                    .buttonStyle(.pl(.primary))
                    .disabled(busy)
                    .accessibilityIdentifier("limitMoreCards")
                }
                SubscribeOffer(place: place)
            }
        }
        .accessibilityIdentifier("dailyLimitCard")
        .onAppear { Beta.shared.log("limit_hit", ["place": .string(place), "cards": .number(Double(ledger.now.cards)), "new": .number(Double(ledger.now.newWords))]) }
    }
}

struct DailyLimitGate<Content: View>: View {
    let kind: GameKind
    @ViewBuilder let content: () -> Content
    @State private var entered = false

    var body: some View {
        if entered || kind.oncePerDay || !DailyLedger.shared.spent {
            content().onAppear { entered = true }
        } else {
            ScrollView {
                DailyLimitCard(place: "game:\(kind.rawValue)").padding(PL.Space.s4).frame(maxWidth: 520)
            }
            .frame(maxWidth: .infinity)
            .scrollContentBackground(.hidden)
            .plGround(.lattice, band: true)
            .navigationTitle(kind.title)
            .plChrome()
        }
    }
}

struct PlayedToday: View {
    let kind: GameKind
    let start: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PlayNote(text: "You played today's round. A new one arrives tomorrow.")
            TryAgainOffer(kind: kind, start: start)
        }
    }
}
