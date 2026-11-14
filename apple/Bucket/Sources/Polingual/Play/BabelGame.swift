import BucketKit
import SwiftUI

struct BabelGame: View {
    @Environment(LangStore.self) private var langs
    @State private var meanings: [String: Meaning] = [:]
    @State private var dealer: Dealer?
    @State private var board: [Cell] = []
    @State private var picked: Int?
    @State private var level = Babel.level(1)
    @State private var cleared: [Cell] = []
    @State private var moves = 0
    @State private var points = 0
    @State private var shake = 0
    @State private var root = "en"
    @State private var set: [String] = []
    @State private var recorded = false

    var done: Bool { RevealRules.babel(cleared: cleared.count, goal: level.goal, movesLeft: moves) || PlayLaunch.endGame }

    var body: some View {
        PlayScene(game: .babel, stickers: playStickers(.blocks, .azulejo)) {
            if board.isEmpty {
                ProgressView().tint(PL.paper)
            } else if done {
                results
            } else {
                grid
            }
        }
        .task { await langs.load(); if board.isEmpty { deal() } }
    }

    var grid: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            HStack {
                PlayLabel(text: "Cleared \(cleared.count) of \(level.goal)")
                Spacer()
                PlayLabel(text: "\(moves) moves")
            }
            Text("Swap two neighbours. Three words in a row that mean the same thing clear.").font(PL.small.font()).foregroundStyle(PL.paper.opacity(0.9))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: PL.Space.s1), count: Babel.size), spacing: PL.Space.s1) {
                ForEach(Array(board.enumerated()), id: \.element.key) { i, cell in
                    Button { tap(i) } label: {
                        VStack(spacing: 2) {
                            Text(meanings[cell.meaning]?.forms[cell.lang] ?? cell.meaning)
                                .font(PL.small.font()).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.5)
                            PlayLabel(text: cell.lang, onDark: false)
                        }
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .padding(2)
                        .background(picked == i ? PL.maya : PL.card, in: .rect(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                }
            }
            .gameShake(shake)
        }
    }

    var results: some View {
        var seen = Set<String>()
        let ids = cleared.map(\.meaning).filter { seen.insert($0).inserted }
        let reveals = ids.compactMap { meanings[$0] }.flatMap { m in set.prefix(2).compactMap { l in m.forms[l].map { PlayRevealItem(lang: l, form: $0, meaning: m.meaning) } } }
        let won = cleared.count >= level.goal
        return PlayResults(
            title: won ? "Level \(level.number) cleared" : "Out of moves",
            line: "\(points) points, \(cleared.count) words cleared.",
            reveals: Array(reveals.prefix(6)),
            root: root,
            againLabel: won ? "Next level" : "Try again",
            again: {
                if won { level = Babel.level(level.number + 1) }
                deal()
            }
        )
        .onAppear {
            guard !recorded else { return }
            recorded = true
            let words = ids.compactMap { meanings[$0] }.compactMap { m in set.first.flatMap { l in m.forms[l].map { PlayedWord(itemId: m.id, lang: l, form: $0, gloss: m.meaning, right: true) } } }
            langs.recordPlay(.babel, words, points: points)
        }
    }

    func deal() {
        guard let corpus = langs.corpus else { return }
        root = langs.deckRoot(corpus)
        let own = PlayDecks.langsWithoutRoot(Array(langs.playTargets.prefix(4)), root: root, min: 2, max: 4)
        set = own ?? (LangSets.all.first { !$0.targets.contains(root) }?.targets ?? ["es", "fr", "it"])
        var list = Babel.meanings(corpus.items, langs: set, level: level.number, root: root)
        if list.count < 3 {
            set = ["es", "fr", "it"]
            list = Babel.meanings(corpus.items, langs: set, level: level.number, root: root)
        }
        meanings = Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
        var d = Dealer(list, set, XorRng(ISpy.hash(DealSeeds.fresh())))
        board = Babel.playable(&d)
        dealer = d
        cleared = []
        moves = level.moves
        points = 0
        picked = nil
        recorded = false
    }

    func tap(_ i: Int) {
        guard let p = picked else { picked = i; return }
        picked = nil
        guard p != i, Babel.adjacent(p, i), var d = dealer else { return }
        let swapped = Babel.swapped(board, p, i)
        guard !Babel.matches(swapped).isEmpty else {
            shake += 1
            PlaySound.effect(false)
            return
        }
        let out = Babel.resolve(swapped, &d)
        moves -= 1
        cleared += out.cleared
        points += Babel.points(cleared: out.cleared.count, cascades: out.cascades)
        PlaySound.effect(true, combo: out.cascades)
        board = Babel.hasMove(out.board) ? out.board : Babel.playable(&d)
        dealer = d
    }
}
