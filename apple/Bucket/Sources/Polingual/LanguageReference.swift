import BucketKit
import SwiftUI

enum ReferenceTab: String, CaseIterable {
    case words, sounds, writing

    var title: String {
        switch self {
        case .words: String(localized: "Words")
        case .sounds: String(localized: "Sounds")
        case .writing: String(localized: "Writing")
        }
    }
}

func referenceText(_ key: String) -> String { String(localized: String.LocalizationValue(key)) }

struct LanguageReference: View {
    @Environment(LangStore.self) private var store
    let lang: String
    @State private var tab = Self.launchTab
    @State private var query = ""
    @State private var words: [WordDetail] = []

    static var launchTab: ReferenceTab {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-referenceTab"), i + 1 < args.count, let t = ReferenceTab(rawValue: args[i + 1]) { return t }
        #endif
        return .words
    }

    var body: some View {
        List {
            Section {
                Picker("Reference", selection: $tab) {
                    ForEach(ReferenceTab.allCases, id: \.self) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            switch tab {
            case .words: wordRows
            case .sounds: ForEach(LangReference.soundSections(lang)) { SoundGrid(section: $0, lang: lang) }
            case .writing: WritingRows(lang: lang)
            }
        }
        .paper()
        .navigationTitle(langName(lang))
        .inlineTitle()
        .searchable(text: $query, prompt: Text("Search words"))
        .navigationDestination(for: WordDetail.self) { WordFactsView(detail: $0) }
        .task {
            await store.load()
            words = LangReference.words(lang, corpus: store.corpus, top: LangStore.topWords(lang) ?? [])
        }
    }

    @ViewBuilder var wordRows: some View {
        let shown = LangReference.filter(words, query: query)
        Section {
            ForEach(shown) { w in
                NavigationLink(value: w) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(w.word).font(.headline).foregroundStyle(Palette.ink)
                        if let g = w.gloss { Text(g).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1) }
                    }
                }
            }
            if shown.isEmpty, !words.isEmpty { Text("No words match.").foregroundStyle(Palette.muted) }
        } header: {
            Eyebrow(text: String(localized: "Words · \(shown.count)"))
        }
        .listRowBackground(Palette.card)
    }
}

struct SoundGrid: View {
    let section: SoundSection
    let lang: String

    var body: some View {
        Section {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 88), spacing: 8)], spacing: 8) {
                ForEach(section.letters, id: \.cellId) { l in cell(l) }
            }
        } header: {
            Eyebrow(text: referenceText(section.title))
        }
        .listRowBackground(Palette.card)
    }

    func cell(_ l: Letter) -> some View {
        Button {
            if let text = LangReference.speakable(l) { LangVoice.shared.speak(text, lang) }
        } label: {
            VStack(spacing: 2) {
                Text(l.ch).font(.system(size: 26, weight: .semibold)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.5)
                Text(l.sound).font(.caption.weight(.semibold)).foregroundStyle(D8.lapis).lineLimit(1).minimumScaleFactor(0.6)
                Text(l.name ?? " ").font(.caption2).foregroundStyle(Palette.muted).lineLimit(2, reservesSpace: true).multilineTextAlignment(.center).minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel([l.ch, l.sound, l.name].compactMap { $0 }.joined(separator: ", "))
    }
}

extension Letter {
    var cellId: String { "\(ch)=\(sound)" }
}

struct WritingRows: View {
    let lang: String

    var body: some View {
        let w = LangReference.writing(lang)
        Section {
            Text(referenceText(w.title)).font(.serif(.title3, weight: .semibold))
            Text("\(w.letterCount) letters").foregroundStyle(Palette.muted)
            Text(w.rightToLeft ? String(localized: "Written right to left") : String(localized: "Written left to right")).foregroundStyle(Palette.muted)
            ForEach(w.facts, id: \.self) { Text(referenceText($0)).font(.serif(.body)) }
        } header: {
            Eyebrow(text: "Writing system")
        }
        .listRowBackground(Palette.card)
        if let unit = LangReference.characters(lang) {
            SoundGrid(section: SoundSection(title: unit.title, letters: unit.letters), lang: lang)
        }
    }
}

struct WordFactsView: View {
    @Environment(LangStore.self) private var store: LangStore?
    let detail: WordDetail

    var body: some View {
        let f = LangReference.facts(detail, corpus: store?.corpus, others: store?.gameLangs ?? [])
        List {
            Section {
                HStack(spacing: 10) {
                    FlagTile(lang: detail.lang, size: 34)
                    Text(detail.word).font(D8.word(28)).foregroundStyle(D8.ink).lineLimit(2).minimumScaleFactor(0.5)
                    Spacer(minLength: 0)
                    PlayButton(text: detail.word, lang: detail.lang)
                }
                .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
                if let r = readingText(detail.reading) { Text(r).foregroundStyle(D8.ipa) }
                if let g = detail.gloss { Text(g).font(.serif(.body)) }
                let tags = [detail.pos, detail.band].compactMap { $0 }
                if !tags.isEmpty { Text(tags.joined(separator: " · ")).font(.caption).foregroundStyle(Palette.muted) }
                if let a = f.withArticle { line("With its article", a) }
                if let r = f.root { line("Root", r) }
                if let n = f.note { Text(n).font(.subheadline).foregroundStyle(Palette.muted) }
            }
            .listRowBackground(Palette.card)
            if let ff = f.falseFriend {
                Section {
                    Text("Means \(ff.means), looks like English \(ff.looksLike)").font(.subheadline)
                } header: {
                    Eyebrow(text: "False friend")
                }
                .listRowBackground(Palette.card)
            }
            forms("Present tense", f.present)
            forms("Past tense", f.past)
            if f.example != nil || !f.sentences.isEmpty {
                Section {
                    ForEach([f.example].compactMap { $0 } + f.sentences, id: \.self) { s in
                        HStack {
                            Text(tapText(s, detail.lang)).font(.serif(.body))
                            Spacer(minLength: 0)
                            PlayButton(text: s, lang: detail.lang)
                        }
                        .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
                    }
                } header: {
                    Eyebrow(text: "In a sentence")
                }
                .listRowBackground(Palette.card)
            }
            if !f.relatives.isEmpty {
                Section {
                    ForEach(f.relatives) { r in
                        HStack(spacing: 10) {
                            FlagTile(lang: r.lang, size: 24)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(r.word).foregroundStyle(Palette.ink)
                                if let t = readingText(r.reading) { Text(t).font(.caption).foregroundStyle(Palette.muted) }
                            }
                            Spacer(minLength: 0)
                            PlayButton(text: r.word, lang: r.lang)
                        }
                    }
                } header: {
                    Eyebrow(text: "In your other languages")
                }
                .listRowBackground(Palette.card)
            }
        }
        .paper()
        .navigationTitle(detail.word)
        .inlineTitle()
        .wordTaps(reveal: true)
    }

    func line(_ label: LocalizedStringKey, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(Palette.muted)
            Spacer()
            Text(value).foregroundStyle(Palette.ink)
        }
        .font(.subheadline)
    }

    @ViewBuilder func forms(_ title: String, _ rows: [WordFacts.PersonForm]) -> some View {
        if !rows.isEmpty {
            Section {
                ForEach(rows) { line(LocalizedStringKey($0.person), $0.form) }
            } header: {
                Eyebrow(text: title)
            }
            .listRowBackground(Palette.card)
        }
    }
}
