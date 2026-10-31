import BucketKit
import SwiftUI

struct ExerciseResult {
    let lang: String
    let rating: Rating
}

extension View {
    func exerciseCard(tight: Bool = false) -> some View {
        padding(tight ? 12 : 18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: .rect(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Palette.rule))
    }

    func langInput(_ lang: String) -> some View {
        environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
            #if os(iOS)
            .textInputAutocapitalization(.never)
            #endif
    }
}

struct ReadingLine: View {
    let reading: Reading?
    let on: Bool

    var body: some View {
        if on, let r = reading {
            let parts = [r.kana, r.roman, r.ipa.map { "/\($0)/" }].compactMap { $0 }.filter { !$0.isEmpty }
            if !parts.isEmpty { Text(parts.joined(separator: " · ")).font(.caption).foregroundStyle(Palette.muted) }
        }
    }
}

struct OptionButton: View {
    let text: String
    let lang: String
    let reading: Reading?
    var selected = false
    var tall = false
    var glyph = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: tall ? .center : .leading, spacing: 2) {
                Text(text).font(glyph ? .largeTitle.weight(.bold) : nil).multilineTextAlignment(tall ? .center : .leading).lineLimit(tall ? 2 : nil).minimumScaleFactor(tall ? 0.6 : 1)
                if let r = readingText(reading) { Text(r).font(.caption).foregroundStyle(D8.ipa) }
            }
            .padding(.vertical, 10)
            .frame(maxWidth: tall ? .infinity : nil, minHeight: tall ? 72 : nil)
        }
        .buttonStyle(D8Option(selected: selected))
        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
        .accessibilityLabel("\(text), \(langName(lang))")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct ExerciseView: View {
    let ex: Exercise
    let readings: Bool
    let reading: (String, String) -> Reading?
    let onDone: ([ExerciseResult]) -> Void
    var flagNamed: (String) -> Bool = { _ in true }
    var onMatch: (([String: String]) -> Void)?
    var chorus: [VoiceLine] = []

    @State private var selected: String?
    @State private var picked: String?
    @State private var typed = ""
    @State private var verdict: Verdict?
    @State private var heard: String?
    @State private var listening = false
    @State private var assign: [String: String] = [:]
    @State private var holding: String?
    @State private var matchDone = false
    @State private var built: [Int] = []
    @State private var started = Date()
    @State private var autoFocused = false
    @FocusState private var focused: Bool
    @Environment(\.verticalSizeClass) private var vertical
    var sideways: Bool { vertical == .compact }
    var columns: AnyLayout { sideways ? AnyLayout(HStackLayout(alignment: .top, spacing: 20)) : AnyLayout(VStackLayout(alignment: .leading, spacing: 14)) }

    var accepted: [String] { ex.accept ?? [ex.answer] }
    var answered: Bool { ex.kind == .intro || picked != nil || verdict != nil || matchDone }
    var slow: Bool { Date().timeIntervalSince(started) > 15 }
    var targetName: String { langName(ex.lang) }

    func finish(_ ok: Bool, _ v: Verdict? = nil) {
        onDone([ExerciseResult(lang: ex.lang, rating: v.map { verdictRating($0, hesitated: slow) } ?? (ok ? (slow ? 2 : 3) : 1))])
    }

    func r(_ form: String, _ lang: String) -> Reading? { readings ? reading(form, lang) : nil }

    var headerText: String {
        let level = ex.level.flatMap { Lang.levelLabel[Int($0)] }.map { " · \($0)" } ?? ""
        let label = ex.kind == .letter && ScriptCourse.isCharacter(ex.lang, ex.answer) ? String(localized: "find the character") : String(localized: String.LocalizationValue(ex.kind.label))
        return ex.kind == .match ? "\(ex.prompt) · \(label)\(level)" : "\(label)\(level)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: sideways ? 8 : 16) {
            if !compactTyping { CardHeader(lang: ex.kind == .match ? nil : ex.lang, text: headerText, flagSize: sideways ? 26 : 44) }
            switch ex.kind {
            case .intro: intro
            case .match: match
            case .wordbank: wordbank
            default:
                if compactTyping { typingRow } else { standard }
            }
        }
        .exerciseCard(tight: sideways)
        .wordTaps(reveal: answered)
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-pickWrong") {
                picked = ex.options?.first { !accepted.contains($0) }
                if ex.options == nil { verdict = .wrong; typed = "xyz" }
                if ex.kind == .match, let pairs = ex.pairs {
                    let langs = pairs.map(\.lang)
                    assign = Dictionary(uniqueKeysWithValues: zip(langs, langs.dropFirst() + langs.prefix(1)))
                    matchDone = true
                }
            }
            #endif
            started = Date()
            if ex.kind == .listen || ex.kind == .typeHeard || ex.kind == .spellHeard { LangVoice.shared.speak(ex.prompt, ex.promptLang) }
            if ex.kind == .intro { LangVoice.shared.speakTogether(chorus) }
        }
    }

    var intro: some View {
        columns {
            WordTile(word: ex.answer, lang: ex.answerLang, reading: readings ? ex.answerReading : nil, size: sideways ? 170 : 190)
            VStack(spacing: 12) {
                PhraseWords(text: ex.answer, lang: ex.answerLang)
                Text(tapText(ex.prompt, ex.promptLang, color: Palette.muted)).font(.subheadline).frame(maxWidth: .infinity)
                Notes(ex: ex, showNote: true, readings: readings)
                Button("Got it") { onDone([]) }.buttonStyle(D8Primary())
            }
        }
    }

    var match: some View {
        let pairs = ex.pairs ?? []
        let langs = pairs.map(\.lang)
        let placed = Set(assign.keys)
        return columns {
            HStack(alignment: .top, spacing: 10) {
                ForEach(langs, id: \.self) { l in
                    let owner = assign.first { $0.value == l }?.key
                    let word = owner.flatMap { k in pairs.first { $0.lang == k }?.word }
                    let ok = owner == l
                    let truth = pairs.first { $0.lang == l }?.word ?? ""
                    Button {
                        if matchDone {
                            LangVoice.shared.speak(truth, l)
                            return
                        }
                        guard let h = holding else { return }
                        assign = assign.filter { $0.value != l }
                        assign[h] = l
                        holding = nil
                        tap()
                    } label: {
                        VStack(spacing: 6) {
                            FlagTile(lang: l, size: 64)
                                .overlay(alignment: .topTrailing) {
                                    if matchDone {
                                        Image(systemName: ok ? "checkmark" : "xmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(.white)
                                            .frame(width: 24, height: 24).background(ok ? D8.malachite : D8.vermilion, in: .circle).offset(x: 7, y: -7)
                                    }
                                }
                            if flagNamed(l) || matchDone { Text(langName(l)).font(.caption.weight(.bold)).foregroundStyle(Palette.muted) }
                            Text(word ?? " ").font(D8.word(16)).strikethrough(matchDone && !ok, color: D8.vermilion)
                                .foregroundStyle(matchDone ? (ok ? D8.malachite : Palette.muted) : Palette.ink).lineLimit(1).minimumScaleFactor(0.6)
                            if matchDone && !ok { Text(truth).font(D8.word(16)).foregroundStyle(D8.malachite).lineLimit(1).minimumScaleFactor(0.6) }
                            if matchDone && LangVoice.shared.canSpeak(truth, l) {
                                Image(systemName: "speaker.wave.2.fill").font(.system(size: 13)).foregroundStyle(Palette.muted)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(langName(l))\(word.map { ", holds \($0)" } ?? "")\(matchDone ? (ok ? ", right" : ", wrong, the answer is \(truth)") : "")")
                    .accessibilityHint(matchDone ? String(localized: "Plays the word") : "")
                }
            }
            VStack(alignment: .leading, spacing: 14) {
                if matchDone {
                    Notes(ex: ex, showNote: false, readings: readings)
                    Button("Continue") {
                        if let onMatch { onMatch(assign) } else { onDone(gradeMatch(pairs, assign).map { ExerciseResult(lang: $0.lang, rating: $0.correct ? 3 : 1) }) }
                    }
                    .buttonStyle(D8Primary())
                } else {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: sideways ? 2 : 1), spacing: 10) {
                        ForEach(pairs.filter { !placed.contains($0.lang) }, id: \.lang) { p in
                            OptionButton(text: p.word, lang: p.lang, reading: nil, selected: holding == p.lang) { holding = p.lang; tap() }
                        }
                    }
                    Button("Check") {
                        matchDone = true
                        haptic(gradeMatch(pairs, assign).allSatisfy(\.correct))
                        LangVoice.shared.speakTogether(chorus)
                    }
                        .buttonStyle(D8Primary())
                        .disabled(assign.count < pairs.count)
                }
            }
        }
    }

    var wordbank: some View {
        let tokens = ex.tokens ?? []
        let answerText = joinTokens(built.map { tokens[$0] }, ex.lang)
        return columns {
            VStack(alignment: .leading, spacing: 14) {
                SentencePrompt(text: ex.prompt, lang: ex.promptLang)
                FlowLayout(spacing: 8) {
                    ForEach(Array(built.enumerated()), id: \.offset) { k, ti in
                        Button(tokens[ti]) { built.remove(at: k) }
                            .buttonStyle(D8Option())
                            .fixedSize()
                            .disabled(verdict != nil)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 54, alignment: .topLeading)
                .overlay(alignment: .bottom) { Rectangle().fill(Palette.rule).frame(height: 2) }
                .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
            }
            VStack(alignment: .leading, spacing: 14) {
                if verdict == nil {
                    FlowLayout(spacing: 8) {
                        ForEach(Array(tokens.enumerated()), id: \.offset) { ti, t in
                            Button(t) { built.append(ti) }
                                .buttonStyle(D8Option())
                                .fixedSize()
                                .disabled(built.contains(ti))
                                .opacity(built.contains(ti) ? 0.25 : 1)
                        }
                    }
                    .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
                    Button("Check") { verdict = judgeTyped(answerText, accepted, ex.lang) }
                        .buttonStyle(D8Primary())
                        .disabled(built.isEmpty)
                } else if let verdict {
                    Answered(ex: ex, ok: verdict != .wrong, verdict: verdict, given: answerText, reading: r(ex.answer, ex.answerLang)) { finish(verdict != .wrong, verdict) }
                }
            }
        }
    }

    var typedKind: Bool { Self.typed(ex, speech: LangListener.shared.supported, heard: heard) }

    static func typed(_ ex: Exercise, speech: Bool, heard: String?) -> Bool {
        ex.kind == .translate || ex.kind == .typeHeard || ex.kind == .spellHeard || (ex.kind == .conjugate && ex.options == nil) || (ex.kind == .speak && (!speech || heard == ""))
    }

    static func spokenArticle(_ article: String, _ ex: Exercise) -> String {
        "\(article)\(ex.cloze?.after ?? "")"
    }

    static func choiceKeys(_ ex: Exercise, speech: Bool, heard: String?) -> Bool {
        ex.options != nil && !typed(ex, speech: speech, heard: heard)
    }

    func judgeAnswer(_ s: String) -> Verdict {
        ex.kind == .spellHeard ? LangScript.judgeSpelled(s, accepted, ex.answerLang) : judgeTyped(s, accepted, ex.answerLang)
    }

    func optionLang(_ o: String) -> String { ex.optionLangs?[o] ?? ex.answerLang }

    var standard: some View {
        let mc = Self.choiceKeys(ex, speech: LangListener.shared.supported, heard: heard)
        let sameLangReadings = ex.kind != .gender && ex.kind != .conjugate
        let prompt = Prompt(ex: ex, readings: readings, cousins: { l in r(ex.family?.first { $0.lang == l }?.word ?? "", l) }, answered: picked != nil || verdict != nil)
        let answers = VStack(alignment: .leading, spacing: 14) {
            if mc, let options = ex.options {
                if let picked {
                    VStack(spacing: 8) {
                        ForEach(sideways ? options.filter { accepted.contains($0) || $0 == picked } : options, id: \.self) { o in
                            AnswerRow(word: o, lang: optionLang(o), state: accepted.contains(o) ? .right : o == picked ? .wrong : .other,
                                      flag: ex.optionLangs != nil || accepted.contains(o), reading: sameLangReadings ? r(o, optionLang(o)) : nil,
                                      say: ex.kind == .gender ? Self.spokenArticle(o, ex) : nil)
                        }
                    }
                    Notes(ex: ex, showNote: !accepted.contains(picked) || ex.kind == .conjugate || ex.kind == .gender, readings: readings)
                    Button("Continue") { finish(accepted.contains(picked)) }
                        .buttonStyle(D8Primary())
                        .keyboardShortcut(.defaultAction)
                        .onAppear { haptic(accepted.contains(picked)) }
                } else {
                    let row = ex.kind == .gender && options.count <= 3
                    let cols = row ? Array(repeating: GridItem(.flexible(), spacing: 10), count: options.count) : sideways || ex.kind == .letter ? [GridItem(.flexible(), spacing: 10), GridItem(.flexible())] : [GridItem(.flexible())]
                    LazyVGrid(columns: cols, spacing: 10) {
                        ForEach(Array(options.enumerated()), id: \.element) { k, o in
                            OptionButton(text: o, lang: optionLang(o), reading: nil, selected: selected == o, tall: sideways || ex.kind == .letter, glyph: ex.kind == .letter) { selected = o; tap() }
                                .optionKey(k)
                        }
                    }
                    if ex.kind == .gender { ArticleKey(lang: ex.lang) }
                    Button("Check") { picked = selected }
                        .buttonStyle(D8Primary())
                        .disabled(selected == nil)
                        .keyboardShortcut(.defaultAction)
                }
            }
            if ex.kind == .speak && !typedKind && verdict == nil {
                if listening {
                    Text(LangListener.shared.live.isEmpty ? String(localized: "Listening…") : LangListener.shared.live)
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(LangListener.shared.live.isEmpty ? Palette.muted : D8.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentTransition(.opacity)
                }
                Button {
                    if listening { LangListener.shared.stop() } else { Task { await micTry() } }
                } label: {
                    Label(listening ? String(localized: "Stop") : String(localized: "Speak"), systemImage: listening ? "stop.fill" : "mic.fill")
                }
                .buttonStyle(D8Primary())
                Button("Type instead") { heard = "" }.buttonStyle(PlainLink())
            }
            if typedKind && verdict == nil {
                answerField
                checkTyped
            }
            if let verdict {
                Answered(ex: ex, ok: verdict != .wrong, verdict: verdict, given: ex.kind == .speak ? heard : typed, reading: r(ex.lang == ex.answerLang ? ex.answer : ex.prompt, ex.lang)) { finish(verdict != .wrong, verdict) }
            }
        }
        return columns {
            prompt.frame(maxWidth: sideways ? .infinity : nil)
            answers.frame(maxWidth: sideways ? .infinity : nil)
        }
    }

    var compactTyping: Bool { Self.compactTyping(sideways: sideways, typing: typedKind, verdict: verdict) }

    static func compactTyping(sideways: Bool, typing: Bool, verdict: Verdict?) -> Bool {
        sideways && typing && verdict == nil
    }

    var answerField: some View {
        TextField(ex.kind == .typeHeard ? "Type what you hear" : ex.kind == .spellHeard ? "Spell it in its own script" : "Your answer", text: $typed)
            .font(.system(size: 18, weight: .semibold, design: .rounded))
            .foregroundStyle(D8.ink)
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .background(.white, in: .rect(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(D8.keyline, lineWidth: 2) }
            .autocorrectionDisabled()
            .langInput(ex.answerLang)
            .focused($focused)
            .onSubmit { if !typed.isEmpty { verdict = judgeAnswer(typed) } }
            .task {
                guard !autoFocused else { return }
                do { try await Task.sleep(for: .milliseconds(350)) } catch { return }
                autoFocused = true
                focused = true
            }
    }

    var checkTyped: some View {
        Button("Check") { verdict = judgeAnswer(typed) }
            .buttonStyle(D8Primary())
            .disabled(typed.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var typingRow: some View {
        HStack(spacing: 12) {
            TypingPrompt(ex: ex).frame(maxWidth: 220)
            answerField
            checkTyped.frame(width: 110)
        }
    }

    func micTry() async {
        listening = true
        let alts = await LangListener.shared.listenOnce(ex.answerLang)
        listening = false
        if alts.isEmpty {
            heard = ""
            return
        }
        let rank: (Verdict) -> Int = { $0 == .exact ? 0 : $0 == .close ? 1 : 2 }
        let best = alts.map { judgeTyped($0, accepted, ex.answerLang) }.sorted { rank($0) < rank($1) }[0]
        heard = alts[0]
        verdict = best
    }
}

func tap() {
    #if os(iOS)
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
    #endif
}

func haptic(_ ok: Bool) {
    #if os(iOS)
    UINotificationFeedbackGenerator().notificationOccurred(ok ? .success : .error)
    #endif
}

struct Answered: View {
    let ex: Exercise
    let ok: Bool
    let verdict: Verdict?
    let given: String?
    let reading: Reading?
    let onNext: () -> Void

    var body: some View {
        let target = ex.answerLang == ex.lang ? shownAnswer(ex) : ex.prompt
        VStack(alignment: .leading, spacing: 12) {
            if verdict == .close {
                Text("Close. Check the spelling and accents.").font(.subheadline.weight(.semibold)).foregroundStyle(D8.malachite)
            } else if !ok {
                (Text("Not quite. ") + Text(given.flatMap { $0.isEmpty ? nil : "You wrote \($0)." } ?? "")).font(.subheadline.weight(.semibold)).foregroundStyle(D8.vermilion)
            }
            AnswerRow(word: target, lang: ex.lang, state: .right, reading: reading)
            Notes(ex: ex, showNote: !ok || ex.kind == .conjugate || ex.kind == .gender)
            Button("Continue", action: onNext)
                .buttonStyle(D8Primary())
                .keyboardShortcut(.defaultAction)
        }
        .onAppear { haptic(ok) }
    }
}

struct Notes: View {
    let ex: Exercise
    let showNote: Bool
    var readings = true

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            FamilyLine(ex: ex, readings: readings)
            if ex.kind == .gender { ArticleKey(lang: ex.lang) }
            FalseFriendNote(ex: ex)
            if showNote, let note = ex.note, !note.isEmpty { Text(tapText(note, ex.root, color: Palette.muted)).font(.caption) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ArticleKey: View {
    let lang: String

    static func gender(_ g: String) -> String {
        switch g {
        case "m": String(localized: "masculine")
        case "f": String(localized: "feminine")
        case "n": String(localized: "neuter")
        case "de": String(localized: "common")
        case "pl": String(localized: "plural")
        default: String(localized: "neuter")
        }
    }

    var body: some View {
        if let table = Lang.articles[lang] {
            Text(table.map { "\($0.1): \(String(localized: "the")), \(Self.gender($0.0))" }.joined(separator: " · "))
                .font(.caption)
                .foregroundStyle(Palette.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct FamilyLine: View {
    let ex: Exercise
    var readings = true

    var body: some View {
        if let f = ex.family?.filter({ $0.lang != ex.lang && $0.lang != ex.root }), !f.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                Text("SAME ROOT").font(.caption2.weight(.semibold)).foregroundStyle(Palette.muted)
                FlowLayout(spacing: 8) {
                    ForEach(f, id: \.self) { w in
                        HStack(spacing: 6) {
                            FlagTile(lang: w.lang, size: 20)
                            VStack(alignment: .leading, spacing: 0) {
                                Text(w.word).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
                                if readings, let r = readingText(w.reading) { Text(r).font(.caption2).foregroundStyle(D8.ipa) }
                            }
                            PlayButton(text: w.word, lang: w.lang, roomy: true)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.white, in: .rect(cornerRadius: 10))
                        .overlay { RoundedRectangle(cornerRadius: 10).strokeBorder(D8.keyline, lineWidth: 1.5) }
                        .accessibilityElement(children: .combine)
                        .fixedSize()
                    }
                }
            }
        }
    }
}

struct FalseFriendNote: View {
    let ex: Exercise

    var body: some View {
        if let f = ex.falseFriend {
            Text("False friend: \(f.word) means \(f.means). It looks like English \(f.looksLike).\(f.crossWith.map { " \(langName($0.lang)) \($0.word) means \($0.means)." } ?? "")")
                .font(.caption)
                .foregroundStyle(Palette.ink.opacity(0.8))
        }
    }
}

func shownAnswer(_ ex: Exercise) -> String {
    if ex.kind == .gender { return "\(ex.answer)\(ex.cloze?.after ?? "")" }
    if ex.kind == .conjugate { return (ex.person ?? "").hasSuffix("'") ? "\(ex.person ?? "")\(ex.answer)" : "\(ex.person ?? "") \(ex.answer)" }
    return ex.answer
}

struct SentencePrompt: View {
    let text: String
    let lang: String

    var body: some View {
        Text(tapText(text, lang)).font(.serif(.title2, weight: .semibold)).multilineTextAlignment(.center).frame(maxWidth: .infinity)
    }
}

struct AskWord: View {
    let word: String
    let lang: String
    let sub: LocalizedStringKey?

    var body: some View {
        VStack(spacing: 4) {
            Text(tapText(word, lang)).font(.system(size: 46, weight: .bold, design: .rounded)).lineLimit(2).minimumScaleFactor(0.5).multilineTextAlignment(.center)
            if let sub { Text(sub).font(.title3).foregroundStyle(Palette.muted).multilineTextAlignment(.center) }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}

struct TypingPrompt: View {
    let ex: Exercise

    var body: some View {
        switch ex.kind {
        case .typeHeard, .spellHeard:
            WordTile(word: LangVoice.shared.canSpeak(ex.prompt, ex.promptLang) ? nil : ex.prompt, lang: ex.promptLang, reading: nil, size: 54, speakText: ex.prompt)
        case .conjugate:
            line(ex.prompt, ex.lang, "\(ex.person ?? "") ______")
        case .speak:
            line(ex.prompt, ex.promptLang, String(localized: "say it in \(langName(ex.lang))"))
        default:
            line(ex.prompt, ex.promptLang, String(localized: "in \(langName(ex.lang))"))
        }
    }

    func line(_ word: String, _ lang: String, _ sub: String) -> some View {
        VStack(spacing: 2) {
            Text(tapText(word, lang)).font(.system(size: 22, weight: .bold, design: .rounded)).lineLimit(2).minimumScaleFactor(0.5).multilineTextAlignment(.center)
            Text(sub).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }
}

struct Prompt: View {
    @Environment(\.verticalSizeClass) private var vertical
    let ex: Exercise
    let readings: Bool
    let cousins: (String) -> Reading?
    var answered = false

    var body: some View {
        let name = langName(ex.lang)
        switch ex.kind {
        case .cloze:
            VStack(spacing: 6) {
                if let c = ex.cloze {
                    (Text(tapText(c.before, ex.lang)) + Text("______").foregroundStyle(Palette.muted) + Text(tapText(c.after, ex.lang)))
                        .font(.serif(.title2, weight: .semibold)).multilineTextAlignment(.center)
                }
                Text(tapText(ex.prompt, ex.promptLang, color: Palette.muted)).font(.subheadline)
            }
            .frame(maxWidth: .infinity)
        case .listen, .typeHeard, .spellHeard:
            VStack(spacing: 10) {
                WordTile(word: answered || !LangVoice.shared.canSpeak(ex.prompt, ex.promptLang) ? ex.prompt : nil, lang: ex.promptLang, reading: answered && readings ? ex.promptReading : nil, size: vertical == .compact ? 100 : 140, speakText: ex.prompt)
                if answered { PhraseWords(text: ex.prompt, lang: ex.promptLang) }
                if ex.kind == .listen { Text("Pick the meaning").font(.subheadline).foregroundStyle(Palette.muted) }
            }
        case .gender:
            VStack(spacing: 4) {
                (Text("______ ").foregroundStyle(Palette.muted) + Text(tapText(ex.prompt, ex.lang))).font(.serif(.title, weight: .semibold))
                if let g = ex.promptReading?.roman { Text(g).font(.subheadline).foregroundStyle(Palette.muted) }
            }
            .frame(maxWidth: .infinity)
        case .conjugate:
            VStack(spacing: 8) {
                WordTile(word: ex.prompt, lang: ex.lang, reading: nil, size: vertical == .compact ? 100 : 130)
                Text([ex.promptReading?.roman, ex.tense == "past" ? "past" : "present"].compactMap { $0 }.joined(separator: " · ")).font(.subheadline).foregroundStyle(Palette.muted)
                (Text("\(ex.person ?? "") ") + Text("______").foregroundStyle(Palette.muted)).font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink)
            }
        case .falseFriend, .reverse:
            VStack(spacing: 10) {
                if D8Fit.wide(ex.prompt) {
                    WideTile(word: ex.prompt, lang: ex.lang, reading: readings ? ex.promptReading : nil, label: false)
                } else {
                    WordTile(word: ex.prompt, lang: ex.lang, reading: readings ? ex.promptReading : nil, size: vertical == .compact ? 120 : 160)
                }
                PhraseWords(text: ex.prompt, lang: ex.lang)
                Text("What does it mean?").font(.subheadline).foregroundStyle(Palette.muted)
            }
        case .sentence:
            SentencePrompt(text: ex.prompt, lang: ex.promptLang)
        case .cognate:
            VStack(spacing: 12) {
                AskWord(word: ex.prompt, lang: ex.promptLang, sub: "its \(name) cousin")
                if let f = ex.family?.filter({ $0.lang != ex.lang && $0.lang != ex.root }), !f.isEmpty {
                    HStack(spacing: 10) {
                        ForEach(f.prefix(3), id: \.lang) { w in MiniTile(word: w.word, lang: w.lang, reading: readings ? cousins(w.lang) : nil) }
                        MiniTile(word: nil, lang: ex.lang, reading: nil)
                    }
                }
            }
        case .speak:
            AskWord(word: ex.prompt, lang: ex.promptLang, sub: "say it in \(name)")
        default:
            AskWord(word: ex.prompt, lang: ex.promptLang, sub: "in \(name)")
        }
    }
}

extension View {
    func optionKey(_ index: Int) -> some View {
        modifier(OptionKey(index: index))
    }
}

struct OptionKey: ViewModifier {
    let index: Int

    func body(content: Content) -> some View {
        if index < 9 {
            content.keyboardShortcut(KeyEquivalent(Character(String(index + 1))), modifiers: [])
        } else {
            content
        }
    }
}
