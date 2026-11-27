import BucketKit
import SwiftUI
#if os(iOS)
import UIKit
#endif

extension Skill {
    var title: String {
        switch self {
        case .count: String(localized: "Count to 10")
        case .introduce: String(localized: "Introduce yourself")
        case .order: String(localized: "Order food")
        case .sentence: String(localized: "First sentence")
        }
    }

    func boast(_ lang: String) -> String {
        switch self {
        case .count: String(localized: "I can count to 10 in \(langName(lang)) on \(Feedback.appName)")
        case .introduce: String(localized: "I can introduce myself in \(langName(lang)) on \(Feedback.appName)")
        case .order: String(localized: "I can order food in \(langName(lang)) on \(Feedback.appName)")
        case .sentence: String(localized: "I mastered my first sentence in \(langName(lang)) on \(Feedback.appName)")
        }
    }
}

extension ShareObject {
    var text: String {
        switch self {
        case .streak(let days, let langs, _):
            langs.isEmpty ? String(localized: "\(days) day streak on \(Feedback.appName)") : String(localized: "\(days) days in a row learning \(langs.map(langName).joined(separator: ", ")) on \(Feedback.appName)")
        case .system(_, _, let targets, _, _): String(localized: "Learning \(targets.map(langName).joined(separator: ", ")) together on \(Feedback.appName)")
        case .language(let lang, _), .flag(let lang, _): String(localized: "Learning \(langName(lang)) on \(Feedback.appName)")
        case .mastered(let lang, let count, _, let words):
            String(localized: "\(count) words mastered in \(langName(lang)) on \(Feedback.appName)") + (words.isEmpty ? "" : ": " + words.map(\.form).joined(separator: ", "))
        case .masteredAll(let sets, _):
            String(localized: "\(sets.total) words mastered in \(sets.langs.map(langName).joined(separator: ", ")) on \(Feedback.appName)")
                + sets.filter { !$0.words.isEmpty }.map { "\n\(langName($0.lang)): " + $0.words.map(\.form).joined(separator: ", ") }.joined()
        case .skill(let skill, let lang, _, let words): skill.boast(lang) + (words.isEmpty ? "" : ": " + words.map(\.form).joined(separator: ", "))
        case .word(_, let gloss, let forms): "\(gloss): " + forms.prefix(6).map(\.form).joined(separator: " · ")
        case .tile(let form, let gloss, _): form.form == gloss ? form.form : "\(form.form): \(gloss)"
        case .score(let s): String(localized: "\(s.right) of \(s.total) right in \(s.source) on \(Feedback.appName)")
        case .content(let m): m.quote ?? m.title
        case .standings(let s):
            s.mine.map { String(localized: "Number \($0.rank) of \(s.members) in \(s.group) this week on \(Feedback.appName)") } ?? String(localized: "This week in \(s.group) on \(Feedback.appName)")
        }
    }

    var sheetTitle: String {
        switch self {
        case .streak: String(localized: "Share your streak")
        case .system: String(localized: "Share your language system")
        case .language: String(localized: "Share this language")
        case .mastered, .masteredAll: String(localized: "Share your words")
        case .skill: String(localized: "Share your milestone")
        case .word: String(localized: "Share this word")
        case .tile: String(localized: "Share this tile")
        case .flag: String(localized: "Share this flag")
        case .score: String(localized: "Share your score")
        case .content: String(localized: "Share this moment")
        case .standings: String(localized: "Share the standings")
        }
    }

    var chip: String {
        switch self {
        case .streak: String(localized: "Streak")
        case .system(let name, _, _, _, _): name
        case .language(let lang, _): langName(lang)
        case .mastered(let lang, let count, _, _): String(localized: "\(count) \(langName(lang)) words")
        case .masteredAll(let sets, _): String(localized: "\(sets.total) words mastered")
        case .skill(let skill, _, _, _): skill.title
        case .word(_, let gloss, _): gloss
        case .tile(let form, _, _): form.form
        case .flag(let lang, _): String(localized: "\(langName(lang)) flag")
        case .score: String(localized: "Score")
        case .content(let m): m.title
        case .standings: String(localized: "Standings")
        }
    }

    var page: SharePage { SharePage(route, title: text) }
}

extension LangStore {
    var shareables: [ShareObject] {
        let root = systems.first?.root ?? "en"
        let now = Date().timeIntervalSince1970 * 1000
        let streak = langStreak(self)
        var out: [ShareObject] = streak > 0 ? [.streak(days: streak, langs: gameLangs, root: root)] : []
        for s in systems {
            let learned = corpus.map { systemSummary(s, $0, state(s.id), now: now).started } ?? 0
            out.append(.system(name: s.name, root: s.root, targets: s.targets, streak: streak, learned: learned))
        }
        out += masteredShares(root: root)
        out += gameLangs.map { .language($0, root: root) }
        out += gameLangs.map { .flag($0, root: root) }
        return out
    }
}

