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
    @Environment(\.colorScheme) private var scheme
    var today = false
    @AppStorage("translate.targets") private var targetsRaw = ""
    @State private var committed = TranslateCard.debugQuery
    @State private var query = TranslateCard.debugQuery
    @State private var picked: String?
    @State private var added: Set<String> = []
    @State private var from: String?
    @State private var sources: [String] = []
    @State private var listening = false
    @State private var missedVoice = false
    @State private var answer: TranslateAnswer?
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

    var chosen: [String] {
        let picked = targetsRaw.split(separator: ",").map(String.init).filter { !$0.isEmpty }
        return picked.isEmpty ? langs : picked
    }

    var base: [String] { today ? chosen : langs }

    var shown: [String] {
        guard let from, !base.contains(from) else { return base }
        return [from] + base
    }

    var active: String { today ? committed : query }

    func setTargets(_ list: [String]) { targetsRaw = list.joined(separator: ",") }

    func toggleTarget(_ l: String) {
        var list = chosen
        if let i = list.firstIndex(of: l) {
            guard list.count > 1 else { return }
            list.remove(at: i)
        } else {
            list.append(l)
        }
        setTargets(list)
    }

    func commit() {
        committed = query
        focused = false
    }

    var listenLang: String { from ?? store.systems.first?.root ?? "en" }

    var body: some View {
        if let corpus = store.corpus, !store.systems.isEmpty {
            let searchIn: Set<String> = from.map { [$0] } ?? Set(langs)
            let text = active
            let hits = translateSearch(corpus, text, langs: searchIn, limit: 6)
            let guess = from ?? SentenceLanguage.detect(text, among: sources.isEmpty ? langs : sources) ?? store.systems.first?.root ?? "en"
            let answer = text.isEmpty ? nil : answer
            let found = answer.map { $0.layer != .gloss } ?? false
            let sentence = !text.isEmpty && picked == nil && !found && (SentenceLanguage.isSentence(text) || hits.isEmpty)
            let sentenceSource = answer?.source ?? guess
            let detected = from == nil && !text.isEmpty ? (sentence ? sentenceSource : answer?.source ?? hits.first?.matchedLang) : nil
            let card = VStack(alignment: .leading, spacing: 12) {
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
                                .lineLimit(1)
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
                if today { targetRow }
                HStack(spacing: 10) {
                    Image(systemName: "character.bubble.fill").font(.system(size: 22)).foregroundStyle(D8.lapis)
                    TextField("Translate a word", text: $query, prompt: Text("Translate a word").foregroundStyle(today ? Palette.muted : D8.label))
                        .font(.system(size: 21, weight: .semibold, design: .rounded))
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .focused($focused)
                        .onSubmit {
                            if today { commit() } else if let id = picked ?? hits.first?.itemId { add(id, corpus) }
                        }
                    if !query.isEmpty {
                        Button { query = ""; committed = "" } label: { Image(systemName: "xmark.circle.fill").font(.system(size: 20)).foregroundStyle(Palette.muted) }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Clear")
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 60)
                .background(D8.face, in: .rect(cornerRadius: 14))
                .overlay { RoundedRectangle(cornerRadius: 14).strokeBorder(D8.edge, lineWidth: 2) }
                if today {
                    actionRow
                } else if LangListener.shared.supported {
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
                    SentenceTranslations(text: text, source: sentenceSource, targets: shown.filter { $0 != sentenceSource }, fallback: answer?.rows ?? [:])
                } else if picked == nil, let answer, answer.layer != .deck {
                    LexiconAnswerView(answer: answer, shown: shown)
                } else if !text.isEmpty {
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
                            ShareObjectButton(.word(id: id, gloss: text, forms: words.map { ShareForm(lang: $0.lang, form: $0.form) }))
                            Color.clear.frame(width: 0, height: 0).sharePage(.word(id: id, gloss: text, forms: words))
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
            Group {
                if today {
                    card
                        .padding(16)
                        .environment(\.colorScheme, scheme == .dark ? .light : .dark)
                        .modifier(GameLip(face: scheme == .dark ? D8.parchment : D8.ink, lip: scheme == .dark ? D8.keyline : .black, radius: 22))
                        .accessibilityIdentifier("today.translate")
                } else {
                    card.padding(.vertical, 6)
                }
            }
            .onChange(of: query) { picked = nil }
            .onChange(of: from) { picked = nil }
            .task(id: langs) { sources = translateSources(corpus, mine: langs) }
            .task(id: answerKey) { await refresh(corpus, guess: guess) }
            .onChange(of: DeepLink.shared.listen, initial: true) { _, on in
                guard on, !today else { return }
                DeepLink.shared.listen = false
                Task { await listen() }
            }
            .onChange(of: DeepLink.shared.pending, initial: true) { _, link in
                if !today, link == .voice { DeepLink.shared.pending = nil }
            }
            .onChange(of: DeepLink.shared.translate, initial: true) { _, q in
                guard !today, let q else { return }
                query = q
                DeepLink.shared.translate = nil
                DeepLink.shared.pending = nil
            }
        }
    }

    var answerKey: String { "\(active)|\(from ?? "")|\(shown.joined(separator: ","))" }

    func refresh(_ corpus: LangCorpus, guess: String) async {
        let q = active
        guard !q.isEmpty else {
            answer = nil
            return
        }
        try? await Task.sleep(for: .milliseconds(180))
        guard !Task.isCancelled else { return }
        let order = from.map { [$0] } ?? ([guess] + langs.filter { $0 != guess })
        let targets = shown
        let result = await Task.detached(priority: .userInitiated) {
            TranslateEngine.answer(q, from: order, to: targets, corpus: corpus, shelf: TranslateCard.lexicons)
        }.value
        guard !Task.isCancelled, q == active else { return }
        answer = result
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
        committed = first
        haptic(true)
    }

    var targetRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Text("Into").font(.subheadline.weight(.bold)).foregroundStyle(Palette.muted)
                ForEach(chosen, id: \.self) { l in
                    Button { toggleTarget(l) } label: {
                        HStack(spacing: 6) {
                            FlagTile(lang: l, size: 20)
                            Text(Lang.name(l)).font(.system(size: 15, weight: .bold, design: .rounded))
                            if chosen.count > 1 { Image(systemName: "xmark").font(.system(size: 10, weight: .heavy)).foregroundStyle(Palette.muted) }
                        }
                        .foregroundStyle(Palette.ink)
                        .padding(.horizontal, 10)
                        .frame(minHeight: 36)
                        .background(D8.face, in: .capsule)
                        .overlay { Capsule().strokeBorder(D8.edge, lineWidth: 1.5) }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text("Remove \(Lang.name(l))"))
                }
                Menu {
                    Section("My languages") {
                        ForEach(langs.filter { !chosen.contains($0) }, id: \.self) { l in Button(Lang.name(l)) { toggleTarget(l) } }
                    }
                    Section("More languages") {
                        ForEach(sources.filter { !chosen.contains($0) && !langs.contains($0) }, id: \.self) { l in Button(Lang.name(l)) { toggleTarget(l) } }
                    }
                } label: {
                    Image(systemName: "plus").font(.system(size: 15, weight: .heavy)).foregroundStyle(Palette.ink)
                        .frame(width: 36, height: 36)
                        .background(D8.face, in: .circle)
                        .overlay { Circle().strokeBorder(D8.edge, lineWidth: 1.5) }
                }
                .accessibilityLabel(Text("Add a language"))
                .accessibilityIdentifier("translate.addTarget")
            }
        }
    }

    var actionRow: some View {
        HStack(spacing: 12) {
            Button { commit() } label: {
                Label("Translate", systemImage: "arrow.right")
                    .labelStyle(TrailingIcon())
                    .font(D8.word(19))
                    .foregroundStyle(D8.parchment)
                    .frame(maxWidth: .infinity, minHeight: 60)
                    .modifier(GameLip(face: D8.lapis, lip: Color(hex: 0x12326A)))
            }
            .buttonStyle(.plain)
            .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty)
            .accessibilityIdentifier("translate.go")
            if LangListener.shared.supported {
                Button { if listening { LangListener.shared.stop() } else { Task { await listen() } } } label: {
                    Image(systemName: listening ? "stop.fill" : "mic.fill")
                        .font(.system(size: 26, weight: .bold))
                        .symbolEffect(.variableColor.iterative, isActive: listening)
                        .foregroundStyle(D8.parchment)
                        .frame(width: 60, height: 60)
                        .background(D8.vermilion, in: .circle)
                        .background(D8.vermilionLip, in: .circle.offset(y: 5))
                        .padding(.bottom, 5)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(listening ? String(localized: "Stop") : String(localized: "Say a word in \(Lang.name(listenLang))"))
                .accessibilityIdentifier("translate.mic")
            }
        }
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


struct TrailingIcon: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.title
            configuration.icon
        }
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
