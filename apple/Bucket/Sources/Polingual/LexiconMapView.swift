import BucketKit
import SwiftUI

extension LexiconWordState {
    var label: String {
        switch self {
        case .unseen: String(localized: "Unseen")
        case .started: String(localized: "Started")
        case .known: String(localized: "Known")
        case .mastered: String(localized: "Mastered")
        }
    }

    var tint: Color {
        switch self {
        case .unseen: PL.paper2
        case .started: PL.lapisSoft
        case .known: PL.lapis
        case .mastered: PL.malachite
        }
    }
}

@MainActor
@Observable
final class LexiconMapCache {
    static let shared = LexiconMapCache()
    private(set) var map: LexiconMap?
    private(set) var version = 0
    private var systems: [LangSystem] = []
    private var states: [String: EngineState] = [:]
    private var day = ""
    private var run = 0

    func refresh(_ store: LangStore) async {
        guard let corpus = store.corpus else { return }
        let now = Date().timeIntervalSince1970 * 1000
        let today = dayKey(now)
        let systems = store.systems
        let states = store.states
        if map != nil, systems == self.systems, states == self.states, today == day { return }
        self.systems = systems
        self.states = states
        day = today
        run += 1
        let mine = run
        let learning = systems.map { (system: $0, state: states[$0.id] ?? EngineState()) }
        let root = systems.first?.root ?? "en"
        let built = await Task.detached(priority: .userInitiated) { LexiconMap(root: root, learning: learning, corpus: corpus, now: now) }.value
        guard mine == run else { return }
        map = built
        version += 1
    }
}

struct LexiconMapFresh: ViewModifier {
    @Environment(LangStore.self) private var store

    func body(content: Content) -> some View {
        content
            .task(id: store.status) {
                await store.load()
                await LexiconMapCache.shared.refresh(store)
            }
            .onChange(of: store.states) { Task { await LexiconMapCache.shared.refresh(store) } }
            .onChange(of: store.systems) { Task { await LexiconMapCache.shared.refresh(store) } }
    }
}

extension LangStore {
    func lexiconShares(_ map: LexiconMap, first lang: String? = nil) -> [ShareObject] {
        let mastered = masteredShares(root: map.root, first: lang)
        if let lang { return mastered.isEmpty || map.language(lang)?.counts.mastered == 0 ? [.language(lang, root: map.root)] : mastered }
        return mastered + systems.map { .system(name: $0.name, root: $0.root, targets: $0.targets, streak: Int(state($0.id).streak), learned: map.counts.seen) } + map.learning.map { .language($0.lang, root: map.root) }
    }
}

struct LexiconMark: View {
    let state: LexiconWordState
    var size: CGFloat = 12

    var body: some View {
        switch state {
        case .unseen: EmptyView()
        case .started: Circle().fill(PL.ink).frame(width: size * 0.3, height: size * 0.3)
        case .known:
            HStack(spacing: size * 0.14) {
                Circle().fill(PL.paper).frame(width: size * 0.3, height: size * 0.3)
                Circle().fill(PL.paper).frame(width: size * 0.3, height: size * 0.3)
            }
        case .mastered: PLGlyphView(.check, size: size * 0.7).foregroundStyle(PL.paper)
        }
    }
}

struct LexiconSwatch: View {
    let state: LexiconWordState
    var on = false

