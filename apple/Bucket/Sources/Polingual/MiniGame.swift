import BucketKit
import SwiftUI

extension LangStore {
    var miniPuzzle: MiniPuzzle? {
        guard let system = dailySystem else { return nil }
        return MiniPuzzle.daily(gameWords, day: playDayKey(), root: system.root, targets: gameLangs)
    }
}

enum MiniRecord {
    static func key(_ day: String) -> String { "mini.time.\(day)" }

    static func shownKey(_ day: String) -> String { "mini.shown.\(day)" }

    static func seconds(_ day: String) -> Int? { UserDefaults.standard.object(forKey: key(day)) as? Int }

    static func save(_ seconds: Int, _ day: String) { UserDefaults.standard.set(seconds, forKey: key(day)) }

    static func clock(_ seconds: Int) -> String { String(format: "%d:%02d", seconds / 60, seconds % 60) }
}

struct MiniGame: View {
    @Environment(LangStore.self) private var langs
    @Environment(Reminders.self) private var reminders
    @State private var puzzle: MiniPuzzle?
    @State private var filled: [MiniCell: String] = [:]
    @State private var entryId: String?
    @State private var cursor: MiniCell?
    @State private var started = Date.now
    @State private var time: Int?
    @State private var showed = false
    @State private var round = PracticeRound()
    @State private var feel = GameFeel()
    @State private var streak = ComboCount()
    @State private var credit: GameCredit?
    @State private var runId = UUID().uuidString
    var day: String { playDayKey() }
    var entry: MiniEntry? { puzzle?.entries.first { $0.id == entryId } }

    func solved(_ e: MiniEntry) -> Bool { zip(e.cells, e.letters).allSatisfy { filled[$0] == $1 } }

    var body: some View {
        GameShell(game: .mini, feel: feel) {
            if let time, let puzzle {
                end(time, puzzle)
            } else if let puzzle {
                PlayRoomReader { room in board(puzzle, room: room) }
            } else {
                PLCard { Text("Study a few more words and tomorrow's Mini opens.").font(PL.body.font()).foregroundStyle(PL.ink) }
            }
        }
        .screenShareQuiet()
        .task {
            guard puzzle == nil else { return }
            await langs.load()
            let p = langs.miniPuzzle
            puzzle = p
            time = GameLaunch.freshDaily ? nil : MiniRecord.seconds(day)
            showed = GameLaunch.freshDaily ? false : UserDefaults.standard.bool(forKey: MiniRecord.shownKey(day))
            guard time == nil, let first = p?.entries.first else { return }
            entryId = first.id
            cursor = first.cells.first
            started = .now
            Beta.shared.studyStarted("game:mini")
        }
    }

    func end(_ time: Int, _ puzzle: MiniPuzzle) -> some View {
        let words = puzzle.entries.map(\.word)
        return GameResults(title: MiniRecord.clock(time),
                           line: round.score.map(PracticeLine.text) ?? (showed ? String(localized: "Answers shown. New puzzle tomorrow.") : String(localized: "New puzzle tomorrow.")),
                           reveals: (showed ? words : []).map { PlayRevealItem(lang: $0.lang, form: $0.form, meaning: $0.gloss) },
                           root: words.first?.root ?? langs.playRoot,
                           share: showed ? nil : (.mini, .time(seconds: time, cells: GameBrag.miniCells(puzzle))),
                           retry: (.mini, nil, { retry(puzzle) }),
                           stars: GameStars.rating(hits: showed ? 0 : words.count, total: words.count),
                           credit: credit,
                           extra: showed ? nil : AnyView(ShareObjectButton(langs.gameScore(String(localized: "Mini in \(MiniRecord.clock(time))"), right: words.count, total: words.count), wide: true)),
                           again: nil)
    }

