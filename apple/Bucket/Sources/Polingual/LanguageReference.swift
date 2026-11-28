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
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                let root = store.meaningRoot(lang)
                ShareObjectButton(.language(lang, root: root), .flag(lang, root: root))
            }
        }
        .navigationDestination(for: WordDetail.self) { WordFactsView(detail: $0) }
        .task {
            await store.load()
            words = LangReference.words(lang, corpus: store.corpus, top: LangStore.topWords(lang) ?? [], root: store.meaningRoot(lang))
        }
    }

    @ViewBuilder var wordRows: some View {
        let shown = LangReference.filter(words, query: query)
        Section {
            ForEach(shown) { w in
                NavigationLink(value: w) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(w.word).font(PL.text(17, .bold)).foregroundStyle(PL.ink)
                        if let g = w.gloss {
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                if w.rootLang != "en" {
                                    Text(langName(w.rootLang).uppercased()).font(PL.text(11).monospaced()).foregroundStyle(PL.inkDim).accessibilityLabel("\(langName(w.rootLang)) meaning")
                                }
                                Text(g).font(PL.text(15)).foregroundStyle(PL.inkDim).lineLimit(1)
                            }
                        }
                    }
                }
            }
            if shown.isEmpty, !words.isEmpty { Text("No words match.").foregroundStyle(PL.inkDim) }
        } header: {
            Eyebrow(text: String(localized: "Words · \(shown.count)"))
        }
        .listRowBackground(PL.card)
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
        .listRowBackground(PL.card)
    }

    func cell(_ l: Letter) -> some View {
        Button {
            if let text = LangReference.speakable(l) { LangVoice.shared.speak(text, lang) }
        } label: {
            VStack(spacing: 2) {
                Text(l.ch).font(PL.text(26, .semibold)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.5)
                Text(l.sound).font(PL.text(12, .semibold)).foregroundStyle(PL.lapis).lineLimit(1).minimumScaleFactor(0.6)
                Text(l.name ?? " ").font(PL.text(11)).foregroundStyle(PL.inkDim).lineLimit(2, reservesSpace: true).multilineTextAlignment(.center).minimumScaleFactor(0.7)
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
            Text(referenceText(w.title)).font(PL.script(20, .semibold))
            Text("\(w.letterCount) letters").foregroundStyle(PL.inkDim)
            Text(w.rightToLeft ? String(localized: "Written right to left") : String(localized: "Written left to right")).foregroundStyle(PL.inkDim)
            ForEach(w.facts, id: \.self) { Text(referenceText($0)).font(PL.script(17, .regular)) }
        } header: {
            Eyebrow(text: "Writing system")
        }
        .listRowBackground(PL.card)
        if let unit = LangReference.characters(lang) {
            SoundGrid(section: SoundSection(title: unit.title, letters: unit.letters), lang: lang)
        }
    }
}

struct WordFactsView: View {
    @Environment(LangStore.self) private var store: LangStore?
    @Environment(\.lessonSystem) private var lessonSystem
    let detail: WordDetail
    @State private var next: WordDetail?
    @State private var web = WordWeb.empty