    var body: some View {
        GeometryReader { g in
            RoundedRectangle(cornerRadius: g.size.width * 0.18)
                .fill(state.tint)
                .overlay { RoundedRectangle(cornerRadius: g.size.width * 0.18).strokeBorder(on ? PL.ink : PL.paper3, lineWidth: on ? 3 : 1) }
                .overlay { LexiconMark(state: state, size: g.size.width) }
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

struct LexiconRing: View {
    let counts: LexiconCounts
    var size: CGFloat = 120

    var body: some View {
        let width = size * 0.12
        let mastered = counts.share(.mastered)
        let known = mastered + counts.share(.known)
        let started = known + counts.share(.started)
        ZStack {
            Circle().stroke(LexiconWordState.unseen.tint, lineWidth: width)
            arc(started, .started, width)
            arc(known, .known, width)
            arc(mastered, .mastered, width)
            VStack(spacing: 0) {
                Text(verbatim: "\(Int((counts.share * 100).rounded()))%").font(PL.wordFont(size * 0.24)).foregroundStyle(PL.ink)
                Text(verbatim: "\(counts.learned)").font(PL.capsFont(size * 0.1)).foregroundStyle(PL.inkDim)
            }
            .monospacedDigit()
        }
        .padding(width / 2)
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel("\(counts.learned) of \(counts.total) words learned")
    }

    func arc(_ to: Double, _ state: LexiconWordState, _ width: CGFloat) -> some View {
        Circle().trim(from: 0, to: to).stroke(state.tint, style: StrokeStyle(lineWidth: width, lineCap: .butt)).rotationEffect(.degrees(-90))
    }
}

struct LexiconBar: View {
    let counts: LexiconCounts

    var body: some View {
        let mastered = counts.share(.mastered)
        let known = mastered + counts.share(.known)
        let started = known + counts.share(.started)
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(LexiconWordState.unseen.tint)
                Capsule().fill(LexiconWordState.started.tint).frame(width: g.size.width * started)
                Capsule().fill(LexiconWordState.known.tint).frame(width: g.size.width * known)
                Capsule().fill(LexiconWordState.mastered.tint).frame(width: g.size.width * mastered)
            }
        }
        .frame(height: 8)
    }
}

struct LexiconLegend: View {
    let counts: LexiconCounts

    var body: some View {
        FlowLayout(spacing: 12) {
            ForEach(LexiconWordState.allCases.reversed(), id: \.self) { s in
                HStack(spacing: 5) {
                    LexiconSwatch(state: s).frame(width: 18, height: 18)
                    Text(verbatim: "\(s.label) \(counts[s])")
                }
                .accessibilityElement(children: .combine)
            }
        }
        .font(PL.text(12))
        .foregroundStyle(PL.inkDim)
        .monospacedDigit()
    }
}

struct LexiconSummary: View {
    let counts: LexiconCounts
    let finish: Double?
    let pace: Double
    var learning = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if counts.total == 0 {
                Text("Pick the languages to learn together.").font(PL.text(15)).foregroundStyle(PL.inkDim)
            } else {
                Text("\(counts.learned) of \(counts.total) words learned").font(PL.text(17, .bold)).foregroundStyle(PL.ink)
                Text(counts.left == 1 ? String(localized: "1 word left") : String(localized: "\(counts.left) words left")).font(PL.text(15)).foregroundStyle(PL.inkDim)
                if let finish {
                    let month = Date(timeIntervalSince1970: finish / 1000).formatted(.dateTime.month(.wide).year().locale(InterfaceLanguage.locale))
                    Text("At your pace you finish in \(month).").noticeStyle()
                } else if counts.left > 0, let pace = LexiconPace(pace) {
                    Text(Self.text(pace)).noticeStyle()
                } else if counts.left > 0, learning {
                    Text("Learn a new word to set your finish date.").noticeStyle()
                }
            }
        }
        .monospacedDigit()
        .fixedSize(horizontal: false, vertical: true)
    }

    static func text(_ pace: LexiconPace) -> String {
        switch pace {
        case .day(1): String(localized: "1 word a day")
        case .day(let n): String(localized: "\(n) words a day")
        case .week(1): String(localized: "1 word a week")
        case .week(let n): String(localized: "\(n) words a week")
        }
    }
}

struct LexiconMapSection: View {
    @State private var cache = LexiconMapCache.shared

    var body: some View {
        Section {
            if let map = cache.map {
                NavigationLink {
                    LexiconMapView()
                } label: {
                    HStack(spacing: 14) {
                        LexiconRing(counts: map.counts, size: 84)
                        LexiconSummary(counts: map.counts, finish: map.finish(now: Date().timeIntervalSince1970 * 1000), pace: map.pace)
                    }
                    .padding(.vertical, 4)
                }
                .accessibilityIdentifier("lexiconMap")
            } else {
                ProgressView()
            }
        } header: {
            Eyebrow(text: "Lexicon map")
        }
        .modifier(LexiconMapFresh())
    }
}

struct LexiconMapView: View {
    @Environment(LangStore.self) private var store
    @State private var cache = LexiconMapCache.shared
    @State private var shares: [ShareObject] = []

    var body: some View {
        Group {
            if let map = cache.map {
                content(map)
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle("Lexicon map")
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .primaryAction) { ShareObjectButton(objects: shares) }
        }
        .modifier(LexiconMapFresh())
        .task(id: cache.version) { shares = cache.map.map { store.lexiconShares($0) } ?? [] }
    }