    func board(_ p: MiniPuzzle, room: CGFloat) -> some View {
        let layout = MiniLayout(room: room, width: UIScreenWidth.value - PL.Space.s4 * 2, rows: p.rows, cols: p.cols, keys: p.keys.count + 1)
        return VStack(spacing: PL.Space.s3) {
            HStack(spacing: PL.Space.s2) {
                TimelineView(.periodic(from: started, by: 1)) { c in
                    Text(MiniRecord.clock(Int(c.date.timeIntervalSince(started)))).font(PL.heading.font()).foregroundStyle(PL.paper).monospacedDigit()
                }
                ComboChip(streak: streak, multiplier: false)
                Spacer(minLength: 0)
                Button("Show answers") { reveal(p) }.buttonStyle(.pl(.ghost, size: .sm, full: false))
            }
            grid(p, size: layout.cell)
            if let entry { clue(entry) }
            keyboard(p, columns: layout.columns)
        }
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }

    func grid(_ p: MiniPuzzle, size: CGFloat) -> some View {
        let answers = p.answers
        let numbers = p.numbers
        return VStack(spacing: 4) {
            ForEach(0..<p.rows, id: \.self) { r in
                HStack(spacing: 4) {
                    ForEach(0..<p.cols, id: \.self) { c in
                        let cell = MiniCell(row: r, col: c)
                        if answers[cell] != nil {
                            tile(cell, p, number: numbers[cell], size: size)
                        } else {
                            Color.clear.frame(width: size, height: size)
                        }
                    }
                }
            }
        }
    }

    func tile(_ cell: MiniCell, _ p: MiniPuzzle, number: Int?, size: CGFloat) -> some View {
        let done = p.entries.contains { $0.cells.contains(cell) && solved($0) }
        let inWord = entry?.cells.contains(cell) == true
        let fill: Color = done ? PL.malachite : inWord ? PL.lapisSoft : PL.card
        let ink: Color = done ? PL.paper : PL.ink
        let mark: Color = done ? PL.paper : PL.inkDim
        return Button { select(cell, p) } label: {
            ZStack(alignment: .topLeading) {
                Text(filled[cell] ?? "").font(PL.heading.font(scale: size * 0.5 / PL.heading.size))
                    .foregroundStyle(ink)
                    .frame(width: size, height: size)
                if let number {
                    Text("\(number)").font(PL.label.font(scale: 0.9)).foregroundStyle(mark).padding(3)
                }
            }
            .background(fill, in: .rect(cornerRadius: PL.Radius.sm))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.sm).strokeBorder(cursor == cell ? PL.vermilion : PL.paper3, lineWidth: cursor == cell ? 3 : 2) }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(filled[cell] ?? String(localized: "Empty square")))
    }

    func clue(_ e: MiniEntry) -> some View {
        HStack(spacing: 10) {
            FlagTile(lang: e.word.lang, size: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: langName(e.word.lang) + " · " + (e.across ? String(localized: "\(e.number) across · \(e.letters.count) letters") : String(localized: "\(e.number) down · \(e.letters.count) letters")))
                    .font(PL.label.font()).textCase(.uppercase).foregroundStyle(PL.inkDim).lineLimit(1).minimumScaleFactor(0.7)
                Text(e.word.gloss).font(PL.heading.font(scale: 0.8)).foregroundStyle(PL.ink).lineLimit(2)
            }
            Spacer(minLength: 0)
            PlayButton(text: e.word.form, lang: e.word.lang)
        }
        .padding(PL.Space.s3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PL.card, in: .rect(cornerRadius: PL.Radius.md))
    }

    func keyboard(_ p: MiniPuzzle, columns: Int) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: columns), spacing: 6) {
            ForEach(p.keys, id: \.self) { key in
                Button { type(key, p) } label: {
                    Text(key).font(PL.script(20))
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(GameAnswerStyle(state: .other))
            }
            Button { erase() } label: {
                Image(systemName: "delete.left.fill").font(PL.icon(20))
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(GameAnswerStyle(state: .wrong))
            .accessibilityLabel(Text("Delete"))
        }
    }

    func select(_ cell: MiniCell, _ p: MiniPuzzle) {
        tap()
        let here = p.entries.filter { $0.cells.contains(cell) }
        if cursor == cell, here.count > 1, let other = here.first(where: { $0.id != entryId }) {
            entryId = other.id
        } else if !here.contains(where: { $0.id == entryId }) {
            entryId = here.first?.id
        }
        cursor = cell
    }

    func type(_ key: String, _ p: MiniPuzzle) {
        guard let cursor, let e = entry else { return }
        tap()
        filled[cursor] = key
        if p.answers.allSatisfy({ filled[$0.key] == $0.value }) { return finish(p) }
        if solved(e) {
            streak.hit()
            feel.right(streak, points: e.letters.count)
            if let next = p.entries.first(where: { !solved($0) }) {
                entryId = next.id
                self.cursor = next.cells.first { filled[$0] == nil } ?? next.cells.first
            }
            return
        }
        if let i = e.cells.firstIndex(of: cursor), i + 1 < e.cells.count { self.cursor = e.cells[i + 1] }
    }

    func erase() {
        guard let cursor, let e = entry else { return }
        if filled[cursor] != nil {
            filled[cursor] = nil
        } else if let i = e.cells.firstIndex(of: cursor), i > 0 {
            self.cursor = e.cells[i - 1]
            filled[e.cells[i - 1]] = nil
        }
    }

    func reveal(_ p: MiniPuzzle) {
        showed = true
        filled = p.answers
        finish(p)
    }

    func retry(_ p: MiniPuzzle) {
        guard let first = p.entries.first else { return }
        round.begin()
        showed = false
        filled = [:]
        streak = ComboCount()
        entryId = first.id
        cursor = first.cells.first
        started = .now
        time = nil
    }

    func finish(_ p: MiniPuzzle) {
        guard time == nil else { return }
        if round.practicing {
            _ = round.finish(score: showed ? nil : MiniRecord.clock(max(1, Int(Date.now.timeIntervalSince(started)))))
            showed = UserDefaults.standard.bool(forKey: MiniRecord.shownKey(day))
            time = MiniRecord.seconds(day)
            return
        }
        let seconds = max(1, Int(Date.now.timeIntervalSince(started)))
        time = seconds
        if showed { UserDefaults.standard.set(true, forKey: MiniRecord.shownKey(day)) }
        MiniRecord.save(seconds, day)
        let words = p.entries.map(\.word)
        credit = langs.recordRun(runId, .mini, played: words, hits: showed ? 0 : words.count, points: nil, missed: showed ? words : [], earned: !showed)?.credit
        if !showed { reminders.noteStudy() }
    }
}