extension LangStore {
    var masteredSets: [MasteredSet] {
        guard let corpus else { return [] }
        let now = Date().timeIntervalSince1970 * 1000
        var mastered: [String: Int] = [:]
        var best: [String: LangSystem] = [:]
        for s in systems {
            for p in langProgress(s, corpus, state(s.id), now: now) where Int(p.mastered) > mastered[p.lang] ?? 0 {
                mastered[p.lang] = Int(p.mastered)
                best[p.lang] = s
            }
        }
        return mastered.filter { $0.value > 0 }.sorted { $0.value > $1.value || ($0.value == $1.value && $0.key < $1.key) }.map { lang, count in
            MasteredSet(lang: lang, count: count, words: best[lang].map { masteredWords($0, corpus, state($0.id), lang: lang) } ?? [])
        }
    }

    func masteredShares(root: String, first lang: String? = nil) -> [ShareObject] {
        let sets = masteredSets
        let one = sets.map { ShareObject.mastered(lang: $0.lang, count: $0.count, root: root, words: $0.words) }
        let all: [ShareObject] = sets.count > 1 ? [.masteredAll(sets: sets, root: root)] : []
        guard let lang, let i = sets.firstIndex(where: { $0.lang == lang }) else { return all + one }
        return [one[i]] + all + one.enumerated().filter { $0.offset != i }.map(\.element)
    }
}

struct ShareChoice: Identifiable {
    let id = UUID()
    let objects: [ShareObject]
}

private let plum = PL.tyrian
private let stone = PL.inkDim

struct ShareCardView: View {
    static let size = CGSize(width: 540, height: 675)
    let object: ShareObject
    let style: ShareStyle

    var body: some View {
        face
            .frame(width: Self.size.width, height: Self.size.height)
            .clipped()
            .environment(\.colorScheme, .light)
    }

    @ViewBuilder var face: some View {
        switch object {
        case .streak(let days, let langs, _):
            switch style {
            case .hundred: HundredCard(days: days)
            case .ledger: ShareCard(langs: langs, streak: days, learned: 0)
            default: FlameCard(days: days, langs: langs)
            }
        case .system(let name, let root, let targets, let streak, let learned):
            switch style {
            case .wall: FlagWallCard(name: name, langs: targets)
            case .ledger: ShareCard(langs: targets, streak: streak, learned: learned)
            default: TreeCard(name: name, root: root, targets: targets)
            }
        case .language(let lang, _):
            if style == .plate { FlagPlateCard(lang: lang, dark: false) } else { FlagBannerCard(lang: lang, word: nil, reading: nil, line: String(localized: "Learning it on \(Feedback.appName)")) }
        case .mastered(let lang, let count, _, let words):
            switch style {
            case .banner: FlagBannerCard(lang: lang, word: "\(count)", reading: nil, line: String(localized: "words mastered"))
            case .list: MasteredListCard(lang: lang, count: count, words: words)
            default: MasteredCard(lang: lang, count: count, words: words)
            }
        case .masteredAll(let sets, _):
            if style == .list { MasteredAllCard(sets: sets) } else { MasteredTotalCard(sets: sets) }
        case .skill(let skill, let lang, _, let words):
            if style == .list { MasteredListCard(lang: lang, count: words.count, words: words, title: skill.title) } else { FlagBannerCard(lang: lang, word: nil, reading: nil, line: skill.title) }
        case .flag(let lang, _):
            if style == .plate { FlagPlateCard(lang: lang, dark: true) } else { FlagBannerCard(lang: lang, word: nil, reading: nil, line: nil) }
        case .word(_, let gloss, let forms):
            switch style {
            case .wall: TileWallCard(gloss: gloss, forms: forms)
            case .tile: TileCard(form: forms.first ?? ShareForm(lang: "en", form: gloss), gloss: gloss, reading: nil)
            default: WordShareCard(gloss: gloss, words: forms.map { (lang: $0.lang, form: $0.form) })
            }
        case .tile(let form, let gloss, let reading):
            if style == .banner { FlagBannerCard(lang: form.lang, word: form.form, reading: reading, line: gloss == form.form ? nil : gloss) } else { TileCard(form: form, gloss: gloss, reading: reading) }
        case .score(let s):
            if style == .ring { RingCard(score: s) } else { NumberCard(score: s) }
        case .content(let m):
            switch style {
            case .moment: MomentCard(moment: m)
            case .quote: QuoteCard(moment: m)
            default: CoverCard(moment: m)
            }
        case .standings(let s):
            if style == .rank { StandingRankCard(standings: s) } else { StandingsCard(standings: s) }
        }
    }
}

