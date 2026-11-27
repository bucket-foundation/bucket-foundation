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
    var today = false
    @AppStorage(AccountDefaults.key("translate.targets")) private var targetsRaw = ""
    @AppStorage("translate.recent") private var recentRaw = ""
    @State private var picking = false
    @State private var committed = TranslateCard.debugQuery
    @State private var query = TranslateCard.debugQuery
    @State private var picked: String?
    @State private var added: Set<String> = []
    @State private var phrases: [String: PhraseActions.Deck] = [:]
    @State private var from: String?
    @State private var sources: [String] = []
    @State private var listening = false
    @State private var missedVoice = false
    @State private var speechDenied = false
    @State private var answer: TranslateAnswer?
    @State private var loadingLexicon = false
    @State private var answered = ""
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

    var base: [String] { chosen }

    var recent: [String] { recentRaw.split(separator: ",").map(String.init).filter { !$0.isEmpty } }

    var shown: [String] {
        guard let from, !base.contains(from) else { return base }
        return [from] + base
    }

    var active: String { today ? committed : query }

    var soft: Color { PL.inkDim }

    static var settingsURL: URL? {
        #if os(iOS)
        URL(string: UIApplication.openSettingsURLString)
        #else
        URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition")
        #endif
    }

    func micTapped() {
        if listening {
            LangListener.shared.stop()
        } else if LangListener.shared.denied {
            missedVoice = false
            speechDenied = true
        } else {
            Task { await listen() }
        }
    }

    func setTargets(_ list: [String]) { targetsRaw = list.joined(separator: ",") }

    func toggleTarget(_ l: String) {
        var list = chosen
        if let i = list.firstIndex(of: l) {
            guard list.count > 1 else { return }
            list.remove(at: i)
        } else {
            list.append(l)
            recentRaw = LangPicker.remember(l, in: recent).joined(separator: ",")
        }
        setTargets(list)
    }

    func swapLanguages(detected: String?) {
        guard let r = LangPicker.swap(from: from, detected: detected, targets: chosen) else { return }
        from = r.from
        setTargets(r.targets)
        recentRaw = LangPicker.remember(r.targets[0], in: recent).joined(separator: ",")
        haptic(true)
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
            let settled = answered == answerKey
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
                            if let from { FlagTile(lang: from, size: 22) } else { PLGlyphView(.search, size: 18) }
                            Text(from.map(Lang.name) ?? String(localized: "Detect"))
                                .font(PL.heading.font(scale: 17 / PL.heading.size))
                                .lineLimit(1)
                                .fixedSize()
                            PLGlyphView(.chevronDown, size: 13)
                        }
                        .foregroundStyle(PL.ink)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 40)
                        .background(PL.card, in: .capsule)
                        .overlay { Capsule().strokeBorder(PL.paper3, lineWidth: 2) }
                    }
                    .layoutPriority(1)
                    .accessibilityLabel(from.map { String(localized: "Translate from \(Lang.name($0))") } ?? String(localized: "Detect language"))
                    if LangPicker.swap(from: from, detected: detected, targets: chosen) != nil {
                        Button { swapLanguages(detected: detected) } label: {
                            Image(systemName: "arrow.left.arrow.right")
                                .font(PL.text(16, .heavy))
                                .foregroundStyle(PL.ink)
                                .frame(width: 44, height: 44)
                                .background(PL.card, in: .circle)
                                .overlay { Circle().strokeBorder(PL.paper3, lineWidth: 1.5) }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text("Swap languages"))
                        .accessibilityIdentifier("translate.swap")
                    }
                    if let detected {
                        Text("Detected: \(Lang.name(detected))")
                            .font(PL.script(15, .semibold))
                            .foregroundStyle(soft)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    Spacer(minLength: 0)
                }
                targetRow
                HStack(spacing: 10) {
                    PLGlyphView(.search, size: 22).foregroundStyle(PL.lapis)
                    TextField("Translate a word", text: $query, prompt: Text("Translate a word").foregroundStyle(soft))
                        .font(PL.heading.font(scale: 21 / PL.heading.size))
                        .autocorrectionDisabled()
                        .submitLabel(.search)
                        .focused($focused)
                        .onSubmit {
                            if today { commit() } else if let id = picked ?? hits.first?.itemId { add(id, corpus) }
                        }
                    if !query.isEmpty {
                        Button { query = ""; committed = "" } label: { PLGlyphView(.close, size: 16).foregroundStyle(soft).frame(width: 44, height: 44) }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Clear")
                    }
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 60)
                .background(PL.card, in: .rect(cornerRadius: PL.Radius.md))
                .overlay { RoundedRectangle(cornerRadius: PL.Radius.md).strokeBorder(PL.paper3, lineWidth: 2) }
                if today {
                    actionRow
                } else {
                    Button { micTapped() } label: {
                        HStack(spacing: 12) {
                            PLGlyphView(listening ? .stop : .mic, size: 30)
                            Text(listening ? String(localized: "Stop") : String(localized: "Tap and speak")).font(PL.wordFont(21))
                        }
                        .foregroundStyle(PL.paper)
                        .frame(maxWidth: .infinity, minHeight: 84)
                        .modifier(GameLip(face: PL.vermilion, lip: PL.vermilionDeep))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(listening ? String(localized: "Stop") : String(localized: "Say a word in \(Lang.name(listenLang))"))
                }
                statusLine
                if sentence {
                    SentenceTranslations(text: text, source: sentenceSource, targets: shown.filter { $0 != sentenceSource }, fallback: answer?.rows ?? [:], waiting: !settled, soft: soft,
                                         deck: wordsState(text), addWords: { addWords(text, sentenceSource, corpus) })
                } else if picked == nil, let answer, answer.layer != .deck {
                    LexiconAnswerView(answer: answer, shown: shown, withSource: false, soft: soft)
                    PhraseActions(text: text, forms: ShareForm.leading(answer.source, text, shown.compactMap { l in answer.rows[l].map { ShareForm(lang: l, form: $0) } }),
                                  deck: wordsState(text)) { addWords(text, answer.source, corpus, only: answer.itemId) }
                } else if !text.isEmpty {
                    if let id = picked ?? answer?.itemId ?? hits.first?.itemId, let item = corpus.byId[id] {
                        let source = from ?? answer?.source ?? hits.first(where: { $0.itemId == id })?.matchedLang
                        let outs = shown.filter { $0 != source }
                        let lexicon = answer?.rows ?? [:]
                        let unmet = outs.filter { item.form($0) == nil && lexicon[$0] == nil }
                        ForEach(outs, id: \.self) { l in
                            if let f = item.form(l) ?? lexicon[l] {
                                HStack(spacing: 10) {
                                    FlagTile(lang: l, size: 26)
                                    VStack(alignment: .leading, spacing: 2) {
                                        if item.form(l) == nil, answer?.glossed.contains(l) == true {
                                            Text("Word by word").font(PL.text(12, .semibold)).foregroundStyle(soft)
                                        }
                                        Text(f).font(PL.script(18, .bold)).foregroundStyle(PL.ink)
                                            .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                                    }
                                    Spacer(minLength: 4)
                                    PlayButton(text: f, lang: l)
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                        if !unmet.isEmpty, let source {
                            SentenceTranslations(text: text, source: source, targets: unmet, fallback: lexicon, waiting: !settled, soft: soft)
                                .id(unmet.joined(separator: ","))
                        }
                        let words = ShareForm.leading(source ?? guess, item.form(source ?? guess) ?? text, shown.compactMap { l in item.form(l).map { ShareForm(lang: l, form: $0) } }).map { (lang: $0.lang, form: $0.form) }
                        let report = ReportSubject(lang: source ?? from ?? langs.first ?? "en", itemId: id, text: text,
                                                   shown: words.filter { $0.lang != source }.map { "\($0.lang): \($0.form)" }.joined(separator: "; "), context: "translate:word")
                        let share = ShareObjectButton(.word(id: id, gloss: text, forms: words.map { ShareForm(lang: $0.lang, form: $0.form) }))
                        ViewThatFits(in: .horizontal) {
                            HStack(spacing: 10) {
                                deckControl(id, corpus).fixedSize()
                                share
                                Spacer(minLength: 0)
                                WrongTranslationLink(subject: report)
                            }
                            VStack(alignment: .leading, spacing: 8) {
                                deckControl(id, corpus)
                                HStack(spacing: 10) {
                                    share
                                    Spacer(minLength: 0)
                                    WrongTranslationLink(subject: report)
                                }
                            }
                        }
                        .background { Color.clear.frame(width: 0, height: 0).sharePage(.word(id: id, gloss: text, forms: words)) }
                        let seen = Set(shown.compactMap { item.form($0).map(foldForSearch) })
                        let similar = hits.filter { h in h.itemId != id && !seen.contains(foldForSearch(corpus.byId[h.itemId]?.form(h.matchedLang) ?? "")) }
                        if !similar.isEmpty {
                            Text("Similar").font(PL.text(12, .semibold)).foregroundStyle(soft)
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
                            .font(PL.text(15))
                            .foregroundStyle(soft)
                    }
                }
            }
            Group {
                if today {
                    card
                        .padding(.vertical, 4)
                        .todayCard()
                        .accessibilityIdentifier("today.translate")
                } else {
                    card.padding(.vertical, 6)
                }
            }
            .onChange(of: query) {
                picked = nil
                missedVoice = false
                speechDenied = false
            }
            .onChange(of: from) { picked = nil }
            .onChange(of: answerKey) { phrases = [:] }
            .sheet(isPresented: $picking) {
                TranslateLanguageSheet(chosen: chosen, recent: recent, suggested: langs, all: sources.isEmpty ? Lang.codes : sources, toggle: toggleTarget)
                    .environment(\.colorScheme, .light)
                    .preferredColorScheme(.light)
            }
            .environment(\.colorScheme, .light)
            .task(id: langs) { sources = translateSources(corpus, mine: langs) }
            .task(id: answerKey) { await refresh(corpus, guess: guess) }
            .onDisappear { TranslateCard.lexicons.release() }
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
        let key = answerKey
        guard !q.isEmpty else {
            answer = nil
            answered = key
            return
        }
        try? await Task.sleep(for: .milliseconds(180))
        guard !Task.isCancelled else { return }
        let order = from.map { [$0] } ?? ([guess] + langs.filter { $0 != guess })
        let targets = shown
        TranslateCard.lexicons.reserve(Set(order + targets).count)
        let warm = Set(TranslateCard.lexicons.loaded)
        loadingLexicon = (order + targets).contains { !warm.contains($0) }
        let result = await Task.detached(priority: .userInitiated) {
            TranslateEngine.answer(q, from: order, to: targets, corpus: corpus, shelf: TranslateCard.lexicons)
        }.value
        loadingLexicon = false
        guard !Task.isCancelled, q == active else { return }
        answer = result
        answered = key
    }

    func listen() async {
        missedVoice = false
        speechDenied = false
        listening = true
        let heard = await LangListener.shared.listenOnce(listenLang, limit: LangListener.maxSentence)
        listening = false
        guard let first = heard.first, !first.isEmpty else {
            if LangListener.shared.denied { speechDenied = true } else { missedVoice = true }
            return
        }
        query = first
        committed = first
        haptic(true)
    }

    var targetRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Text("Into").font(PL.text(15, .bold)).foregroundStyle(soft)
                ForEach(chosen, id: \.self) { l in
                    HStack(spacing: 2) {
                        FlagTile(lang: l, size: 20)
                        Text(Lang.name(l)).font(PL.script(15, .bold)).padding(.leading, 4)
                        if chosen.count > 1 {
                            Button { toggleTarget(l) } label: {
                                PLGlyphView(.close, size: 11).foregroundStyle(soft)
                                    .frame(width: 32, height: 36)
                                    .contentShape(.rect)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(Text("Remove \(Lang.name(l))"))
                            .accessibilityHint(Text("Stops translating into this language"))
                        }
                    }
                    .foregroundStyle(PL.ink)
                    .padding(.leading, 10)
                    .padding(.trailing, chosen.count > 1 ? 0 : 10)
                    .frame(minHeight: 36)
                    .background(PL.card, in: .capsule)
                    .overlay { Capsule().strokeBorder(PL.paper3, lineWidth: 1.5) }
                }
                Button { picking = true } label: {
                    PLGlyphView(.plus, size: 15).foregroundStyle(PL.ink)
                        .frame(width: 44, height: 44)
                        .background(PL.card, in: .circle)
                        .overlay { Circle().strokeBorder(PL.paper3, lineWidth: 1.5) }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Add a language"))
                .accessibilityIdentifier("translate.addTarget")
            }
        }
    }

    var statusLine: some View {
        ZStack(alignment: .leading) {
            Text(LangListener.shared.live.isEmpty ? String(localized: "Listening in \(Lang.name(listenLang))…") : LangListener.shared.live)
                .font(PL.text(15, .semibold))
                .foregroundStyle(LangListener.shared.live.isEmpty ? PL.vermilion : PL.ink)
                .truncationMode(.head)
                .opacity(listening ? 1 : 0)
            Text("Didn't catch that. Tap the mic and try again.")
                .font(PL.text(15))
                .foregroundStyle(soft)
                .opacity(missedVoice && !listening ? 1 : 0)
            HStack(spacing: 6) {
                Text("Turn on speech in Settings").font(PL.text(15, .semibold)).foregroundStyle(PL.ink)
                if let url = Self.settingsURL {
                    Link(destination: url) {
                        Text("Open Settings").font(PL.text(15, .bold)).underline()
                    }
                    .foregroundStyle(PL.vermilion)
                    .accessibilityIdentifier("translate.openSettings")
                }
            }
            .opacity(speechDenied && !listening ? 1 : 0)
            .allowsHitTesting(speechDenied && !listening)
            Text("Loading dictionary…")
                .font(PL.text(15))
                .foregroundStyle(soft)
                .opacity(loadingLexicon && !listening && !missedVoice && !speechDenied ? 1 : 0)
                .accessibilityHidden(!loadingLexicon)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .frame(maxWidth: .infinity, minHeight: 22, maxHeight: 22, alignment: .leading)
        .animation(.easeOut(duration: 0.2), value: listening)
        .accessibilityElement(children: .contain)
    }

    var actionRow: some View {
        HStack(spacing: 12) {
            Button { commit() } label: {
                Label("Translate", systemImage: "arrow.right")
                    .labelStyle(TrailingIcon())
                    .font(PL.wordFont(19))
                    .frame(minHeight: 52)
            }
            .buttonStyle(D8Primary())
            .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty)
            .accessibilityIdentifier("translate.go")
            Button { micTapped() } label: {
                PLGlyphView(listening ? .stop : .mic, size: 26)
                    .foregroundStyle(listening ? PL.paper : PL.vermilion)
                    .frame(width: 60, height: 60)
                    .background(listening ? PL.vermilion : PL.card, in: .circle)
                    .overlay { Circle().strokeBorder(listening ? PL.vermilion : PL.paper3, lineWidth: 2) }
                    .background(listening ? PL.vermilionDeep : PL.paper3, in: .circle.offset(y: 5))
                    .padding(.bottom, 5)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(listening ? String(localized: "Stop") : String(localized: "Say a word in \(Lang.name(listenLang))"))
            .accessibilityIdentifier("translate.mic")
        }
    }

    @ViewBuilder func deckControl(_ id: String, _ corpus: LangCorpus) -> some View {
        if added.contains(id) {
            Label("Added to your next session", systemImage: "checkmark.circle.fill")
                .font(PL.text(15, .semibold))
                .foregroundStyle(PL.malachite)
        } else {
            Button("Add to my deck") { add(id, corpus) }
                .buttonStyle(PLOption(align: .center, compact: true))
        }
    }

    func wordsState(_ text: String) -> PhraseActions.Deck {
        phrases[text] ?? .open
    }

    func addWords(_ text: String, _ source: String, _ corpus: LangCorpus, only: String? = nil) {
        let ids = (only.map { [$0] } ?? TranslateEngine.deckWords(text, source: source, corpus: corpus)).filter { corpus.byId[$0] != nil }
        let queued = ids.filter { queue($0, corpus) }
        phrases[text] = ids.isEmpty ? PhraseActions.Deck.none : queued.isEmpty ? .known : .added
        haptic(!queued.isEmpty)
    }

    @discardableResult func queue(_ itemId: String, _ corpus: LangCorpus) -> Bool {
        guard let item = corpus.byId[itemId] else { return false }
        var queued = false
        for s in store.systems where s.targets.contains(where: { item.form($0) != nil }) {
            let state = store.state(s.id)
            let carded = s.targets.contains { state.cards.has(cardId($0, itemId)) }
            if !carded {
                WantedWords.add(itemId, to: s.id)
                queued = true
            }
        }
        return queued
    }

    func add(_ itemId: String, _ corpus: LangCorpus) {
        queue(itemId, corpus)
        added.insert(itemId)
        haptic(true)
    }
}


struct PhraseActions: View {
    enum Deck { case open, added, known, none }

    let text: String
    let forms: [ShareForm]
    var deck = Deck.open
    let add: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            switch deck {
            case .open:
                Button("Add its words to my deck", action: add)
                    .buttonStyle(PLOption(align: .center, compact: true))
                    .fixedSize()
                    .accessibilityIdentifier("translate.addWords")
            case .added:
                Label("Added to your next session", systemImage: "checkmark.circle.fill")
                    .font(PL.text(15, .semibold))
                    .foregroundStyle(PL.malachite)
            case .known:
                Text("These words are already in your deck").font(PL.text(15)).foregroundStyle(PL.inkDim)
            case .none:
                Text("No deck words in this phrase yet").font(PL.text(15)).foregroundStyle(PL.inkDim)
            }
            if forms.count > 1 {
                ShareObjectButton(.word(id: ShareRoute.clip(text, 80), gloss: text, forms: forms))
                    .accessibilityIdentifier("translate.share")
            }
            Spacer(minLength: 0)
        }
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
    var withSource = true
    var soft = PL.inkDim

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
                Text(note).font(PL.text(15, .semibold)).foregroundStyle(soft)
            }
            ForEach((withSource ? [answer.source] : []) + shown.filter { $0 != answer.source }, id: \.self) { l in
                if let f = l == answer.source ? answer.headword : answer.rows[l] {
                    HStack(spacing: 10) {
                        FlagTile(lang: l, size: 26)
                        Text(f).font(PL.script(18, .bold)).foregroundStyle(PL.ink)
                            .environment(\.layoutDirection, Lang.isRTL(l) ? .rightToLeft : .leftToRight)
                            .textSelection(.enabled)
                        Spacer(minLength: 4)
                        PlayButton(text: f, lang: l)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            TranslateCredit(soft: soft)
        }
    }
}

struct TranslateCredit: View {
    var soft = PL.inkDim

    var body: some View {
        Text("Dictionary: Wiktionary, CC BY-SA. Sentences: Tatoeba, CC BY 2.0 FR.").font(PL.text(11)).foregroundStyle(soft)
    }
}
