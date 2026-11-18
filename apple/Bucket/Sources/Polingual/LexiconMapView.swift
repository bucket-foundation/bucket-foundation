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
        case .unseen: D8.disabled
        case .started: D8.pickedFace
        case .known: D8.lapis
        case .mastered: D8.malachite
        }
    }
}

extension LangStore {
    func lexiconMap(now: Double = Date().timeIntervalSince1970 * 1000) -> LexiconMap? {
        guard let corpus else { return nil }
        return LexiconMap(root: systems.first?.root ?? "en", learning: systems.map { ($0, state($0.id)) }, corpus: corpus, now: now)
    }

    func lexiconShares(_ map: LexiconMap, first lang: String? = nil) -> [ShareObject] {
        let learning = map.languages.filter(\.learning).map(\.lang)
        let mastered = masteredShares(root: map.root, first: lang)
        if let lang { return mastered.isEmpty || map.language(lang)?.counts.mastered == 0 ? [.language(lang, root: map.root)] : mastered }
        return mastered + systems.map { .system(name: $0.name, root: $0.root, targets: $0.targets, streak: Int(state($0.id).streak), learned: map.counts.seen) } + learning.map { .language($0, root: map.root) }
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
                Text(verbatim: "\(Int((counts.share * 100).rounded()))%").font(D8.word(size * 0.24)).foregroundStyle(Palette.ink)
                Text(verbatim: "\(counts.learned)").font(D8.caps(size * 0.1)).foregroundStyle(Palette.muted)
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
                    RoundedRectangle(cornerRadius: 3).fill(s.tint).overlay { RoundedRectangle(cornerRadius: 3).strokeBorder(D8.edge, lineWidth: 1) }.frame(width: 12, height: 12)
                    Text(verbatim: "\(s.label) \(counts[s])")
                }
                .accessibilityElement(children: .combine)
            }
        }
        .font(.caption)
        .foregroundStyle(Palette.muted)
        .monospacedDigit()
    }
}

struct LexiconSummary: View {
    let counts: LexiconCounts
    let finish: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(counts.learned) of \(counts.total) words learned").font(.headline).foregroundStyle(Palette.ink)
            Text("\(counts.left) words left").font(.subheadline).foregroundStyle(Palette.muted)
            if let finish {
                let month = Date(timeIntervalSince1970: finish / 1000).formatted(.dateTime.month(.wide).year().locale(InterfaceLanguage.locale))
                Text("At your pace you finish in \(month).").noticeStyle()
            } else if counts.left > 0 {
                Text("Learn a new word to set your finish date.").noticeStyle()
            }
        }
        .monospacedDigit()
        .fixedSize(horizontal: false, vertical: true)
    }
}

struct LexiconMapSection: View {
    @Environment(LangStore.self) private var store
    @State private var map: LexiconMap?

    var body: some View {
        Section {
            if let map {
                NavigationLink {
                    LexiconMapView()
                } label: {
                    HStack(spacing: 14) {
                        LexiconRing(counts: map.counts, size: 84)
                        LexiconSummary(counts: map.counts, finish: map.finish(now: Date().timeIntervalSince1970 * 1000))
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
        .task(id: store.status) {
            await store.load()
            map = store.lexiconMap()
        }
    }
}

struct LexiconMapView: View {
    @Environment(LangStore.self) private var store
    @State private var map: LexiconMap?

    var body: some View {
        Group {
            if let map {
                content(map)
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle("Lexicon map")
        .inlineTitle()
        .toolbar {
            if let map {
                ToolbarItem(placement: .primaryAction) { ShareObjectButton(objects: store.lexiconShares(map)) }
            }
        }
        .task(id: store.status) {
            await store.load()
            map = store.lexiconMap()
        }
    }

    func content(_ map: LexiconMap) -> some View {
        let learning = map.languages.filter(\.learning)
        let rest = map.languages.filter { !$0.learning }
        return List {
            Section {
                VStack(spacing: 12) {
                    LexiconRing(counts: map.counts, size: 160)
                    LexiconSummary(counts: map.counts, finish: map.finish(now: Date().timeIntervalSince1970 * 1000))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    LexiconLegend(counts: map.counts)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.vertical, 6)
            }
            .listRowBackground(Palette.card)
            if !learning.isEmpty {
                Section {
                    ForEach(learning) { row($0, map) }
                } header: {
                    Eyebrow(text: "Your languages")
                }
                .listRowBackground(Palette.card)
            }
            if !rest.isEmpty {
                Section {
                    ForEach(rest) { row($0, map) }
                } header: {
                    Eyebrow(text: "More languages")
                }
                .listRowBackground(Palette.card)
            }
        }
    }

    func row(_ l: LexiconLanguage, _ map: LexiconMap) -> some View {
        NavigationLink {
            LexiconLanguageView(lang: l.lang)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    FlagTile(lang: l.lang, size: 26)
                    Text(langName(l.lang)).font(.headline).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("\(l.counts.left) left").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
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
    @State private var language: LexiconLanguage?
    @State private var root = "en"
    @State private var shares: [ShareObject] = []
    @State private var picked: LexiconWord?

    var body: some View {
        Group {
            if let language {
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
        .task(id: store.status) {
            await store.load()
            guard let map = store.lexiconMap() else { return }
            language = map.language(lang)
            root = map.root
            shares = store.lexiconShares(map, first: lang)
        }
    }

    func content(_ l: LexiconLanguage) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 14) {
                        LexiconRing(counts: l.counts, size: 84)
                        LexiconSummary(counts: l.counts, finish: l.finish(now: Date().timeIntervalSince1970 * 1000))
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
                            Text("\(g.counts.learned) of \(g.counts.total)").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                        }
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 30, maximum: 40), spacing: 5)], spacing: 5) {
                            ForEach(g.words) { tile($0) }
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    func tile(_ w: LexiconWord) -> some View {
        let on = picked?.id == w.id
        return Button {
            picked = w
            if LangVoice.shared.canSpeak(w.form, w.lang) { LangVoice.shared.speak(w.form, w.lang) }
        } label: {
            RoundedRectangle(cornerRadius: 6)
                .fill(w.state.tint)
                .overlay { RoundedRectangle(cornerRadius: 6).strokeBorder(on ? D8.ink : D8.edge, lineWidth: on ? 3 : 1) }
                .aspectRatio(1, contentMode: .fit)
        }
        .buttonStyle(TilePress())
        .accessibilityLabel(Text(verbatim: "\(w.form), \(w.meaning), \(w.state.label)"))
        .accessibilityHint("Plays the word")
    }

    func detail(_ w: LexiconWord) -> some View {
        VStack(spacing: 8) {
            WideTile(word: w.form, lang: w.lang, reading: w.reading, state: w.state == .mastered ? .right : .plain)
            HStack(spacing: 8) {
                Text(verbatim: w.meaning).font(.headline).foregroundStyle(D8.ink)
                Spacer()
                Text(verbatim: w.state.label).font(D8.caps(11)).tracking(0.9).foregroundStyle(D8.label)
                Button { picked = nil } label: { PLGlyphView(.close, size: 16).frame(width: 44, height: 44) }
                    .buttonStyle(.borderless)
                    .tint(D8.ink)
                    .accessibilityLabel(Text("Close"))
            }
        }
        .todayCard()
        .padding(.horizontal, 16)
        .shareMenu(.tile(form: ShareForm(lang: w.lang, form: w.form), gloss: w.meaning, reading: readingText(w.reading)))
    }
}