struct CardFoot: View {
    var color = PL.ink
    var trailing: String?

    var body: some View {
        HStack {
            ShareBrand(mark: 36, color: color)
            Spacer(minLength: 8)
            Text(trailing ?? (Feedback.isPolingual ? String(localized: "polingual.com") : String(localized: "bucket.foundation")))
                .font(trailing == nil ? PL.capsFont(15) : PL.script(22, .heavy))
                .foregroundStyle(color)
        }
    }
}

struct CardFlags: View {
    let langs: [String]
    var size: CGFloat = 52

    var body: some View {
        HStack(spacing: 10) {
            ForEach(langs.prefix(6), id: \.self) { FlagTile(lang: $0, size: size) }
        }
    }
}

struct FlameCard: View {
    let days: Int
    let langs: [String]

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            Image(systemName: "flame.fill").font(PL.text(92)).foregroundStyle(PL.paper)
            Text("\(days)").font(PL.script(180, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text("DAY STREAK").font(PL.capsFont(26)).tracking(4).foregroundStyle(PL.paper)
            Spacer(minLength: 0)
            CardFlags(langs: langs).padding(.bottom, 28)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LinearGradient(colors: [PL.ochre, PL.vermilion, PL.vermilionDeep], startPoint: .top, endPoint: .bottom))
    }
}

struct HundredCard: View {
    let days: Int

    var body: some View {
        let g = StreakGoal(streak: Double(days))
        VStack(alignment: .leading, spacing: 22) {
            Text(g.reached ? String(localized: "Day \(g.day)") : String(localized: "Day \(g.day) of 100"))
                .font(PL.script(48, .heavy)).foregroundStyle(PL.paper)
            Grid(horizontalSpacing: 10, verticalSpacing: 10) {
                ForEach(0..<10, id: \.self) { row in
                    GridRow {
                        ForEach(0..<10, id: \.self) { col in
                            Circle().fill(row * 10 + col < g.day ? PL.vermilion : PL.paper.opacity(0.14)).frame(width: 36, height: 36)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            Spacer(minLength: 0)
            CardFoot(color: PL.paper)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PL.ink)
    }
}

struct TreeCard: View {
    let name: String
    let root: String
    let targets: [String]

    var body: some View {
        let shown = Array(targets.prefix(8))
        let row = min(108, 372 / CGFloat(max(1, shown.count)))
        VStack(alignment: .leading, spacing: 0) {
            Text(name).font(PL.script(38, .heavy)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
            Text(shown.count == 1 ? String(localized: "One root, one language") : String(localized: "One root, \(shown.count) languages")).font(PL.capsFont(16)).tracking(1.2).foregroundStyle(stone).padding(.top, 4).padding(.bottom, 20)
            HStack(spacing: 14) {
                FlagTile(lang: root, size: 64)
                Text(langName(root)).font(PL.script(28, .heavy)).foregroundStyle(PL.ink)
            }
            ForEach(Array(shown.enumerated()), id: \.element) { i, l in
                HStack(spacing: 12) {
                    ZStack(alignment: .topLeading) {
                        Rectangle().fill(plum).frame(width: 5, height: i == shown.count - 1 ? row / 2 + 2 : row)
                        Rectangle().fill(plum).frame(width: 34, height: 5).offset(y: row / 2 - 2)
                    }
                    .frame(width: 34, height: row, alignment: .topLeading)
                    .padding(.leading, 30)
                    FlagTile(lang: l, size: row - 12)
                    Text(langName(l)).font(PL.script(min(26, row * 0.5), .bold)).foregroundStyle(PL.ink)
                }
            }
            Spacer(minLength: 0)
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.paper)
    }
}

struct FlagWallCard: View {
    let name: String
    let langs: [String]

    var body: some View {
        let shown = Array(langs.prefix(9))
        let cols = shown.count <= 1 ? 1 : shown.count <= 4 ? 2 : 3
        let size: CGFloat = cols == 1 ? 300 : cols == 2 ? 200 : 136
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(size), spacing: 16), count: cols), spacing: 16) {
                ForEach(shown, id: \.self) { FlagTile(lang: $0, size: size) }
            }
            Spacer(minLength: 0)
            Text(name).font(PL.script(34, .heavy)).foregroundStyle(PL.paper).lineLimit(1).minimumScaleFactor(0.5)
            CardFoot(color: PL.paper)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PL.ink)
    }
}

struct FlagBannerCard: View {
    let lang: String
    let word: String?
    let reading: String?
    let line: String?

