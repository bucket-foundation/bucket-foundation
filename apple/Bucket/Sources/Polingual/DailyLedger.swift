import BucketKit
import SwiftUI

extension EnvironmentValues {
    @Entry var limitPaywall: (@MainActor () -> Void)?
}

extension DailyLedger {
    static let shared = DailyLedger(
        vault: PairedBudgetVault(),
        flags: { Beta.shared.flags },
        ad: {
            let outcome = await LobbyAds.shared.showRewarded()
            GrantNotice.shared.show(outcome)
            return outcome
        },
        adReady: { LobbyAds.shared.allowed && LobbyAds.shared.rewardedReady },
        log: { Beta.shared.log($0, $1) }
    )

    func hasPlayed(_ kind: GameKind, deck: String) -> Bool { hasPlayed(kind.rawValue, deck: deck) }
    func first(_ kind: GameKind, deck: String) -> DailyAttempt? { first(kind.rawValue, deck: deck) }
    func markPlayed(_ kind: GameKind, deck: String, title: String, shape: GameShare.Shape) { markPlayed(kind.rawValue, deck: deck, title: title, shape: shape) }
}

@MainActor
@Observable
final class GrantNotice {
    static let shared = GrantNotice()
    private(set) var text: String?
    @ObservationIgnored private var clear: Task<Void, Never>?

    func show(_ outcome: AdOutcome) {
        switch outcome {
        case .earned: return
        case .skipped: text = String(localized: "The ad closed early, so nothing was added.")
        case .unavailable: text = String(localized: "The ad did not play. This one is free.")
        }
        clear?.cancel()
        clear = Task {
            try? await Task.sleep(for: .seconds(5))
            if !Task.isCancelled { text = nil }
        }
    }
}

struct GrantNoticeToast: ViewModifier {
    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let text = GrantNotice.shared.text {
                Text(text)
                    .font(PL.small.font()).foregroundStyle(PL.paper)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, PL.Space.s4).padding(.vertical, PL.Space.s2)
                    .background(PL.ink, in: .capsule)
                    .padding(PL.Space.s3)
                    .transition(.opacity)
                    .accessibilityIdentifier("grantNotice")
            }
        }
        .animation(.default, value: GrantNotice.shared.text)
    }
}

struct SubscribeOffer: View {
    @Environment(\.limitPaywall) private var paywall
    let place: String

    var body: some View {
        if let paywall {
            Button("Subscribe for unlimited learning with no ads") {
                DailyLedger.shared.paywallTap(place)
                paywall()
            }
            .buttonStyle(.pl(.quiet, size: .sm))
            .accessibilityIdentifier("limitPaywall")
        }
    }
}

struct TryAgainOffer: View {
    let kind: GameKind
    var deck: String?
    let start: () -> Void
    @State private var busy = false

    var body: some View {
        let offer = DailyLedger.shared.retryOffer(kind.rawValue, deck: deck)
        VStack(spacing: PL.Space.s2) {
            switch offer {
            case .free:
                Button("Try again", action: start).buttonStyle(.pl(.secondary, size: .lg)).accessibilityIdentifier("tryAgain")
            case .ad(let left), .plain(let left):
                Button("Try again") {
                    busy = true
                    Task {
                        if await DailyLedger.shared.retry(kind.rawValue, deck: deck).granted { start() }
                        busy = false
                    }
                }
                .buttonStyle(.pl(.secondary, size: .lg))
                .disabled(busy)
                .accessibilityIdentifier("tryAgain")
                if case .ad = offer { caption(String(localized: "Watch one ad to try again.")) }
                caption(String(localized: "Retries left today: \(left)."))
                SubscribeOffer(place: "retry:\(kind.rawValue)")
            case .none:
                SubscribeOffer(place: "retry:\(kind.rawValue)")
            }
        }
        .task { LobbyAds.shared.preloadRewarded() }
    }

    func caption(_ text: String) -> some View {
        Text(text).font(PL.small.font()).foregroundStyle(PL.inkDim).multilineTextAlignment(.center)
    }
}

struct DailyLimitCard: View {
    let place: String
    @State private var busy = false
    @State private var skipped = false

    var body: some View {
        let ledger = DailyLedger.shared
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s3) {
                Text("That is today's learning").font(PL.heading.font()).foregroundStyle(PL.ink)
                Text("New words today: \(ledger.now.newWords). Cards today: \(ledger.now.cards).")
                    .font(PL.body.font()).foregroundStyle(PL.ink).monospacedDigit()
                Text("Your daily limit resets at midnight.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                switch ledger.cardOffer {
                case .ad: more(String(localized: "Watch an ad for \(DailyLimits.adCards) more cards"))
                case .plain: more(String(localized: "Get \(DailyLimits.adCards) more cards"))
                case .free, .none: EmptyView()
                }
                if skipped { Text("The ad closed early, so nothing was added.").font(PL.small.font()).foregroundStyle(PL.inkDim) }
                SubscribeOffer(place: place)
            }
        }
        .accessibilityIdentifier("dailyLimitCard")
        .onAppear { ledger.limitHit(place) }
        .task { LobbyAds.shared.preloadRewarded() }
    }

    func more(_ title: String) -> some View {
        Button(title) {
            busy = true
            Task {
                skipped = await DailyLedger.shared.moreCards(place: place) == .skipped
                busy = false
            }
        }
        .buttonStyle(.pl(.primary))
        .disabled(busy)
        .accessibilityIdentifier("limitMoreCards")
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

enum PracticeLine {
    static func text(_ score: String) -> String { String(localized: "Practice round: \(score). Your first result stands.") }
}

struct RecordedRound: View {
    let kind: GameKind
    let deck: String
    var practice: String?
    let root: String
    let retry: () -> Void

    var body: some View {
        let first = DailyLedger.shared.first(kind, deck: deck)
        PlayResults(
            title: first?.title ?? kind.title,
            line: practice.map(PracticeLine.text) ?? "You played today's round. A new one arrives tomorrow.",
            root: root,
            share: first?.shape.map { (kind, $0) },
            retry: (kind, deck, retry),
            again: nil
        )
    }
}
