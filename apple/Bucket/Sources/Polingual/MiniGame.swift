import BucketKit
import SwiftUI

extension LangStore {
    var miniPuzzle: MiniPuzzle? {
        guard let system = dailySystem else { return nil }
        return MiniPuzzle.daily(gameWords, day: dayKey(Date().timeIntervalSince1970 * 1000), root: system.root, targets: gameLangs)
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

    var day: String { dayKey(Date().timeIntervalSince1970 * 1000) }
    var entry: MiniEntry? { puzzle?.entries.first { $0.id == entryId } }

    func solved(_ e: MiniEntry) -> Bool { zip(e.cells, e.letters).allSatisfy { filled[$0] == $1 } }

    var body: some View {
        ScrollView {
            if let time, let puzzle {
                GameEnd(kind: .mini, score: MiniRecord.clock(time), line: showed ? String(localized: "Answers shown. New puzzle tomorrow.") : String(localized: "New puzzle tomorrow."), missed: showed ? puzzle.entries.map(\.word) : [], cells: GameBrag.miniCells(puzzle), sharing: !showed, shareObject: showed ? nil : langs.gameScore(String(localized: "Mini in \(MiniRecord.clock(time))"), right: puzzle.entries.count, total: puzzle.entries.count), again: nil)
            } else if let puzzle {
                board(puzzle)
            } else {
                Text("Study a few more words and tomorrow's Mini opens.").foregroundStyle(Palette.muted).padding(.top, 60)
            }
        }
        .gameChrome(GameKind.mini.title, sideways: false)
        .task {
            guard puzzle == nil else { return }
            await langs.load()
            let p = langs.miniPuzzle
            puzzle = p
            time = MiniRecord.seconds(day)
            showed = UserDefaults.standard.bool(forKey: MiniRecord.shownKey(day))
            guard time == nil, let first = p?.entries.first else { return }
            entryId = first.id
            cursor = first.cells.first
            started = .now
            Beta.shared.studyStarted("game:mini")
        }
    }

    func board(_ p: MiniPuzzle) -> some View {
        VStack(spacing: 16) {
            TimelineView(.periodic(from: started, by: 1)) { c in
                Text(MiniRecord.clock(Int(c.date.timeIntervalSince(started)))).font(D8.word(22)).foregroundStyle(Palette.ink).monospacedDigit()
            }
            grid(p)
            if let entry { clue(entry) }
            keyboard(p)
            Button("Show answers") { reveal(p) }.buttonStyle(.borderless).font(.subheadline.weight(.semibold)).tint(Palette.muted)
        }
        .padding()
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
    }

    func grid(_ p: MiniPuzzle) -> some View {
        let answers = p.answers
        let numbers = p.numbers
        let size = min(56, (UIScreenWidth.value - 48) / CGFloat(max(p.cols, 1)))
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
        return Button { select(cell, p) } label: {
            ZStack(alignment: .topLeading) {
                Text(filled[cell] ?? "").font(.system(size: size * 0.5, weight: .heavy, design: .rounded))
                    .foregroundStyle(done ? D8.parchment : Palette.ink)
                    .frame(width: size, height: size)
                if let number {
                    Text("\(number)").font(.system(size: 10, weight: .bold)).foregroundStyle(done ? D8.parchment : Palette.muted).padding(3)
                }
            }
            .background(done ? D8.malachite : inWord ? Color(hex: 0xF3D98B) : D8.face, in: .rect(cornerRadius: 8))
            .overlay { RoundedRectangle(cornerRadius: 8).strokeBorder(cursor == cell ? D8.vermilion : D8.edge, lineWidth: cursor == cell ? 3 : 2) }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(filled[cell] ?? String(localized: "Empty square")))
    }

    func clue(_ e: MiniEntry) -> some View {
        HStack(spacing: 10) {
            FlagTile(lang: e.word.lang, size: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(e.across ? String(localized: "\(e.number) across · \(e.letters.count) letters") : String(localized: "\(e.number) down · \(e.letters.count) letters"))
                    .font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                Text(e.word.gloss).font(.headline).foregroundStyle(Palette.ink).lineLimit(2)
            }
            Spacer(minLength: 0)
            PlayButton(text: e.word.form, lang: e.word.lang)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card, in: .rect(cornerRadius: 14))
    }

    func keyboard(_ p: MiniPuzzle) -> some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 6), spacing: 6) {
            ForEach(p.keys, id: \.self) { key in
                Button { type(key, p) } label: {
                    Text(key).font(.system(size: 20, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(D8.face, in: .rect(cornerRadius: 10))
                        .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(D8.edge, lineWidth: 2) }
                }
                .buttonStyle(.plain)
            }
            Button { erase() } label: {
                Image(systemName: "delete.left.fill").font(.title3).foregroundStyle(D8.parchment)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(D8.vermilion, in: .rect(cornerRadius: 10))
            }
            .buttonStyle(.plain)
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
            haptic(true)
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

    func finish(_ p: MiniPuzzle) {
        guard time == nil else { return }
        let seconds = max(1, Int(Date.now.timeIntervalSince(started)))
        time = seconds
        if showed { UserDefaults.standard.set(true, forKey: MiniRecord.shownKey(day)) }
        MiniRecord.save(seconds, day)
        let words = p.entries.map(\.word)
        langs.recordGame(.mini, played: words, hits: showed ? 0 : words.count, points: nil, missed: showed ? words : [], earned: !showed)
        if !showed { reminders.noteStudy() }
        haptic(!showed)
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
