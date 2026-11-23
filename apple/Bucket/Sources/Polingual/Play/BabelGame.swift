import BucketKit
import SwiftUI

struct BabelGame: View {
    @Environment(LangStore.self) private var langs
    @Environment(\.verticalSizeClass) private var vertical
    @State private var feel = GameFeel()
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
    @State private var order: [String] = []
    @State private var hint: [Int] = []

    static let marks: [Color] = [PL.vermilion, PL.lapis, PL.ochre, PL.malachite, PL.tyrian]
    var wide: Bool { vertical == .compact }
    var marked: Bool { Babel.marksShown(level: level.number) }

    var done: Bool { RevealRules.babel(cleared: cleared.count, goal: level.goal, movesLeft: moves) || PlayLaunch.endGame }

    var body: some View {
        PlayScene(game: .babel, feel: feel) {
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
        Group {
            if wide {
                HStack(alignment: .top, spacing: PL.Space.s4) {
                    cells.frame(maxWidth: .infinity)
                    VStack(alignment: .leading, spacing: PL.Space.s2) {
                        status
                        line
                        key
                        hintButton
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                VStack(alignment: .leading, spacing: PL.Space.s3) {
                    status
                    line
                    cells
                    key
                    hintButton
                }
            }
        }
    }

    var status: some View {
        HStack {
            PlayLabel(text: "Cleared \(cleared.count) of \(level.goal)")
            ComboChip(streak: feel.streak, multiplier: false)
            Spacer()
            PlayLabel(text: "\(moves) moves")
        }
    }

    var line: some View {
        Text(pickedLine ?? "Swap two neighbours. Three words in a row that mean the same thing clear.")
            .font(PL.small.font()).foregroundStyle(PL.paper.opacity(0.9)).lineLimit(wide ? 3 : 2, reservesSpace: true)
            .accessibilityIdentifier("babelLine")
    }

    var cells: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: PL.Space.s1), count: Babel.size), spacing: PL.Space.s1) {
            ForEach(Array(board.enumerated()), id: \.element.key) { i, cell in
                Button { tap(i) } label: {
                    cellFace(cell)
                        .frame(maxWidth: .infinity, minHeight: wide ? 40 : 52)
                        .padding(2)
                        .background(picked == i ? PL.maya : PL.card, in: .rect(cornerRadius: 8))
                        .overlay { if hint.contains(i) { RoundedRectangle(cornerRadius: 8).stroke(PL.ochre, lineWidth: 3) } }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(cellLabel(cell))
                .accessibilityIdentifier("babelCell")
            }
        }
        .gameShake(shake)
    }

    @ViewBuilder func cellFace(_ cell: Cell) -> some View {
        let form = Text(meanings[cell.meaning]?.forms[cell.lang] ?? cell.meaning)
            .font(PL.small.font()).foregroundStyle(PL.ink).lineLimit(wide ? 1 : 2).minimumScaleFactor(0.5)
        let tag = HStack(spacing: 3) {
            if marked, let n = order.firstIndex(of: cell.meaning) { mark(n, size: 14) }
            PlayLabel(text: cell.lang, onDark: false)
        }
        if wide {
            VStack(spacing: 0) { form; tag }
        } else {
            VStack(spacing: 2) { form; tag }
        }
    }

    var key: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 64), spacing: PL.Space.s2, alignment: .leading)], alignment: .leading, spacing: PL.Space.s1) {
            ForEach(Array(order.enumerated()), id: \.element) { n, id in
                HStack(spacing: 4) {
                    if marked { mark(n, size: 16) }
                    Text(meanings[id]?.meaning ?? "").font(PL.small.font()).foregroundStyle(PL.paper).lineLimit(1).minimumScaleFactor(0.6)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(marked ? "\(n + 1), \(meanings[id]?.meaning ?? "")" : meanings[id]?.meaning ?? "")
            }
        }
        .accessibilityIdentifier("babelKey")
    }

    var hintButton: some View {
        Button("Show a move") { hint = Babel.hint(board) ?? [] }
            .buttonStyle(.pl(.ghost, size: .sm))
            .accessibilityIdentifier("babelHint")
    }

    func cellLabel(_ cell: Cell) -> String {
        let form = meanings[cell.meaning]?.forms[cell.lang] ?? cell.meaning
        guard marked, let n = order.firstIndex(of: cell.meaning) else { return "\(form), \(Lang.name(cell.lang))" }
        return "\(form), \(Lang.name(cell.lang)), meaning \(n + 1)"
    }

    var pickedLine: String? {
        guard let p = picked, board.indices.contains(p), let m = meanings[board[p].meaning], let form = m.forms[board[p].lang] else { return nil }
        return "\(form) is \(Lang.name(board[p].lang)) for \(m.meaning)."
    }

    func mark(_ n: Int, size: CGFloat) -> some View {
        Text("\(n + 1)")
            .font(PL.script(size * 0.7, .bold))
            .foregroundStyle(PL.paper)
            .frame(width: size, height: size)
            .background(Self.marks[n % Self.marks.count], in: .circle)
            .overlay(Circle().strokeBorder(PL.paper.opacity(0.8), lineWidth: 1))
            .accessibilityHidden(true)
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
            share: (.babel, .points(points, marks: [])),
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
        feel.reset()
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
        order = list.map(\.id)
        hint = []
        var d = Dealer(list, set, XorRng(ISpy.hash(LobbyRace.dealSeed())))
        board = Babel.playable(&d)
        dealer = d
        cleared = []
        moves = level.moves
        points = 0
        picked = nil
        recorded = false
    }

    func tap(_ i: Int) {
        hint = []
        guard let p = picked else { picked = i; return }
        picked = nil
        guard p != i, Babel.adjacent(p, i), var d = dealer else { return }
        let swapped = Babel.swapped(board, p, i)
        guard !Babel.matches(swapped).isEmpty else {
            shake += 1
            feel.record(false)
            return
        }
        let out = Babel.resolve(swapped, &d)
        moves -= 1
        cleared += out.cleared
        points += Babel.points(cleared: out.cleared.count, cascades: out.cascades)
        feel.record(true, points: max(1, out.cascades))
        board = Babel.hasMove(out.board) ? out.board : Babel.playable(&d)
        dealer = d
    }
}
