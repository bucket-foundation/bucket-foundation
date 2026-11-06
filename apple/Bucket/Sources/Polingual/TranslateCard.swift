import BucketKit
import SwiftUI

enum WantedWords {
    static func key(_ systemId: String) -> String { "wanted.\(systemId)" }

    static func list(_ systemId: String) -> [String] { UserDefaults.standard.stringArray(forKey: key(systemId)) ?? [] }

    static func add(_ itemId: String, to systemId: String) {
        let now = list(systemId)
        guard !now.contains(itemId) else { return }
        UserDefaults.standard.set(Array((now + [itemId]).suffix(40)), forKey: key(systemId))
    }

    static func take(_ systemId: String, carded: (String) -> Bool, limit: Int = 2) -> [String] {
        let pending = list(systemId).filter { !carded($0) }
        let picked = Array(pending.prefix(limit))
        UserDefaults.standard.set(Array(pending.dropFirst(limit)), forKey: key(systemId))
        return picked
    }
}

struct TranslateCard: View {
    @Environment(LangStore.self) private var store
    @State private var query = TranslateCard.debugQuery
    @State private var picked: String?
    @State private var added: Set<String> = []
    @State private var from: String?
    @State private var sources: [String] = []
    @State private var listening = false
    @State private var missedVoice = false
    @State private var answer: TranslateAnswer?
    @State private var answerFor = ""
    @FocusState private var focused: Bool

    nonisolated static let lexicons = LexiconShelf()

    static var debugQuery: String {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-translate"), i + 1 < args.count { return args[i + 1] }
        #endif
        return ""
    }

    var langs: [String] {
        var out: [String] = []
        for s in store.systems {
            for l in [s.root] + s.targets where !out.contains(l) { out.append(l) }
        }
        return out
    }

    var shown: [String] {
        guard let from, !langs.contains(from) else { return langs }
        return [from] + langs
    }

    var listenLang: String { from ?? store.systems.first?.root ?? "en" }

