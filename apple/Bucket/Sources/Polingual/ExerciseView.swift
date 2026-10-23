import BucketKit
import SwiftUI

struct ExerciseResult {
    let lang: String
    let rating: Rating
}

extension View {
    func exerciseCard() -> some View {
        padding(18)
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
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(text).multilineTextAlignment(.leading)
                if let r = readingText(reading) { Text(r).font(.caption).foregroundStyle(D8.ipa) }
            }
            .padding(.vertical, 10)
        }
        .buttonStyle(D8Option(selected: selected))
        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
        .accessibilityLabel("\(text), \(Lang.name(lang))")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct ExerciseView: View {
    let ex: Exercise
    let readings: Bool
    let reading: (String, String) -> Reading?
    let onDone: ([ExerciseResult]) -> Void

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
    @FocusState private var focused: Bool

    var accepted: [String] { ex.accept ?? [ex.answer] }
    var slow: Bool { Date().timeIntervalSince(started) > 15 }
    var targetName: String { Lang.name(ex.lang) }

    func finish(_ ok: Bool, _ v: Verdict? = nil) {
        onDone([ExerciseResult(lang: ex.lang, rating: v.map { verdictRating($0, hesitated: slow) } ?? (ok ? (slow ? 2 : 3) : 1))])
    }

    func r(_ form: String, _ lang: String) -> Reading? { readings ? reading(form, lang) : nil }

    var headerText: String {
        let level = ex.level.flatMap { Lang.levelLabel[Int($0)] }.map { " · \($0)" } ?? ""
        return ex.kind == .match ? "\(ex.prompt) · \(ex.kind.label)\(level)" : "\(ex.kind.label)\(level)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            CardHeader(lang: ex.kind == .match ? nil : ex.lang, text: headerText)
            switch ex.kind {
            case .intro: intro
            case .match: match
            case .wordbank: wordbank
            default: standard
            }
        }
        .exerciseCard()
        .onAppear {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("-pickWrong") {
                picked = ex.options?.first { !accepted.contains($0) }
                if ex.options == nil { verdict = .wrong; typed = "xyz" }
            }
            #endif
            started = Date()
            if ex.kind == .listen || ex.kind == .typeHeard { LangVoice.shared.speak(ex.prompt, ex.promptLang) }
            if ex.kind == .intro { LangVoice.shared.speak(ex.answer, ex.answerLang) }
        }
    }

    var intro: some View {
        VStack(spacing: 12) {
            WordTile(word: ex.answer, lang: ex.answerLang, reading: readings ? ex.answerReading : nil)
            Text(ex.prompt).font(.subheadline).foregroundStyle(Palette.muted).frame(maxWidth: .infinity)
            Notes(ex: ex, showNote: true)
            Button("Got it") { onDone([]) }.buttonStyle(D8Primary())
        }
    }

    var match: some View {
        let pairs = ex.pairs ?? []
        let langs = pairs.map(\.lang)
        let placed = Set(assign.keys)
        return VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(langs, id: \.self) { l in
                    let word = assign.first { $0.value == l }.map { k in pairs.first { $0.lang == k.key }?.word ?? "" }
                    Button {
                        guard !matchDone, let h = holding else { return }
                        assign = assign.filter { $0.value != l }
                        assign[h] = l
                        holding = nil
                    } label: {
                        VStack(spacing: 6) {
                            FlagTile(lang: l, size: 64)
                            Text(Lang.name(l)).font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                            Text(word ?? " ").font(D8.word(15)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.6)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(Lang.name(l))\(word.map { ", holds \($0)" } ?? "")")
                }
            }
            if matchDone {
                VStack(spacing: 12) {
                    ForEach(pairs, id: \.lang) { p in
                        let ok = pairs.first { $0.lang == assign[p.lang] }?.word == p.word
                        WideTile(word: p.word, lang: p.lang, reading: r(p.word, p.lang), state: ok ? .right : .wrong)
                    }
                }
                Notes(ex: ex, showNote: false)
                Button("Continue") {
                    onDone(gradeMatch(pairs, assign).map { ExerciseResult(lang: $0.lang, rating: $0.correct ? 3 : 1) })
                }
                .buttonStyle(D8Primary())
            } else {
                VStack(spacing: 10) {
                    ForEach(pairs.filter { !placed.contains($0.lang) }, id: \.lang) { p in
                        OptionButton(text: p.word, lang: p.lang, reading: nil, selected: holding == p.lang) { holding = p.lang }
                    }
                }
                Button("Check") { matchDone = true }
                    .buttonStyle(D8Primary())
                    .disabled(assign.count < pairs.count)
            }
        }
    }

    var wordbank: some View {
        let tokens = ex.tokens ?? []
        let answerText = joinTokens(built.map { tokens[$0] }, ex.lang)
        return VStack(alignment: .leading, spacing: 14) {
            SentencePrompt(text: ex.prompt)
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

    var typedKind: Bool {
        ex.kind == .translate || ex.kind == .typeHeard || (ex.kind == .conjugate && ex.options == nil) || (ex.kind == .speak && (!LangListener.shared.supported || heard == ""))
    }

    func optionLang(_ o: String) -> String { ex.optionLangs?[o] ?? ex.answerLang }

    var standard: some View {
        let mc = ex.options != nil && !typedKind
        let sameLangReadings = ex.kind != .gender && ex.kind != .conjugate
        return VStack(alignment: .leading, spacing: 14) {
            Prompt(ex: ex, readings: readings, cousins: { l in r(ex.family?.first { $0.lang == l }?.word ?? "", l) })
            if mc, let options = ex.options {
                if let picked {
                    VStack(spacing: 12) {
                        ForEach(options, id: \.self) { o in
                            let state: TileState = accepted.contains(o) ? .right : o == picked ? .wrong : .dim
                            WideTile(word: o, lang: optionLang(o), reading: sameLangReadings ? r(o, optionLang(o)) : nil, state: state)
                        }
                    }
                    Notes(ex: ex, showNote: !accepted.contains(picked) || ex.kind == .conjugate || ex.kind == .gender)
                    Button("Continue") { finish(accepted.contains(picked)) }
                        .buttonStyle(D8Primary())
                        .keyboardShortcut(.defaultAction)
                        .onAppear { haptic(accepted.contains(picked)) }
                } else {
                    let row = ex.kind == .gender && options.count <= 3
                    let cols = row ? Array(repeating: GridItem(.flexible(), spacing: 10), count: options.count) : [GridItem(.flexible())]
                    LazyVGrid(columns: cols, spacing: 10) {
                        ForEach(options, id: \.self) { o in
                            OptionButton(text: o, lang: optionLang(o), reading: nil, selected: selected == o) { selected = o }
                        }
                    }
                    Button("Check") { picked = selected }
                        .buttonStyle(D8Primary())
                        .disabled(selected == nil)
                }
            }
            if ex.kind == .speak && !typedKind && verdict == nil {
                Button {
                    Task { await micTry() }
                } label: {
                    Label(listening ? "Listening" : "Speak", systemImage: "mic.fill")
                }
                .buttonStyle(D8Primary())
                .disabled(listening)
                Button("Type instead") { heard = "" }.buttonStyle(PlainLink())
            }
            if typedKind && verdict == nil {
                TextField(ex.kind == .typeHeard ? "Type what you hear" : "Your answer", text: $typed)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(D8.ink)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 52)
                    .background(.white, in: .rect(cornerRadius: 12))
                    .overlay { RoundedRectangle(cornerRadius: 12).strokeBorder(D8.keyline, lineWidth: 2) }
                    .autocorrectionDisabled()
                    .langInput(ex.answerLang)
                    .focused($focused)
                    .onSubmit { if !typed.isEmpty { verdict = judgeTyped(typed, accepted, ex.answerLang) } }
                    .onAppear { focused = true }
                Button("Check") { verdict = judgeTyped(typed, accepted, ex.answerLang) }
                    .buttonStyle(D8Primary())
                    .disabled(typed.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            if let verdict {
                Answered(ex: ex, ok: verdict != .wrong, verdict: verdict, given: ex.kind == .speak ? heard : typed, reading: r(ex.lang == ex.answerLang ? ex.answer : ex.prompt, ex.lang)) { finish(verdict != .wrong, verdict) }
            }
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
            WideTile(word: target, lang: ex.lang, reading: reading, state: .right)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            FamilyLine(ex: ex)
            FalseFriendNote(ex: ex)
            if showNote, let note = ex.note, !note.isEmpty { Text(note).font(.caption).foregroundStyle(Palette.muted) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FamilyLine: View {
    let ex: Exercise

    var body: some View {
        if let f = ex.family?.filter({ $0.lang != ex.lang && $0.lang != ex.root }), !f.isEmpty {
            Text("SAME ROOT ").font(.caption2.weight(.semibold)).foregroundStyle(Palette.muted)
                + Text(f.map { "\(Lang.name($0.lang)) \($0.word)" }.joined(separator: " · ")).font(.subheadline).foregroundStyle(Palette.ink)
        }
    }
}

struct FalseFriendNote: View {
    let ex: Exercise

    var body: some View {
        if let f = ex.falseFriend {
            Text("False friend: \(f.word) means \(f.means). It looks like English \(f.looksLike).\(f.crossWith.map { " \(Lang.name($0.lang)) \($0.word) means \($0.means)." } ?? "")")
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

    var body: some View {
        Text(text).font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink).multilineTextAlignment(.center).frame(maxWidth: .infinity)
    }
}

struct AskWord: View {
    let word: String
    let sub: String?

    var body: some View {
        VStack(spacing: 4) {
            Text(word).font(.system(size: 46, weight: .bold, design: .rounded)).foregroundStyle(Palette.ink).lineLimit(2).minimumScaleFactor(0.5).multilineTextAlignment(.center)
            if let sub { Text(sub).font(.title3).foregroundStyle(Palette.muted).multilineTextAlignment(.center) }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}

struct Prompt: View {
    let ex: Exercise
    let readings: Bool
    let cousins: (String) -> Reading?

    var body: some View {
        let name = Lang.name(ex.lang)
        switch ex.kind {
        case .cloze:
            VStack(spacing: 6) {
                if let c = ex.cloze {
                    (Text(c.before) + Text("______").foregroundStyle(Palette.muted) + Text(c.after))
                        .font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
                }
                Text(ex.prompt).font(.subheadline).foregroundStyle(Palette.muted)
            }
            .frame(maxWidth: .infinity)
        case .listen, .typeHeard:
            VStack(spacing: 10) {
                WordTile(word: LangVoice.shared.canSpeak(ex.prompt, ex.promptLang) ? nil : ex.prompt, lang: ex.promptLang, reading: nil, size: 150, speakText: ex.prompt)
                if ex.kind == .listen { Text("Pick the meaning").font(.subheadline).foregroundStyle(Palette.muted) }
            }
        case .gender:
            VStack(spacing: 4) {
                (Text("______ ").foregroundStyle(Palette.muted) + Text(ex.prompt)).font(.serif(.title, weight: .semibold)).foregroundStyle(Palette.ink)
                if let g = ex.promptReading?.roman { Text(g).font(.subheadline).foregroundStyle(Palette.muted) }
            }
            .frame(maxWidth: .infinity)
        case .conjugate:
            VStack(spacing: 8) {
                WordTile(word: ex.prompt, lang: ex.lang, reading: nil, size: 150)
                Text([ex.promptReading?.roman, ex.tense == "past" ? "past" : "present"].compactMap { $0 }.joined(separator: " · ")).font(.subheadline).foregroundStyle(Palette.muted)
                (Text("\(ex.person ?? "") ") + Text("______").foregroundStyle(Palette.muted)).font(.serif(.title2, weight: .semibold)).foregroundStyle(Palette.ink)
            }
        case .falseFriend, .reverse:
            VStack(spacing: 10) {
                if D8Fit.wide(ex.prompt) {
                    WideTile(word: ex.prompt, lang: ex.lang, reading: readings ? ex.promptReading : nil, label: false)
                } else {
                    WordTile(word: ex.prompt, lang: ex.lang, reading: readings ? ex.promptReading : nil, size: ex.kind == .falseFriend ? 150 : 190)
                }
                Text("What does it mean?").font(.subheadline).foregroundStyle(Palette.muted)
            }
        case .sentence:
            SentencePrompt(text: ex.prompt)
        case .cognate:
            VStack(spacing: 12) {
                AskWord(word: ex.prompt, sub: "its \(name) cousin")
                if let f = ex.family?.filter({ $0.lang != ex.lang && $0.lang != ex.root }), !f.isEmpty {
                    HStack(spacing: 10) {
                        ForEach(f.prefix(3), id: \.lang) { w in MiniTile(word: w.word, lang: w.lang, reading: readings ? cousins(w.lang) : nil) }
                        MiniTile(word: nil, lang: ex.lang, reading: nil)
                    }
                }
            }
        case .speak:
            AskWord(word: "Say \(ex.prompt)", sub: "in \(name)")
        default:
            AskWord(word: ex.prompt, sub: "in \(name)")
        }
    }
}