    var body: some View {
        VStack(spacing: 0) {
            FlagFace(flag: D8Flag.of(lang), emblem: word == nil)
            VStack(alignment: .leading, spacing: 8) {
                if let word {
                    Text(langName(lang).uppercased()).font(PL.capsFont(18)).tracking(2).foregroundStyle(stone)
                    Text(word).font(PL.wordFont(68)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.4)
                        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                } else {
                    Text(langName(lang)).font(PL.wordFont(64)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                }
                if let reading { Text(reading).font(PL.text(22)).foregroundStyle(PL.inkDim).lineLimit(1).minimumScaleFactor(0.6) }
                if let line { Text(line).font(PL.script(24, .bold)).foregroundStyle(stone).lineLimit(2) }
                CardFoot().padding(.top, 10)
            }
            .padding(32)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PL.paper)
        }
    }
}

struct FlagPlateCard: View {
    let lang: String
    let dark: Bool

    var body: some View {
        let ink = dark ? PL.paper : PL.ink
        VStack(spacing: 20) {
            Spacer(minLength: 0)
            FlagTile(lang: lang, size: 300)
            Text(langName(lang)).font(PL.wordFont(54)).foregroundStyle(ink).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            CardFoot(color: ink)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(dark ? PL.ink : PL.paper)
    }
}

struct TileCard: View {
    let form: ShareForm
    let gloss: String
    let reading: String?

    var body: some View {
        VStack(spacing: 18) {
            Spacer(minLength: 0)
            TileFace(word: form.form, lang: form.lang, reading: reading, size: 420)
                .frame(width: 420, height: 420)
                .modifier(Glaze(radius: 30, lip: 10))
            if gloss != form.form {
                Text(gloss).font(PL.script(30, .bold)).foregroundStyle(stone).lineLimit(1).minimumScaleFactor(0.5)
            }
            Spacer(minLength: 0)
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PL.paper)
    }
}

struct TileWallCard: View {
    let gloss: String
    let forms: [ShareForm]

    var body: some View {
        let shown = Array(forms.prefix(6))
        let size: CGFloat = shown.count <= 4 ? 216 : 142
        VStack(spacing: 16) {
            Text(gloss).font(PL.wordFont(38)).foregroundStyle(PL.paper).lineLimit(1).minimumScaleFactor(0.5).frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(size), spacing: 14), count: shown.count <= 4 ? 2 : 3), spacing: 14) {
                ForEach(shown, id: \.lang) { f in
                    TileFace(word: f.form, lang: f.lang, reading: nil, size: size)
                        .frame(width: size, height: size)
                        .modifier(Glaze(radius: size * 0.07))
                }
            }
            Spacer(minLength: 0)
            CardFoot(color: PL.paper)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PL.ink)
    }
}

struct MasteredCard: View {
    let lang: String
    let count: Int
    var words: [MasteredWord] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            FlagTile(lang: lang, size: 96)
            Spacer(minLength: 0)
            Text("\(count)").font(PL.script(170, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text(count == 1 ? String(localized: "word mastered") : String(localized: "words mastered")).font(PL.script(34, .bold)).foregroundStyle(PL.paper)
            Text(langName(lang)).font(PL.script(30, .bold)).foregroundStyle(PL.paper.opacity(0.8))
            if let named = MasteredWord.named(words, count: count) {
                Text(named).font(PL.script(30, .heavy)).foregroundStyle(.white).lineLimit(2).minimumScaleFactor(0.5).padding(.top, 14)
            }
            Spacer(minLength: 0)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.malachite)
    }
}

struct MasteredListCard: View {
    static let shown = 10
    let lang: String
    let count: Int
    let words: [MasteredWord]
    var title: String?