enum UIScreenWidth {
    @MainActor static var value: CGFloat {
        #if os(iOS)
        ScreenShare.keyWindow?.bounds.width ?? 390
        #else
        480
        #endif
    }
}

struct MiniLayout: Equatable {
    static let maxCell: CGFloat = 56
    static let minCell: CGFloat = 28
    static let gap: CGFloat = 4
    static let keyRow: CGFloat = 54
    static let chrome: CGFloat = 44 + 84 + PL.Space.s3 * 3 + PL.Space.s6 + PL.Space.s5

    let cell: CGFloat
    let columns: Int

    init(room: CGFloat, width: CGFloat, rows: Int, cols: Int, keys: Int) {
        let wide = (width - Self.gap * CGFloat(max(cols - 1, 0))) / CGFloat(max(cols, 1))
        let short = room > 0 && room < 760
        columns = short ? 7 : 6
        let keyRows = CGFloat((keys + columns - 1) / columns)
        let left = room > 0 ? room - Self.chrome - keyRows * Self.keyRow : .infinity
        let high = (left - Self.gap * CGFloat(max(rows - 1, 0))) / CGFloat(max(rows, 1))
        cell = max(Self.minCell, min(Self.maxCell, wide, high))
    }
}

struct PlayRoomReader<Content: View>: View {
    @Environment(\.playRoom) private var room
    @ViewBuilder let content: (CGFloat) -> Content

    var body: some View { content(room) }
}