    var body: some View {
        if let corpus = store.corpus, !store.systems.isEmpty {
            let searchIn: Set<String> = from.map { [$0] } ?? Set(langs)
            let hits = translateSearch(corpus, query, langs: searchIn, limit: 6)
            let guess = from ?? SentenceLanguage.detect(query, among: sources.isEmpty ? langs : sources) ?? store.systems.first?.root ?? "en"
            let answer = answerFor == query ? answer : nil
            let found = answer.map { $0.layer != .gloss } ?? false
            let sentence = !query.isEmpty && picked == nil && !found && (SentenceLanguage.isSentence(query) || hits.isEmpty)
            let sentenceSource = answer?.source ?? guess
            let detected = from == nil && !query.isEmpty ? (sentence ? sentenceSource : answer?.source ?? hits.first?.matchedLang) : nil
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Menu {
                        Button { from = nil } label: { Label("Detect language", systemImage: from == nil ? "checkmark" : "sparkle.magnifyingglass") }
                        Divider()
                        ForEach(sources, id: \.self) { l in
                            Button { from = l } label: {
                                if from == l { Label(Lang.name(l), systemImage: "checkmark") } else { Text(Lang.name(l)) }
                            }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            if let from { FlagTile(lang: from, size: 22) } else { Image(systemName: "sparkle.magnifyingglass").font(.system(size: 18, weight: .semibold)) }
                            Text(from.map(Lang.name) ?? String(localized: "Detect language"))
                                .font(.system(size: 17, weight: .bold, design: .rounded))
                            Image(systemName: "chevron.down").font(.system(size: 13, weight: .bold))
                        }
                        .foregroundStyle(Palette.ink)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 40)
                        .background(D8.face, in: .capsule)
                        .overlay { Capsule().strokeBorder(D8.edge, lineWidth: 2) }
                    }
                    .accessibilityLabel(from.map { String(localized: "Translate from \(Lang.name($0))") } ?? String(localized: "Detect language"))
                    if let detected {
                        Text("Detected: \(Lang.name(detected))")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(Palette.muted)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                HStack(spacing: 10) {
                    Image(systemName: "character.bubble.fill").font(.system(size: 22)).foregroundStyle(D8.lapis)
                    TextField("Translate a word", text: $query, prompt: Text("Translate a word").foregroundStyle(D8.label))
                        .font(.system(size: 21, weight: .semibold, design: .rounded))
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .focused($focused)
                        .onSubmit { if let id = picked ?? hits.first?.itemId { add(id, corpus) } }
                    if !query.isEmpty {
                        Button { query = "" } label: { Image(systemName: "xmark.circle.fill").font(.system(size: 20)).foregroundStyle(Palette.muted) }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Clear")
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 60)
                .background(D8.face, in: .rect(cornerRadius: 14))
                .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(D8.edge, lineWidth: 2) }
                if LangListener.shared.supported {
                    Button { if listening { LangListener.shared.stop() } else { Task { await listen() } } } label: {
                        HStack(spacing: 12) {
                            Image(systemName: listening ? "stop.fill" : "mic.fill")
                                .font(.system(size: 30, weight: .bold))
                                .symbolEffect(.variableColor.iterative, isActive: listening)
                            Text(listening ? String(localized: "Stop") : String(localized: "Tap and speak")).font(D8.word(21))
                        }
                        .foregroundStyle(D8.parchment)
                        .frame(maxWidth: .infinity, minHeight: 84)
                        .modifier(GameLip(face: D8.vermilion, lip: D8.vermilionLip))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(listening ? String(localized: "Stop") : String(localized: "Say a word in \(Lang.name(listenLang))"))
                }
                if listening {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Listening in \(Lang.name(listenLang))…").font(.subheadline.weight(.semibold)).foregroundStyle(D8.vermilion)
                        if !LangListener.shared.live.isEmpty {
                            Text(LangListener.shared.live).font(.system(size: 20, weight: .semibold, design: .rounded)).foregroundStyle(Palette.ink)
                        }
                    }
                } else if missedVoice {
                    Text("Didn't catch that. Tap the mic and try again.").font(.subheadline).foregroundStyle(Palette.muted)
                }
                if sentence {
                    SentenceTranslations(text: query, source: sentenceSource, targets: shown.filter { $0 != sentenceSource }, fallback: answer?.rows ?? [:])
                } else if picked == nil, let answer, answer.layer != .deck {
                    LexiconAnswerView(answer: answer, shown: shown)
                } else if !query.isEmpty {
                    if let id = picked ?? answer?.itemId ?? hits.first?.itemId, let item = corpus.byId[id] {
                        ForEach(shown, id: \.self) { l in
                            if let f = item.form(l) {
                                HStack(spacing: 10) {
                                    FlagTile(lang: l, size: 26)
                                    Text(f).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                                        .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                                    Spacer(minLength: 4)
                                    PlayButton(text: f, lang: l)
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                        HStack(spacing: 10) {
                            if added.contains(id) {
                                Label("Added to your next session", systemImage: "checkmark.circle.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(D8.malachite)
                            } else {
                                Button("Add to my deck") { add(id, corpus) }
                                    .buttonStyle(D8Option(align: .center, compact: true))
                            }
                            let words = shown.compactMap { l in item.form(l).map { (lang: l, form: $0) } }
                            ShareObjectButton(.word(id: id, gloss: query, forms: words.map { ShareForm(lang: $0.lang, form: $0.form) }))
                            Color.clear.frame(width: 0, height: 0).sharePage(.word(id: id, gloss: query, forms: words))
                        }
                        let seen = Set(shown.compactMap { item.form($0).map(foldForSearch) })
                        let similar = hits.filter { h in h.itemId != id && !seen.contains(foldForSearch(corpus.byId[h.itemId]?.form(h.matchedLang) ?? "")) }
                        if !similar.isEmpty {
                            Text("Similar").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(similar, id: \.itemId) { h in
                                        if let f = corpus.byId[h.itemId]?.form(h.matchedLang) {
                                            Chip(title: f, langs: [h.matchedLang], on: false) { picked = h.itemId }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        Text("Not in your languages yet. Try the word in another language you know.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                }
            }
            .padding(.vertical, 6)
            .onChange(of: query) { picked = nil }
            .onChange(of: from) { picked = nil }
            .task(id: langs) { sources = translateSources(corpus, mine: langs) }
            .task(id: answerKey) { await refresh(corpus, guess: guess) }
            .onChange(of: DeepLink.shared.listen, initial: true) { _, on in
                guard on else { return }
                DeepLink.shared.listen = false
                Task { await listen() }
            }
            .onChange(of: DeepLink.shared.pending, initial: true) { _, link in
                if link == .voice { DeepLink.shared.pending = nil }
            }
            .onChange(of: DeepLink.shared.translate, initial: true) { _, q in
                guard let q else { return }
                query = q
                DeepLink.shared.translate = nil
                DeepLink.shared.pending = nil
            }
        }
    }

    var answerKey: String { "\(query)|\(from ?? "")|\(shown.joined(separator: ","))" }

    func refresh(_ corpus: LangCorpus, guess: String) async {
        let q = query
        guard !q.isEmpty else {
            answer = nil
            answerFor = q
            return
        }
        try? await Task.sleep(for: .milliseconds(180))
        guard !Task.isCancelled else { return }
        let order = from.map { [$0] } ?? ([guess] + langs.filter { $0 != guess })
        let targets = shown
        let result = await Task.detached(priority: .userInitiated) {
            TranslateEngine.answer(q, from: order, to: targets, corpus: corpus, shelf: TranslateCard.lexicons)
        }.value
        guard !Task.isCancelled, q == query else { return }
        answer = result
        answerFor = q
    }

    func listen() async {
        missedVoice = false
        listening = true
        let heard = await LangListener.shared.listenOnce(listenLang, limit: LangListener.maxSentence)
        listening = false
        guard let first = heard.first, !first.isEmpty else {
            missedVoice = true
            return
        }
        query = first
        haptic(true)
    }

    func add(_ itemId: String, _ corpus: LangCorpus) {
        guard let item = corpus.byId[itemId] else { return }
        for s in store.systems where s.targets.contains(where: { item.form($0) != nil }) {
            let state = store.state(s.id)
            let carded = s.targets.contains { state.cards.has(cardId($0, itemId)) }
            if !carded { WantedWords.add(itemId, to: s.id) }
        }
        added.insert(itemId)
        haptic(true)
    }
}


struct LexiconAnswerView: View {
    let answer: TranslateAnswer
    let shown: [String]

    var note: String? {
        switch answer.layer {
        case .form: String(localized: "Form of \(answer.headword)")
        case .roman: String(localized: "Read as \(answer.headword)")
        case .gloss: String(localized: "Word by word")
        default: nil
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let note {
                Text(note).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted)
            }
            ForEach([answer.source] + shown.filter { $0 != answer.source }, id: \.self) { l in
                if let f = l == answer.source ? answer.headword : answer.rows[l] {
                    HStack(spacing: 10) {
                        FlagTile(lang: l, size: 26)
                        Text(f).font(.system(size: 18, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink)
                            .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                            .textSelection(.enabled)
                        Spacer(minLength: 4)
                        PlayButton(text: f, lang: l)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            TranslateCredit()
        }
    }
}

struct TranslateCredit: View {
    var body: some View {
        Text("Dictionary: Wiktionary, CC BY-SA. Sentences: Tatoeba, CC BY.").font(.caption2).foregroundStyle(Palette.muted)
    }
}