    var body: some View {
        let big = words.count <= 5
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 14) {
                FlagTile(lang: lang, size: 56)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title ?? (count == 1 ? String(localized: "First word mastered") : String(localized: "\(count) words mastered")))
                        .font(PL.script(30, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                    Text(langName(lang)).font(PL.script(22, .bold)).foregroundStyle(PL.paper.opacity(0.8))
                }
            }
            .padding(.bottom, 20)
            if words.count > Self.shown {
                MasteredWordFlow(sets: [MasteredSet(lang: lang, count: count, words: words)], flags: false)
                    .frame(maxHeight: .infinity, alignment: .topLeading)
            } else if big, title != nil {
                Spacer(minLength: 0)
                phrases
                Spacer(minLength: 0)
            } else {
                if big { Spacer(minLength: 0) }
                rows(big: big)
                Spacer(minLength: 0)
            }
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.malachite)
    }

    var phrases: some View {
        VStack(alignment: .leading, spacing: 22) {
            ForEach(Array(words.enumerated()), id: \.offset) { _, w in
                VStack(alignment: .leading, spacing: 2) {
                    Text(w.form).font(PL.script(38, .heavy)).foregroundStyle(.white).lineLimit(words.count == 1 ? 4 : 2).minimumScaleFactor(0.6)
                    Text(w.meaning).font(PL.script(22, .semibold)).foregroundStyle(PL.paper.opacity(0.85)).lineLimit(words.count == 1 ? 3 : 1).minimumScaleFactor(0.6)
                }
            }
        }
    }

    func rows(big: Bool) -> some View {
        VStack(alignment: .leading, spacing: big ? 18 : 7) {
            ForEach(Array(words.prefix(Self.shown).enumerated()), id: \.offset) { _, w in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(w.form).font(PL.script(big ? 48 : 24, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                    Spacer(minLength: 8)
                    Text(w.meaning).font(PL.script(big ? 28 : 18, .semibold)).foregroundStyle(PL.paper.opacity(0.85)).lineLimit(1).minimumScaleFactor(0.6)
                }
            }
            if count > words.count {
                Text(verbatim: "+\(count - words.count)").font(PL.script(18, .bold)).foregroundStyle(PL.paper.opacity(0.7))
            }
        }
    }
}

struct MasteredWordFlow: View {
    static let cap = 1000
    let sets: [MasteredSet]
    var flags = true

    var body: some View {
        ViewThatFits(in: .vertical) {
            block(34)
            block(28)
            block(23)
            block(19)
            block(16)
            block(13)
            block(11)
            block(9)
            block(7)
            block(6)
            block(5)
            block(4, cap: Self.cap)
        }
    }

