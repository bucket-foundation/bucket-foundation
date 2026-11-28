import BucketKit
import SwiftUI

struct StarRow: View {
    let stars: Int
    @Environment(\.gameReduceMotion) private var reduce
    @State private var landed = false

    var body: some View {
        HStack(spacing: PL.Space.s2) {
            ForEach(0..<GameStars.max, id: \.self) { i in
                Image(systemName: i < stars ? "star.fill" : "star")
                    .font(PL.icon(34, .heavy))
                    .foregroundStyle(i < stars ? PL.ochre : PL.paper.opacity(0.35))
                    .scaleEffect(reduce || landed || i >= stars ? 1 : 0.3)
                    .animation(GameMotion.pop(reduce).delay(Double(i) * PL.Motion.pop), value: landed)
            }
        }
        .accessibilityElement()
        .accessibilityLabel(Text("\(stars) of \(GameStars.max) stars"))
        .accessibilityIdentifier("game-stars")
        .onAppear { landed = true }
    }
}

struct CreditLine: View {
    let credit: GameCredit
    @Environment(\.gameReduceMotion) private var reduce
    @State private var shown = 0

    static func text(_ credit: GameCredit, shown: Int) -> String {
        credit.capped && credit.earned == 0 ? String(localized: "Daily cap reached") : String(localized: "+\(shown) XP")
    }

    var body: some View {
        Text(Self.text(credit, shown: shown))
            .font(PL.heading.font())
            .foregroundStyle(PL.ochre)
            .monospacedDigit()
            .contentTransition(.numericText(value: Double(shown)))
            .accessibilityLabel(Text(Self.text(credit, shown: credit.earned)))
            .accessibilityIdentifier("game-credit")
            .task {
                guard credit.earned > 0 else { return }
                if reduce {
                    shown = credit.earned
                    return
                }
                let step = max(1, credit.earned / 12)
                while shown < credit.earned {
                    try? await Task.sleep(for: .milliseconds(40))
                    withAnimation(.easeOut(duration: PL.Motion.press)) { shown = min(credit.earned, shown + step) }
                }
            }
    }
}

struct GameResults: View {
    let title: String
    let line: String
    var reveals: [PlayRevealItem] = []
    let root: String
    var board: [BoardRow] = []
    var againLabel = "Play again"
    var share: (kind: GameKind, shape: GameShare.Shape)?
    var retry: (kind: GameKind, deck: String?, start: () -> Void)?
    var results: [Bool]?
    var stars: Int?
    var credit: GameCredit?
    var best = false
    var extra: AnyView?
    let again: (() -> Void)?
    @Environment(LangStore.self) private var langs
    @Environment(Account.self) private var account
    @State private var landed = 0

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            PLCard(.tyrian) {
                VStack(alignment: .leading, spacing: PL.Space.s3) {
                    Text(LocalizedStringKey(title)).font(PL.title.font()).foregroundStyle(PL.paper).accessibilityIdentifier("playResults")
                    Text(LocalizedStringKey(line)).font(PL.body.font()).foregroundStyle(PL.paper.opacity(0.9))
                    if let results { GamePips(total: results.count, results: results, empty: PL.paper.opacity(0.25)) }
                    if let stars { StarRow(stars: stars) }
                    HStack(spacing: PL.Space.s3) {
                        if let credit { CreditLine(credit: credit) }
                        if best { PLBadge(String(localized: "New best")) }
                    }
                }
            }
            if !board.isEmpty {
                PLCard {
                    VStack(spacing: PL.Space.s2) {
                        ForEach(Array(board.enumerated()), id: \.offset) { i, r in
                            HStack {
                                Text("\(i + 1)  \(r.name)").font(PL.body.font()).foregroundStyle(r.me ? PL.vermilion : PL.ink)
                                Spacer()
                                Text("\(r.score)").font(PL.body.font()).monospacedDigit().foregroundStyle(PL.ink)
                            }
                        }
                    }
                }
            }
            ForEach(reveals) { PlayReveal(lang: $0.lang, form: $0.form, meaning: $0.meaning, root: root) }
            if let share { GameShareButton(kind: share.kind, text: langs.shareText(share.kind, share.shape), style: .pl(.primary, size: .lg)) }
            if let extra { extra }
            if let retry { TryAgainOffer(kind: retry.kind, deck: retry.deck, start: retry.start) }
            if let kind = share?.kind ?? retry?.kind { LiveResultActions(kind: kind) }
            if let again {
                if let kind = share?.kind, DailyLedger.shared.spent {
                    DailyLimitCard(place: "game:\(kind.rawValue)")
                } else {
                    Button(LocalizedStringKey(againLabel), action: again).buttonStyle(.pl(.primary, size: .lg))
                }
            }
            StartLearningButton().preference(key: LearnInPage.self, value: true)
        }
        .sensoryFeedback(.levelChange, trigger: landed)
        .onAppear {
            if stars != nil { landed += 1 }
            SaveNudge.gameEnded(signedIn: account.stage == .signedIn)
        }
        .resultScreen()
    }
}