    func content(_ map: LexiconMap) -> some View {
        List {
            Section {
                VStack(spacing: 12) {
                    LexiconRing(counts: map.counts, size: 160)
                    LexiconSummary(counts: map.counts, finish: map.finish(now: Date().timeIntervalSince1970 * 1000), pace: map.pace)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    LexiconLegend(counts: map.counts)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.vertical, 6)
            }
            .listRowBackground(PL.card)
            if !map.learning.isEmpty {
                Section {
                    ForEach(map.learning) { row($0) }
                } header: {
                    Eyebrow(text: "Your languages")
                }
                .listRowBackground(PL.card)
            }
            if !map.others.isEmpty {
                Section {
                    ForEach(map.others) { row($0) }
                } header: {
                    Eyebrow(text: "More languages")
                }
                .listRowBackground(PL.card)
            }
        }
    }

    func row(_ l: LexiconLanguage) -> some View {
        NavigationLink {
            LexiconLanguageView(lang: l.lang)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    FlagTile(lang: l.lang, size: 26)
                    Text(langName(l.lang)).font(PL.text(17, .bold)).foregroundStyle(PL.ink)
                    Spacer()
                    Text(l.counts.left == 1 ? String(localized: "1 left") : String(localized: "\(l.counts.left) left")).font(PL.text(12)).foregroundStyle(PL.inkDim).monospacedDigit()
                }
                LexiconBar(counts: l.counts)
            }
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        }
    }
}

struct LexiconLanguageView: View {
    @Environment(LangStore.self) private var store
    let lang: String
    @State private var cache = LexiconMapCache.shared
    @State private var shares: [ShareObject] = []
    @State private var picked: LexiconWord?

    var body: some View {
        Group {
            if let language = cache.map?.language(lang) {
                content(language)
            } else {
                ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .paper()
        .navigationTitle(langName(lang))
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .primaryAction) { ShareObjectButton(objects: shares) }
        }
        .safeAreaInset(edge: .bottom) {
            if let picked { detail(picked) }
        }
        .modifier(LexiconMapFresh())
        .task(id: cache.version) { shares = cache.map.map { store.lexiconShares($0, first: lang) } ?? [] }
    }

    func content(_ l: LexiconLanguage) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 14) {
                        LexiconRing(counts: l.counts, size: 84)
                        LexiconSummary(counts: l.counts, finish: l.finish(now: Date().timeIntervalSince1970 * 1000), pace: l.pace, learning: l.learning)
                    }
                    LexiconLegend(counts: l.counts)
                    Text("Tap a tile to hear the word.").noticeStyle()
                }
                .todayCard()
                ForEach(l.groups) { g in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .firstTextBaseline) {
                            Eyebrow(text: g.title)
                            Spacer()
                            Text("\(g.counts.learned) of \(g.counts.total)").font(PL.text(12)).foregroundStyle(PL.inkDim).monospacedDigit()
                        }
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 44, maximum: 56), spacing: 0)], spacing: 0) {
                            ForEach(g.words) { tile($0) }
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    func tile(_ w: LexiconWord) -> some View {
        Button {
            picked = w
            if LangVoice.shared.canSpeak(w.form, w.lang) { LangVoice.shared.speak(w.form, w.lang) }
        } label: {
            LexiconSwatch(state: w.state, on: picked?.id == w.id)
                .padding(2)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(.rect)
        }
        .buttonStyle(TilePress())
        .accessibilityLabel(Text(verbatim: "\(w.form), \(w.meaning), \(w.state.label)"))
        .accessibilityHint("Plays the word")
    }

    func detail(_ w: LexiconWord) -> some View {
        VStack(spacing: 8) {
            WideTile(word: w.form, lang: w.lang, reading: w.reading, state: w.state == .mastered ? .right : .plain)
            HStack(spacing: 8) {
                Text(verbatim: w.meaning).font(PL.text(17, .bold)).foregroundStyle(PL.ink)
                Spacer()
                Text(verbatim: w.state.label).font(PL.capsFont(11)).tracking(0.9).foregroundStyle(PL.inkDim)
                Button { picked = nil } label: { PLGlyphView(.close, size: 16).frame(width: 44, height: 44) }
                    .buttonStyle(.borderless)
                    .tint(PL.ink)
                    .accessibilityLabel(Text("Close"))
            }
        }
        .todayCard()
        .padding(.horizontal, 16)
        .shareMenu(.tile(form: ShareForm(lang: w.lang, form: w.form), gloss: w.meaning, reading: readingText(w.reading)))
    }
}