    func block(_ size: CGFloat, cap: Int = .max) -> some View {
        let shown = MasteredWordFlow.shown(sets, cap: cap)
        let hidden = sets.total - shown.reduce(0) { $0 + $1.words.count }
        return VStack(alignment: .leading, spacing: size * 0.7) {
            ForEach(shown, id: \.lang) { set in
                FlowLayout(spacing: size * 0.55) {
                    if flags { FlagTile(lang: set.lang, size: size * 1.4) }
                    ForEach(Array(set.words.enumerated()), id: \.offset) { _, w in
                        Text(w.form).font(PL.script(size, .heavy)).foregroundStyle(.white).lineLimit(1)
                    }
                }
            }
            if hidden > 0 {
                Text(verbatim: "+\(hidden)").font(PL.script(max(size, 16), .bold)).foregroundStyle(PL.paper.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    static func shown(_ sets: [MasteredSet], cap: Int) -> [MasteredSet] {
        var left = cap
        return sets.compactMap { set in
            guard left > 0, !set.words.isEmpty else { return nil }
            let words = Array(set.words.prefix(left))
            left -= words.count
            return MasteredSet(lang: set.lang, count: set.count, words: words)
        }
    }
}

struct MasteredAllCard: View {
    let sets: [MasteredSet]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("\(sets.total) words mastered").font(PL.script(34, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
            Text(sets.langs.map(langName).joined(separator: ", ")).font(PL.script(22, .bold)).foregroundStyle(PL.paper.opacity(0.8)).lineLimit(2).minimumScaleFactor(0.6)
                .padding(.bottom, 20)
            MasteredWordFlow(sets: sets)
                .frame(maxHeight: .infinity, alignment: .topLeading)
            CardFoot(color: .white).padding(.top, 12)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.malachite)
    }
}

struct MasteredTotalCard: View {
    let sets: [MasteredSet]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CardFlags(langs: sets.langs, size: 72)
            Spacer(minLength: 0)
            Text("\(sets.total)").font(PL.script(170, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Text("words mastered").font(PL.script(34, .bold)).foregroundStyle(PL.paper)
            Text(sets.langs.map(langName).joined(separator: ", ")).font(PL.script(26, .bold)).foregroundStyle(PL.paper.opacity(0.8)).lineLimit(2).minimumScaleFactor(0.6)
            Spacer(minLength: 0)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.malachite)
    }
}

struct NumberCard: View {
    let score: ShareScore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(score.source.uppercased()).font(PL.capsFont(22)).tracking(2.5).foregroundStyle(PL.paper.opacity(0.8)).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text("\(score.right)").font(PL.script(170, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
                Text("/\(score.total)").font(PL.script(64, .heavy)).foregroundStyle(PL.paper.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.5)
            }
            Text("\(score.right) of \(score.total) right").font(PL.script(30, .bold)).foregroundStyle(PL.paper)
            Spacer(minLength: 0)
            CardFlags(langs: score.langs).padding(.bottom, 26)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.lapis)
    }
}

struct RingCard: View {
    let score: ShareScore

    var body: some View {
        VStack(spacing: 16) {
            Text(score.source).font(PL.script(34, .heavy)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            ZStack {
                Circle().stroke(PL.paper3, lineWidth: 30)
                Circle().trim(from: 0, to: Double(score.percent) / 100).stroke(PL.malachite, style: StrokeStyle(lineWidth: 30, lineCap: .round)).rotationEffect(.degrees(-90))
                Text("\(score.percent)%").font(PL.script(92, .heavy)).foregroundStyle(PL.ink)
            }
            .frame(width: 300, height: 300)
            Spacer(minLength: 0)
            Text("\(score.right) of \(score.total) right").font(PL.script(28, .bold)).foregroundStyle(stone)
            if score.streak > 1 { Text("\(score.streak) day streak").font(PL.capsFont(18)).tracking(1.5).foregroundStyle(PL.vermilion) }
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(PL.paper)
    }
}

struct MomentArt: View {
    let moment: ShareMoment
    var size: CGFloat = 76

    var body: some View {
        if let lang = moment.lang { FlagTile(lang: lang, size: size) } else { BranchTile(branch: moment.branch, size: size) }
    }
}

struct MomentHeader: View {
    let moment: ShareMoment

    var body: some View {
        HStack(spacing: 14) {
            MomentArt(moment: moment)
            VStack(alignment: .leading, spacing: 2) {
                Text(moment.title).font(PL.script(26, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                Text(moment.source).font(PL.script(21, .semibold)).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
            }
        }
    }
}

extension ShareMoment {
    var playLine: String? { clock.map { String(localized: "Play from \($0)") } }
}

struct QuoteCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MomentHeader(moment: moment)
            Spacer(minLength: 0)
            Text(moment.quote ?? moment.title)
                .font(PL.script(42, .heavy))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .environment(\.layoutDirection, moment.lang.map(Lang.isRTL) == true ? .rightToLeft : .leftToRight)
            Spacer(minLength: 0)
            CardFoot(color: .white, trailing: moment.playLine)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background {
            ZStack(alignment: .topLeading) {
                PL.vermilionDeep
                Text(verbatim: "\u{201C}").font(PL.script(460, .black)).foregroundStyle(.white.opacity(0.1)).offset(x: 20, y: 40)
            }
        }
    }
}

struct CoverCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Spacer(minLength: 0)
            MomentArt(moment: moment, size: 220)
            Text(moment.title).font(PL.script(52, .heavy)).foregroundStyle(PL.ink).lineLimit(3).minimumScaleFactor(0.5).padding(.top, 14)
            Text(moment.source).font(PL.script(26, .semibold)).foregroundStyle(stone).lineLimit(2)
            Spacer(minLength: 0)
            CardFoot(trailing: moment.playLine)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.paper)
    }
}

struct MomentCard: View {
    let moment: ShareMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MomentHeader(moment: moment)
            Spacer(minLength: 0)
            Text("Play from").font(PL.capsFont(24)).tracking(3).foregroundStyle(.white.opacity(0.8))
            Text(moment.clock ?? "").font(PL.script(130, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.lapis)
    }
}

struct StandingsCard: View {
    let standings: ShareStandings

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(standings.group).font(PL.script(38, .heavy)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
            Text("THIS WEEK").font(PL.capsFont(16)).tracking(1.2).foregroundStyle(stone).padding(.top, 4).padding(.bottom, 16)
            VStack(spacing: 8) {
                ForEach(standings.rows, id: \.self) { StandingCardRow(row: $0) }
            }
            Spacer(minLength: 0)
            CardFoot()
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.paper)
    }
}

struct StandingCardRow: View {
    let row: ShareStanding

    var body: some View {
        let ink = row.isMe ? Color.white : PL.ink
        HStack(spacing: 12) {
            Text("\(row.rank)").font(PL.script(30, .heavy)).foregroundStyle(ink).frame(width: 40)
            VStack(alignment: .leading, spacing: 2) {
                Text(row.name).font(PL.script(24, .heavy)).foregroundStyle(ink).lineLimit(1).minimumScaleFactor(0.6)
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                    Text("\(row.streak) · \(row.mastered) mastered").lineLimit(1).minimumScaleFactor(0.7)
                }
                .font(PL.script(15, .semibold))
                .foregroundStyle(row.isMe ? PL.paper : stone)
            }
            Spacer(minLength: 4)
            HStack(spacing: 3) {
                ForEach(row.langs.prefix(3), id: \.self) { FlagTile(lang: $0, size: 28) }
            }
            Text("\(row.weekly)").font(PL.script(30, .heavy)).foregroundStyle(ink).lineLimit(1).minimumScaleFactor(0.5).frame(width: 74, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .frame(height: 62)
        .modifier(GameLip(face: row.isMe ? PL.lapis : .white, lip: row.isMe ? PL.lapisDeep : PL.paper3, radius: 14))
    }
}

struct StandingRankCard: View {
    let standings: ShareStandings