    var body: some View {
        let f = LangReference.facts(detail, corpus: store?.corpus, others: store?.gameLangs ?? [])
        List {
            Section {
                HStack(spacing: 10) {
                    FlagTile(lang: detail.lang, size: 34)
                    Text(detail.word).font(PL.wordFont(28)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.5)
                    Spacer(minLength: 0)
                    PlayButton(text: detail.word, lang: detail.lang)
                }
                .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
                if let r = readingText(detail.reading) { Text(r).foregroundStyle(PL.inkDim) }
                if let g = detail.gloss {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(langName(detail.rootLang).uppercased()).font(PL.text(11).monospaced()).foregroundStyle(PL.inkDim)
                        Text(g).font(PL.script(17, .regular))
                    }
                }
                let tags = [detail.pos, detail.band].compactMap { $0 }
                if !tags.isEmpty { Text(tags.joined(separator: " · ")).font(PL.text(12)).foregroundStyle(PL.inkDim) }
                if let a = f.withArticle { line("With its article", a) }
                if let r = f.root { line("Root", r) }
                if let n = f.note { Text(n).font(PL.text(15)).foregroundStyle(PL.inkDim) }
            }
            .listRowBackground(PL.card)
            if let ff = f.falseFriend {
                Section {
                    Text("Means \(ff.means), looks like English \(ff.looksLike)").font(PL.text(15))
                } header: {
                    Eyebrow(text: "False friend")
                }
                .listRowBackground(PL.card)
            }
            forms("Present tense", f.present)
            forms("Past tense", f.past)
            if f.example != nil || !f.sentences.isEmpty {
                Section {
                    ForEach([f.example].compactMap { $0 } + f.sentences, id: \.self) { s in
                        HStack {
                            Text(tapText(s, detail.lang)).font(PL.script(17, .regular))
                            Spacer(minLength: 0)
                            PlayButton(text: s, lang: detail.lang)
                        }
                        .environment(\.layoutDirection, Lang.isRTL(detail.lang) ? .rightToLeft : .leftToRight)
                    }
                } header: {
                    Eyebrow(text: "In a sentence")
                }
                .listRowBackground(PL.card)
            }
            if !web.forms.isEmpty {
                Section {
                    ForEach(web.forms) { form in
                        Button { next = form.detail } label: { formRow(form) }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("word-web-\(form.lang)")
                    }
                } header: {
                    Eyebrow(text: "In every language")
                } footer: {
                    if !web.bonds.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(Self.legend.filter { web.bonds.contains($0.bond) }, id: \.bond) { Text($0.line) }
                        }
                        .font(PL.text(12)).foregroundStyle(PL.inkDim)
                    }
                }
                .listRowBackground(PL.card)
            }
            if !web.kin.isEmpty {
                Section {
                    ForEach(web.kin) { k in
                        Button { next = k.detail } label: {
                            HStack(spacing: 10) {
                                FlagTile(lang: k.detail.lang, size: 24)
                                Text(k.word).foregroundStyle(PL.ink)
                                Spacer(minLength: 8)
                                Text(k.gloss).font(PL.text(15)).foregroundStyle(PL.inkDim).lineLimit(1)
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                } header: {
                    Eyebrow(text: web.root.map { "Same root \($0)" } ?? "Same root")
                }
                .listRowBackground(PL.card)
            }
        }
        .paper()
        .navigationTitle(detail.word)
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                let relatives = LangReference.facts(detail, corpus: store?.corpus, others: store?.gameLangs ?? []).relatives
                let gloss = detail.gloss ?? detail.word
                let own = ShareForm(lang: detail.lang, form: detail.word)
                ShareObjectButton(.word(id: detail.itemId ?? detail.word, gloss: gloss, forms: [own] + relatives.map { ShareForm(lang: $0.lang, form: $0.word) }),
                                  .tile(form: own, gloss: gloss, reading: readingText(detail.reading)))
            }
        }
        .environment(\.openURL, OpenURLAction { url in
            guard let p = WordTaps.parse(url) else { return .systemAction }
            if !LangListener.shared.active { LangVoice.shared.speak(p.word, p.lang) }
            if detail.leadsTo(p.word, lang: p.lang) {
                next = WordLookup.detail(p.word, lang: p.lang, corpus: store?.corpus, top: LangStore.topWords(p.lang) ?? [], root: store?.meaningRoot(p.lang, lesson: lessonSystem) ?? "en")
            }
            return .handled
        })
        .navigationDestination(item: $next) { WordFactsView(detail: $0) }
        .task(id: detail) {
            await WordWebLoader.load(detail, mine: store?.gameLangs ?? [], corpus: store?.corpus, all: true) { web = $0 }
        }
    }

    func formRow(_ form: WordWeb.Form) -> some View {
        HStack(spacing: 10) {
            FlagTile(lang: form.lang, size: 24)
            VStack(alignment: .leading, spacing: 1) {
                Text(form.word).foregroundStyle(PL.ink)
                Text([readingText(form.reading), "\(Lang.name(form.lang)) · \(form.script)"].compactMap { $0 }.joined(separator: "  "))
                    .font(PL.text(12)).foregroundStyle(PL.inkDim).lineLimit(1).minimumScaleFactor(0.7)
            }
            Spacer(minLength: 6)
            if let bond = form.bond {
                Text(Self.bondTitle(bond)).font(PL.text(11, .bold)).foregroundStyle(PL.tyrian)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(PL.tyrian.opacity(0.12), in: Capsule())
            }
            PlayButton(text: form.word, lang: form.lang)
        }
        .environment(\.layoutDirection, .leftToRight)
        .contentShape(Rectangle())
    }

    static func bondTitle(_ bond: WordWeb.Bond) -> LocalizedStringKey {
        switch bond {
        case .root: "Shared root"
        case .sound: "Sounds alike"
        case .spelling: "Spelled alike"
        }
    }

    static let legend: [(bond: WordWeb.Bond, line: LocalizedStringKey)] = [
        (.root, "Shared root: comes from the same older word."),
        (.sound, "Sounds alike: close pronunciation in IPA."),
        (.spelling, "Spelled alike: close spelling in Latin letters."),
    ]

    func line(_ label: LocalizedStringKey, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(PL.inkDim)
            Spacer()
            Text(value).foregroundStyle(PL.ink)
        }
        .font(PL.text(15))
    }

    @ViewBuilder func forms(_ title: String, _ rows: [WordFacts.PersonForm]) -> some View {
        if !rows.isEmpty {
            Section {
                ForEach(rows) { line(LocalizedStringKey($0.person), $0.form) }
            } header: {
                Eyebrow(text: title)
            }
            .listRowBackground(PL.card)
        }
    }
}
