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
            .background(Palette.card, in: .rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.rule))
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

enum OptionState { case idle, right, wrongPick, other }

struct OptionButton: View {
    let text: String
    let lang: String
    let reading: Reading?
    let state: OptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 2) {
                Text(text).strikethrough(state == .wrongPick).font(.body).foregroundStyle(Palette.ink)
                ReadingLine(reading: reading, on: true)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .background(state == .right ? Palette.gold.opacity(0.85) : Palette.paper.opacity(0.6), in: .rect(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Palette.rule))
            .opacity(state == .wrongPick ? 0.6 : 1)
        }
        .buttonStyle(.plain)
        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
    }
}

struct ExerciseView: View {
    let ex: Exercise
    let readings: Bool
    let optionReadings: [String: Reading]
    let onDone: ([ExerciseResult]) -> Void
    var switched = false
    var setWords: [LangWord] = []

    @State private var picked: String?
    @State private var typed = ""
    @State private var verdict: Verdict?
    @State private var heard: String?
    @State private var listening = false
    @State private var assign: [String: String] = [:]
    @State private var matchDone = false
    @State private var built: [Int] = []
    @State private var started = Date()
    @FocusState private var focused: Bool

    var accepted: [String] { ex.accept ?? [ex.answer] }
    var slow: Bool { Date().timeIntervalSince(started) > 15 }

    func finish(_ ok: Bool, _ v: Verdict? = nil) {
        onDone([ExerciseResult(lang: ex.lang, rating: v.map { verdictRating($0, hesitated: slow) } ?? (ok ? (slow ? 2 : 3) : 1))])
    }