    var body: some View {
        let mine = standings.mine
        VStack(alignment: .leading, spacing: 0) {
            Text(standings.group.uppercased()).font(PL.capsFont(22)).tracking(2.5).foregroundStyle(PL.paper.opacity(0.8)).lineLimit(1).minimumScaleFactor(0.5)
            Spacer(minLength: 0)
            HStack(alignment: .lastTextBaseline, spacing: 6) {
                Text("#\(mine?.rank ?? 1)").font(PL.script(170, .heavy)).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.5)
                Text("/\(standings.members)").font(PL.script(64, .heavy)).foregroundStyle(PL.paper.opacity(0.7)).lineLimit(1).minimumScaleFactor(0.5)
            }
            Text("\(mine?.weekly ?? 0) cards this week").font(PL.script(30, .bold)).foregroundStyle(PL.paper)
            if let mine, mine.streak > 1 { Text("\(mine.streak) day streak").font(PL.capsFont(18)).tracking(1.5).foregroundStyle(PL.paper).padding(.top, 6) }
            Spacer(minLength: 0)
            CardFlags(langs: mine?.langs ?? []).padding(.bottom, 26)
            CardFoot(color: .white)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(PL.malachite)
    }
}

struct ObjectShareSheet: View {
    let objects: [ShareObject]
    @State private var picked: String?

    var object: ShareObject { objects.first { $0.id == picked } ?? objects[0] }

    var body: some View {
        VStack(spacing: 0) {
            if objects.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(objects) { o in
                            Button { picked = o.id } label: {
                                Text(o.chip).font(PL.text(15, .bold)).lineLimit(1)
                                    .foregroundStyle(o.id == object.id ? PL.paper : PL.ink)
                                    .padding(.horizontal, 14).padding(.vertical, 9)
                                    .background(o.id == object.id ? PL.vermilion : PL.card, in: .capsule)
                                    .overlay { Capsule().strokeBorder(o.id == object.id ? PL.vermilion : PL.paper3, lineWidth: 2) }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, 24)
            }
            ObjectShareCards(object: object).id(object.id)
        }
        .background(PL.paper.ignoresSafeArea())
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}

struct ObjectShareCards: View {
    let object: ShareObject
    @State private var picked: ShareStyle?
    @State private var copied = false

    var style: ShareStyle { picked ?? object.styles[0] }

    var body: some View {
        GeometryReader { g in
            let width = min(g.size.width - 72, (g.size.height - 190) * 0.8, 420)
            VStack(spacing: 14) {
                Text(object.sheetTitle).font(PL.text(17, .bold)).foregroundStyle(PL.ink).padding(.top, 22)
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 14) {
                        ForEach(object.styles) { s in
                            ShareCardView(object: object, style: s)
                                .scaleEffect(width / ShareCardView.size.width, anchor: .topLeading)
                                .frame(width: width, height: width * 1.25, alignment: .topLeading)
                                .clipShape(.rect(cornerRadius: PL.Radius.lg))
                                .accessibilityElement()
                                .accessibilityLabel(Text("\(object.sheetTitle), card \((object.styles.firstIndex(of: s) ?? 0) + 1)"))
                                .id(s)
                        }
                    }
                    .scrollTargetLayout()
                }
                .contentMargins(.horizontal, max(0, (g.size.width - width) / 2), for: .scrollContent)
                .scrollTargetBehavior(.viewAligned)
                .scrollPosition(id: $picked, anchor: .center)
                .frame(height: width * 1.25)
                HStack(spacing: 8) {
                    ForEach(object.styles) { s in
                        Circle().fill(s == style ? PL.vermilion : PL.inkDim.opacity(0.3)).frame(width: 8, height: 8)
                    }
                }
                .accessibilityHidden(true)
                Spacer(minLength: 0)
                HStack(spacing: 12) {
                    Button {
                        copy()
                    } label: {
                        Label(copied ? String(localized: "Copied") : String(localized: "Copy link"), systemImage: copied ? "checkmark" : "link")
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                    }
                    .buttonStyle(PLOption(align: .center))
                    send
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }
            .frame(maxWidth: .infinity)
        }
    }

    @ViewBuilder var send: some View {
        #if os(iOS)
        Button {
            guard let image = Share.renderer(object, style).uiImage else { return }
            let object = object, style = style
            ScreenShare.shared.present(object.page, image: image) { target, sent in
                Beta.shared.log("card_share", ["object": .string(object.kind), "style": .string(style.rawValue), "to": .string(target), "sent": .string(sent ? "1" : "0")])
            }
        } label: {
            Label("Share", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
        }
        .buttonStyle(D8Primary())
        #else
        if let image = Share.renderer(object, style).nsImage {
            ShareLink(item: object.page.url, subject: Text(object.text), message: Text(object.text), preview: SharePreview(object.text, image: Image(nsImage: image))) {
                Label("Share", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
            }
            .buttonStyle(D8Primary())
        }
        #endif
    }

    func copy() {
        #if os(iOS)
        UIPasteboard.general.url = object.page.url
        #else
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(object.page.url.absoluteString, forType: .string)
        #endif
        copied = true
    }
}

struct ShareOption: Identifiable {
    let title: String
    let object: ShareObject
    var id: String { object.id }

    init(_ object: ShareObject) {
        title = object.sheetTitle
        self.object = object
    }
}

struct ShareObjectButton: View {
    let options: [ShareOption]
    var wide = false
    @State private var open: ShareChoice?

    init(_ objects: ShareObject..., wide: Bool = false) {
        self.init(objects: objects, wide: wide)
    }

    init(objects: [ShareObject], wide: Bool = false) {
        options = objects.map(ShareOption.init)
        self.wide = wide
    }

    var body: some View {
        control
            .sheet(item: $open) { ObjectShareSheet(objects: $0.objects) }
            #if DEBUG
            .task {
                let args = ProcessInfo.processInfo.arguments
                guard let i = args.firstIndex(of: "-openShare"), i + 1 < args.count else { return }
                open = options.first { $0.object.kind == args[i + 1] }.map { ShareChoice(objects: [$0.object]) }
            }
            #endif
    }

    @ViewBuilder var control: some View {
        if wide, let first = options.first {
            Button { open = ShareChoice(objects: options.map(\.object)) } label: {
                Label(first.title, systemImage: "square.and.arrow.up")
            }
            .buttonStyle(PLOption(align: .center))
        } else if let first = options.first {
            Button { open = ShareChoice(objects: options.map(\.object)) } label: { icon }
                .buttonStyle(.borderless)
                .accessibilityLabel(Text(first.title))
        }
    }

    var icon: some View {
        PLGlyphView(.share, size: 20)
    }
}

struct ShareMenu: ViewModifier {
    let object: ShareObject?
    @State private var open: ShareObject?

    func body(content: Content) -> some View {
        content
            .contextMenu {
                if let object {
                    Button(object.sheetTitle, systemImage: "square.and.arrow.up") { open = object }
                }
            }
            .sheet(item: $open) { ObjectShareSheet(objects: [$0]) }
    }
}

extension View {
    func shareMenu(_ object: ShareObject?) -> some View { modifier(ShareMenu(object: object)) }
}

struct ShareObjectsTag: ViewModifier {
    let objects: [ShareObject]
    @State private var id = UUID()

    func body(content: Content) -> some View {
        content
            .onAppear { ScreenShare.shared.pushObjects(id, objects) }
            .onChange(of: objects) { _, o in ScreenShare.shared.pushObjects(id, o) }
            .onDisappear { ScreenShare.shared.removeObjects(id) }
    }
}

extension View {
    func shareObjects(_ objects: [ShareObject]) -> some View { modifier(ShareObjectsTag(objects: objects)) }
}

struct ScreenShareButton: View {
    @Environment(LangStore.self) private var store

    var body: some View {
        #if os(iOS)
        Button { ScreenShare.shared.offer(store.shareables) } label: { PLGlyphView(.share, size: 20) }
            .tint(PL.ink)
            .accessibilityLabel(Text("Share"))
            .accessibilityIdentifier("screenShare")
        #endif
    }
}

struct ScreenshotShare: ViewModifier {
    @Environment(LangStore.self) private var store

    func body(content: Content) -> some View {
        #if os(iOS)
        content
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.userDidTakeScreenshotNotification)) { _ in
                ScreenShare.shared.offerAfterScreenshot(store.shareables)
            }
            #if DEBUG
            .task {
                guard ProcessInfo.processInfo.arguments.contains("-offerShare") else { return }
                try? await Task.sleep(for: .seconds(5))
                ScreenShare.shared.offer(store.shareables)
            }
            #endif
        #else
        content
        #endif
    }
}