    var header: some View {
        SubjectTile(subject: .language(ex.lang), caption: "\(ex.kind.label)\(ex.level.flatMap { Lang.levelLabel[Int($0)] }.map { " · \($0)" } ?? "")", highlight: switched)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            switch ex.kind {
            case .intro: intro
            case .match: match
            case .wordbank: wordbank
            default: standard
            }
        }
        .exerciseCard()
        .onAppear {
            started = Date()
            if ex.kind == .listen || ex.kind == .typeHeard { LangVoice.shared.speak(ex.prompt, ex.promptLang) }
            if ex.kind == .intro { LangVoice.shared.speak(ex.answer, ex.answerLang) }
        }
    }

    var intro: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(Lang.name(ex.promptLang)): \(ex.prompt)").font(.subheadline).foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline) {
                Text(ex.answer).font(.serif(.largeTitle)).foregroundStyle(Palette.ink).textSelection(.enabled)
                PlayButton(text: ex.answer, lang: ex.answerLang)
            }
            ReadingLine(reading: ex.answerReading, on: readings)
            FamilyLine(ex: ex)
            FalseFriendNote(ex: ex)
            if let note = ex.note { Text(note).font(.caption).foregroundStyle(Palette.muted) }
            if !setWords.isEmpty { WordSetTiles(words: setWords).padding(.top, 6) }
            Button("Got it") { onDone([]) }.buttonStyle(.borderedProminent).padding(.top, 6)
        }
    }

    var match: some View {
        let pairs = ex.pairs ?? []
        let langs = pairs.map(\.lang)
        return VStack(alignment: .leading, spacing: 12) {
            Text("Match each word for **\(ex.prompt)** to its language.").font(.serif(.title3))
            ForEach(pairs, id: \.lang) { p in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(p.word).font(.serif(.title3))
                            PlayButton(text: p.word, lang: p.lang)
                        }
                        ReadingLine(reading: p.reading, on: readings)
                    }
                    Spacer()
                    Picker("Language of \(p.word)", selection: Binding(get: { assign[p.lang] ?? "" }, set: { assign[p.lang] = $0 })) {
                        Text("Choose").tag("")
                        ForEach(langs, id: \.self) { Text(Lang.name($0)).tag($0) }
                    }
                    .disabled(matchDone)
                    .labelsHidden()
                    if matchDone {
                        Text(pairs.first { $0.lang == assign[p.lang] }?.word == p.word ? "right" : Lang.name(p.lang)).font(.caption).foregroundStyle(Palette.muted)
                    }
                }
            }
            if !matchDone {
                Button("Check") { matchDone = true }
                    .buttonStyle(.borderedProminent)
                    .disabled(assign.values.filter { !$0.isEmpty }.count < pairs.count)
            } else {
                FamilyLine(ex: ex)
                Button("Continue") {
                    onDone(gradeMatch(pairs, assign).map { ExerciseResult(lang: $0.lang, rating: $0.correct ? 3 : 1) })
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    var wordbank: some View {
        let tokens = ex.tokens ?? []
        let answerText = joinTokens(built.map { tokens[$0] }, ex.lang)
        return VStack(alignment: .leading, spacing: 12) {
            PromptView(ex: ex, readings: readings)
            FlowLayout(spacing: 8) {
                ForEach(Array(built.enumerated()), id: \.offset) { k, ti in
                    Button(tokens[ti]) { built.remove(at: k) }
                        .buttonStyle(.bordered)
                        .disabled(verdict != nil)
                }
            }
            .frame(minHeight: 44, alignment: .topLeading)
            .overlay(alignment: .bottom) { Rectangle().fill(Palette.ink).frame(height: 1) }
            .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
            FlowLayout(spacing: 8) {
                ForEach(Array(tokens.enumerated()), id: \.offset) { ti, t in
                    Button(t) { built.append(ti) }
                        .buttonStyle(.bordered)
                        .tint(Palette.ink)
                        .disabled(built.contains(ti) || verdict != nil)
                        .opacity(built.contains(ti) ? 0.3 : 1)
                }
            }
            .environment(\.layoutDirection, Lang.isRTL(ex.lang) ? .rightToLeft : .leftToRight)
            if let verdict {
                Feedback(ok: verdict != .wrong, verdict: verdict, ex: ex, readings: readings) { finish(verdict != .wrong, verdict) }
            } else {
                Button("Check") { verdict = judgeTyped(answerText, accepted, ex.lang) }
                    .buttonStyle(.borderedProminent)
                    .disabled(built.isEmpty)
            }
        }
    }

    var typedKind: Bool {
        ex.kind == .translate || ex.kind == .typeHeard || (ex.kind == .conjugate && ex.options == nil) || (ex.kind == .speak && (!LangListener.shared.supported || heard == ""))
    }

    var standard: some View {
        let mc = ex.options != nil && !typedKind
        let showReading = ex.answerLang == ex.lang && ex.kind != .gender && ex.kind != .conjugate
        return VStack(alignment: .leading, spacing: 12) {
            PromptView(ex: ex, readings: readings)
            if mc, let options = ex.options {
                let cols = ex.kind == .sentence ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 220))]
                LazyVGrid(columns: cols, spacing: 8) {
                    ForEach(options, id: \.self) { o in
                        OptionButton(text: o, lang: ex.answerLang, reading: showReading && readings ? optionReadings[o] : nil, state: picked == nil ? .idle : accepted.contains(o) ? .right : o == picked ? .wrongPick : .other) {
                            if picked == nil { picked = o }
                        }
                        .disabled(picked != nil)
                    }
                }
                if let picked {
                    Feedback(ok: accepted.contains(picked), verdict: nil, ex: ex, readings: readings) { finish(accepted.contains(picked)) }
                }
            }
            if ex.kind == .speak && !typedKind && verdict == nil {
                HStack {
                    Button(listening ? "Listening" : "Speak") { Task { await micTry() } }
                        .buttonStyle(.borderedProminent)
                        .disabled(listening)
                    Button("Type instead") { heard = "" }.buttonStyle(.bordered)
                }
            }
            if ex.kind == .speak, let heard, !heard.isEmpty, verdict != nil {
                Text("Heard: \(heard)").font(.caption).foregroundStyle(Palette.muted)
            }
            if typedKind && verdict == nil {
                HStack {
                    TextField("Answer in \(Lang.name(ex.answerLang))", text: $typed)
                        .textFieldStyle(.roundedBorder)
                        .autocorrectionDisabled()
                        .langInput(ex.answerLang)
                        .focused($focused)
                        .onSubmit { verdict = judgeTyped(typed, accepted, ex.answerLang) }
                        .onAppear { focused = true }
                    Button("Check") { verdict = judgeTyped(typed, accepted, ex.answerLang) }
                        .buttonStyle(.borderedProminent)
                }
            }
            if let verdict {
                Feedback(ok: verdict != .wrong, verdict: verdict, ex: ex, readings: readings) { finish(verdict != .wrong, verdict) }
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

struct FamilyLine: View {
    let ex: Exercise

    var body: some View {
        if let f = ex.family, !f.isEmpty {
            Text("SAME ROOT ").font(.caption2.weight(.semibold)).foregroundStyle(Palette.muted)
                + Text(f.map { "\(Lang.name($0.lang)) \($0.word)" }.joined(separator: " · ")).font(.subheadline).foregroundStyle(Palette.ink)
        }
    }
}

struct FalseFriendNote: View {
    let ex: Exercise

    var body: some View {
        if let f = ex.falseFriend {
            Text("False friend: \(Lang.name(f.lang)) \(f.word) means \(f.means). It looks like English \(f.looksLike).\(f.crossWith.map { " \(Lang.name($0.lang)) \($0.word) means \($0.means)." } ?? "")")
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

struct Feedback: View {
    let ok: Bool
    let verdict: Verdict?
    let ex: Exercise
    let readings: Bool
    let onNext: () -> Void

    var body: some View {
        let targetText = ex.answerLang == ex.lang ? ex.answer : ex.prompt
        VStack(alignment: .leading, spacing: 8) {
            Divider().overlay(Palette.rule)
            HStack(alignment: .firstTextBaseline) {
                (Text(ok ? (verdict == .close ? "Close. Check the spelling and accents: " : "Right: ") : "The answer: ") + Text(shownAnswer(ex)).bold())
                    .foregroundStyle(Palette.ink)
                PlayButton(text: ex.kind == .gender ? shownAnswer(ex) : targetText, lang: ex.lang)
            }
            .accessibilityAddTraits(.updatesFrequently)
            ReadingLine(reading: ex.answerLang == ex.lang ? ex.answerReading : ex.promptReading, on: readings)
            FamilyLine(ex: ex)
            FalseFriendNote(ex: ex)
            if let note = ex.note, !ok || ex.kind == .conjugate || ex.kind == .gender {
                Text(note).font(.caption).foregroundStyle(Palette.muted)
            }
            Button("Continue", action: onNext)
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
                .padding(.top, 4)
        }
        .onAppear {
            #if os(iOS)
            UINotificationFeedbackGenerator().notificationOccurred(ok ? .success : .error)
            #endif
        }
    }
}

struct PromptView: View {
    let ex: Exercise
    let readings: Bool

    var body: some View {
        Group {
            switch ex.kind {
            case .cloze:
                if let c = ex.cloze {
                    (Text(c.before) + Text("______").foregroundStyle(Palette.muted) + Text(c.after) + Text(" (\(ex.prompt))").font(.caption).foregroundStyle(Palette.muted))
                }
            case .listen, .typeHeard:
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Listen and \(ex.kind == .listen ? "pick the \(Lang.name(ex.answerLang)) meaning" : "type the word").")
                        PlayButton(text: ex.prompt, lang: ex.promptLang, label: "Play again")
                    }
                    if !LangVoice.shared.canSpeak(ex.prompt, ex.promptLang) {
                        Text(ex.prompt).font(.serif(.title2))
                        ReadingLine(reading: ex.promptReading, on: readings)
                    }
                }
            case .gender:
                Text("Which article goes with **\(ex.prompt)**? ") + Text("(\(ex.promptReading?.roman ?? ""))").font(.caption).foregroundStyle(Palette.muted)
            case .conjugate:
                Text("\(ex.tense == "past" ? "Past tense" : "Present tense") of **\(ex.prompt)** ") + Text("(\(ex.promptReading?.roman ?? ""))").font(.caption).foregroundStyle(Palette.muted) + Text(": **\(ex.person ?? "") ___**")
            case .falseFriend:
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("What does \(Lang.name(ex.lang)) **\(ex.prompt)** mean?")
                        PlayButton(text: ex.prompt, lang: ex.lang)
                    }
                    ReadingLine(reading: ex.promptReading, on: readings)
                }
            case .sentence, .wordbank:
                Text("\(Lang.name(ex.answerLang)) for **\(ex.prompt)**")
            case .cognate:
                Text("Which \(Lang.name(ex.answerLang)) word shares a root with \(Lang.name(ex.promptLang)) **\(ex.prompt)**?")
            case .speak:
                Text("Say **\(ex.prompt)** in \(Lang.name(ex.answerLang)).")
            case .reverse:
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("What does this mean in \(Lang.name(ex.answerLang))? **\(ex.prompt)**")
                        PlayButton(text: ex.prompt, lang: ex.promptLang)
                    }
                    ReadingLine(reading: ex.promptReading, on: readings)
                }
            default:
                Text("\(Lang.name(ex.answerLang)) for **\(ex.prompt)**")
            }
        }
        .font(.serif(.title3))
        .foregroundStyle(Palette.ink)
    }
}
