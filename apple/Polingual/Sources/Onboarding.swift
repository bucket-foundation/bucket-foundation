import BucketKit
import SwiftUI

struct Onboarding: View {
    enum Step: Int, CaseIterable { case welcome, heard, speak, languages, reason, level, motivation, minutes, time, deadline, plan }

    @Environment(LangStore.self) private var store
    @Environment(Reminders.self) private var reminders
    @Environment(\.accessibilityReduceMotion) private var still
    let finish: (String?) -> Void
    @State private var knownSent = false
    @State private var step = PolingualLaunch.value("-onboardingStep").flatMap(Int.init).flatMap(Step.init(rawValue:)) ?? .welcome
    @State private var picks = KnownPicks(device: InterfaceLanguage.deviceRoot)
    @State private var creating = false
    @State private var failed: String?
    @State private var heard: String?
    @State private var quiz = QuizAnswers.load()

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                ForEach(Step.allCases, id: \.self) { st in
                    page(st)
                        .frame(maxWidth: 560, maxHeight: .infinity, alignment: .topLeading)
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .padding(.bottom, 64)
                        .frame(maxWidth: .infinity)
                        .tag(st)
                }
            }
            #if os(iOS)
            .tabViewStyle(.page(indexDisplayMode: .never))
            #endif
            .animation(.spring(duration: 0.4), value: step)
            footer
        }
        .background(Backdrop().ignoresSafeArea())
        .onChange(of: step, initial: true) { _, s in AppFunnel.track("onboarding_view", detail: s.funnelName) }
        .task {
            await store.load()
            if !store.known.isBlank, !picks.touched { picks = KnownPicks(device: InterfaceLanguage.deviceRoot, stored: store.known) }
        }
    }

    var root: String { picks.root }
    var targets: [String] { picks.targets }

    @ViewBuilder
    func page(_ s: Step) -> some View {
        switch s {
        case .welcome: welcome
        case .heard: heardAbout
        case .speak: speak
        case .languages: languages
        case .reason: question("Why are you learning?", options: QuizOption.reasons, picked: quiz.reason?.rawValue) { quiz.reason = QuizReason(rawValue: $0) }
        case .level: question("How much do you know already?", options: QuizOption.levels, picked: quiz.level?.rawValue) { quiz.level = QuizLevel(rawValue: $0) }
        case .motivation: motivation
        case .minutes: question("How many minutes a day?", note: "Pick an amount you can keep up every day.", options: QuizOption.minutes, picked: quiz.minutes.map { String($0.rawValue) }) { quiz.minutes = Int($0).flatMap(QuizMinutes.init(rawValue:)) }
        case .time: question("When do you want to practice?", note: "Reminders use this time when you turn them on.", options: QuizOption.times, picked: quiz.time?.rawValue) { quiz.time = QuizTime(rawValue: $0) }
        case .deadline: question("When do you want to see results?", options: QuizOption.deadlines, picked: quiz.deadline?.rawValue) { quiz.deadline = QuizDeadline(rawValue: $0) }
        case .plan: planPage
        }
    }

    var plan: PersonalPlan { PersonalPlan(quiz, languages: targets.count, now: .now) }

    func question(_ title: LocalizedStringKey, note: LocalizedStringKey? = nil, options: [QuizOption], picked: String?, pick: @escaping (String) -> Void) -> some View {
        let page = VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .accessibilityAddTraits(.isHeader)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            if let note {
                Text(note).font(PL.body.font()).foregroundStyle(PL.inkDim).fixedSize(horizontal: false, vertical: true)
            }
            FlowLayout(spacing: 8) {
                ForEach(options) { o in
                    Chip(title: o.label, on: picked == o.key) { choose(o.key, picked: picked, pick: pick) }
                        .accessibilityIdentifier("quiz-\(o.key)")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 2)
        }
        return ViewThatFits(in: .vertical) {
            page
            ScrollView { page }
        }
    }

    func choose(_ key: String, picked: String?, pick: (String) -> Void) {
        guard picked != key else { advance(); return }
        let at = step
        pick(key)
        quiz.save()
        Task {
            try? await Task.sleep(for: .milliseconds(still ? 0 : 250))
            if step == at { advance() }
        }
    }

    var motivation: some View {
        ViewThatFits(in: .vertical) {
            motivationPage
            ScrollView { motivationPage }
        }
    }

    var motivationPage: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("One word, every language")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .accessibilityAddTraits(.isHeader)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .center, spacing: 16) {
                Text(verbatim: "\(plan.newToday)")
                    .font(PL.title.font(scale: 1.6))
                    .foregroundStyle(PL.vermilion)
                    .monospacedDigit()
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) { ForEach(targets, id: \.self) { FlagTile(lang: $0, size: 28) } }
                    Text("new words in your first session").font(PL.text(15, .bold)).foregroundStyle(PL.ink).fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PL.card, in: .rect(cornerRadius: PL.Radius.lg))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(PL.hairline2, lineWidth: 2) }
            .accessibilityElement(children: .combine)
            Text("Each word you learn comes back in every language you picked, so one session moves all of them forward.")
                .font(PL.body.font())
                .foregroundStyle(PL.inkDim)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    var planPage: some View {
        ViewThatFits(in: .vertical) {
            planBody
            ScrollView { planBody }
        }
    }

    var planBody: some View {
        let p = plan
        return VStack(alignment: .leading, spacing: 14) {
            Text("Your plan")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .accessibilityAddTraits(.isHeader)
            HStack(spacing: 6) { ForEach(targets, id: \.self) { FlagTile(lang: $0, size: 32) } }
            VStack(alignment: .leading, spacing: 12) {
                PlanLine(icon: "clock", text: "\(p.minutes) minutes a day")
                if let time = quiz.time { PlanLine(icon: "bell", text: "Practice time: \(QuizOption.local(QuizOption.label(time)))") }
                PlanLine(icon: "calendar", text: "By \(p.until.formatted(.dateTime.month(.wide).day().year())): about \(p.wordsPerLanguage) words in each language")
                if let reason = quiz.reason { PlanLine(icon: "star", text: "Goal: \(QuizOption.local(QuizOption.label(reason)))") }
                if let level = quiz.level { PlanLine(icon: "chart.line.uptrend.xyaxis", text: "Starting point: \(QuizOption.local(QuizOption.label(level)))") }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(PL.card, in: .rect(cornerRadius: PL.Radius.lg))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(PL.hairline2, lineWidth: 2) }
            Text("At \(Lang.newPerLangPerDay) new words a day in each language, with reviews when each word is due.")
                .font(PL.text(13))
                .foregroundStyle(PL.inkDim)
                .fixedSize(horizontal: false, vertical: true)
            if let failed {
                Text(failed).font(PL.text(13)).foregroundStyle(PL.vermilion)
                Button("Skip for now") { finish(nil) }.buttonStyle(PlainLink())
            }
        }
    }

    var welcome: some View {
        GeometryReader { g in
            if g.size.width > g.size.height {
                HStack(alignment: .center, spacing: 20) {
                    welcomeText.frame(maxWidth: .infinity, alignment: .leading)
                    PlayfulTiles().frame(maxWidth: .infinity)
                }
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    welcomeText
                    PlayfulTiles()
                }
            }
        }
    }

    var welcomeText: some View {
        VStack(alignment: .leading, spacing: 16) {
            PLStickerLayer(Stickers.onboarding).frame(height: 96)
            PoMark()
            Text(accented("Language learning for **multilingual** learners.", PL.vermilion))
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            StreakBadge()
        }
    }

    var heardAbout: some View {
        ViewThatFits(in: .vertical) {
            heardPage
            ScrollView { heardPage }
        }
    }

    var heardPage: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("How did you hear about Polingual?")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .accessibilityAddTraits(.isHeader)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            FlowLayout(spacing: 8) {
                ForEach(HeardSource.all) { source in
                    Chip(title: source.label, on: heard == source.key) { answer(source.key) }
                        .accessibilityIdentifier("heard-\(source.key)")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 2)
        }
    }

    func answer(_ key: String) {
        guard heard == nil else { advance(); return }
        heard = key
        AppFunnel.track("heard_about", detail: key)
        Task {
            try? await Task.sleep(for: .milliseconds(still ? 0 : 250))
            if step == .heard { advance() }
        }
    }

    var speak: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Which languages do you speak?")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
                .accessibilityAddTraits(.isHeader)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            Text("Pick every one you can hold a conversation in.")
                .font(PL.body.font())
                .foregroundStyle(PL.inkDim)
                .fixedSize(horizontal: false, vertical: true)
            ScrollView {
                FlowLayout(spacing: 8) {
                    ForEach(KnownLanguages.speakable(device: picks.device), id: \.self) { l in
                        Chip(title: langName(l), langs: [l], on: picks.known.codes.contains(l)) {
                            picks.toggle(l, at: Date.now.timeIntervalSince1970 * 1000)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 2)
            }
            if picks.bases.count > 1 {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Learn from").font(PL.text(12, .bold)).foregroundStyle(PL.inkDim)
                    Text("Meanings and hints show in this language.")
                        .font(PL.text(12))
                        .foregroundStyle(PL.inkDim)
                        .fixedSize(horizontal: false, vertical: true)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(picks.bases, id: \.self) { l in
                                Chip(title: langName(l), langs: [l], on: l == root) { picks.choose(base: l) }
                                    .accessibilityLabel(Text("Learn from") + Text(verbatim: ", \(langName(l))"))
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(still ? nil : .spring(duration: 0.3), value: picks.bases)
    }

    var languages: some View {
        ViewThatFits(in: .vertical) {
            languagesPage(stickers: true)
            languagesPage(stickers: false)
            ScrollView { languagesPage(stickers: false) }
        }
    }

    func languagesPage(stickers: Bool) -> some View {
        VStack(alignment: .leading, spacing: 18) {
            if stickers { PLStickerLayer(Array(Stickers.onboarding.prefix(3))).frame(height: 96) }
            Text("Which languages?")
                .font(PL.title.font(scale: 0.94))
                .foregroundStyle(PL.ink)
            Text("Each word comes back in every language you pick.")
                .font(PL.body.font())
                .foregroundStyle(PL.inkDim)
            HStack(alignment: .top, spacing: 12) {
                ForEach(targets, id: \.self) { l in
                    VStack(spacing: 6) {
                        FlagTile(lang: l, size: 56)
                        Text(langName(l)).font(PL.text(12, .bold)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: 72)
                    .transition(.scale.combined(with: .opacity))
                }
                if targets.isEmpty { Text("Pick at least one.").font(PL.text(15)).foregroundStyle(PL.inkDim).frame(height: 76) }
            }
            .animation(.spring(duration: 0.35, bounce: 0.4), value: targets)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(PL.card, in: .rect(cornerRadius: PL.Radius.lg))
            .overlay { RoundedRectangle(cornerRadius: PL.Radius.lg).strokeBorder(PL.hairline2, lineWidth: 2) }
            FlowLayout(spacing: 8) {
                ForEach(picks.presets(LanguageSections.presets), id: \.name) { p in
                    Chip(title: p.name, langs: p.targets, on: Set(p.targets) == Set(targets)) { picks.pick(p.targets) }
                }
            }
        }
    }

    var footer: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                ForEach(Step.allCases, id: \.self) { s in
                    Capsule().fill(s == step ? PL.paper : PL.paper.opacity(0.35)).frame(width: s == step ? 22 : 8, height: 8)
                }
            }
            .accessibilityHidden(true)
            Button(label) {
                if step == .plan {
                    Task { await complete() }
                } else {
                    advance()
                }
            }
            .buttonStyle(D8Primary())
            .disabled(((step == .languages || step == .plan) && targets.isEmpty) || (step == .speak && !picks.ready) || creating)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 20)
        .frame(maxWidth: 560)
    }

    var label: String {
        switch step {
        case .welcome: "Get started"
        case .plan: creating ? "Setting up" : failed == nil ? "Start learning" : "Try again"
        default: "Continue"
        }
    }

    func advance() {
        tap()
        if let next = Step(rawValue: step.rawValue + 1) { withAnimation(.spring(duration: 0.4)) { step = next } }
    }

    func complete() async {
        guard !creating else { return }
        failed = nil
        creating = true
        defer { creating = false }
        await store.load()
        if let codes = picks.codesToSave(over: store.known) { await store.setKnown(codes) }
        if !knownSent {
            knownSent = true
            Beta.shared.knownLanguagesSet(store.known, source: .onboarding)
        }
        let existing = store.systems.first { $0.root == root && Set($0.targets) == Set(targets) }
        if let existing { done(existing.id); return }
        do {
            let s = try await store.create(root: root, targets: targets)
            done(s.id)
        } catch {
            failed = "That set could not be created. Try again, or skip and build one from the home screen."
        }
    }

    func done(_ id: String) {
        quiz.save()
        if let minute = plan.reminderMinute { reminders.customMinute = minute }
        PlanPaywall.arm()
        finish(id)
    }
}

extension Onboarding.Step {
    var funnelName: String {
        switch self {
        case .welcome: "welcome"
        case .heard: "heard_about"
        case .speak: "speak"
        case .languages: "languages"
        case .reason: "reason"
        case .level: "level"
        case .motivation: "motivation"
        case .minutes: "minutes"
        case .time: "practice_time"
        case .deadline: "deadline"
        case .plan: "plan"
        }
    }
}

enum AppFunnel {
    static let shared = PolingualFunnel()

    static var live: Bool {
        #if DEBUG
        PolingualLaunch.value("-funnel") == "on"
        #else
        true
        #endif
    }

    static func track(_ name: String, detail: String? = nil) {
        guard live else { return }
        let lang = Locale.current.language.languageCode?.identifier
        _ = shared.visitor
        Task.detached(priority: .utility) { await shared.send(name, detail: detail, lang: lang) }
    }
}

struct PoMark: View {
    var body: some View {
        HStack(spacing: 10) {
            ZStack(alignment: .topTrailing) {
                Text("Po")
                    .font(PL.heading.font(scale: 22 / PL.heading.size))
                    .foregroundStyle(PL.paper)
                    .frame(width: 48, height: 48)
                    .background(PL.tyrian, in: .rect(cornerRadius: PL.Radius.md))
                Circle().fill(PL.vermilion).frame(width: 9, height: 9).padding(6)
            }
            Text("polingual").font(PL.heading.font()).foregroundStyle(PL.ink)
        }
        .accessibilityElement()
        .accessibilityLabel("Polingual")
    }
}

struct Dots: View {
    var body: some View {
        Canvas { ctx, size in
            let step: CGFloat = 24
            var y: CGFloat = step / 2
            while y < size.height {
                var x: CGFloat = step / 2
                while x < size.width {
                    ctx.fill(Path(ellipseIn: CGRect(x: x - 1.2, y: y - 1.2, width: 2.4, height: 2.4)), with: .color(PL.paper3))
                    x += step
                }
                y += step
            }
        }
        .background(PL.paper)
        .accessibilityHidden(true)
    }
}

struct PlayfulTiles: View {
    var compact = false
    @Environment(\.accessibilityReduceMotion) private var still
    static let night: [(String, String, String)] = [
        ("es", "noche", "ˈnotʃe"), ("fr", "nuit", "nɥi"), ("it", "notte", "ˈnɔtte"), ("pt", "noite", "ˈnojtɨ"),
        ("de", "Nacht", "naxt"), ("nl", "nacht", "nɑxt"), ("sv", "natt", "natː"), ("ru", "ночь", "notʃʲ"),
        ("el", "νύχτα", "ˈnixta"), ("ja", "夜", "joɾɯ"), ("ko", "밤", "pam"), ("tr", "gece", "ɟedʒe"),
        ("hi", "रात", "raːt"), ("he", "לילה", "ˈlajla"), ("ar", "ليل", "lajl"), ("zh", "夜", "yè"),
    ]
    @State private var slots = [0, 1, 2, 3]
    @State private var angle: [Double] = [0, 0, 0, 0]
    @State private var shown = false
    @State private var floating = false

    var body: some View {
        GeometryReader { g in
            let fit = NightTiles.fit(width: g.size.width, height: g.size.height, compact: compact)
            let side = fit.side
            VStack(spacing: 12) {
                if !compact {
                    Text(accented("One word, **night**, in every language", PL.lapis))
                        .font(PL.heading.font(scale: 0.75))
                        .foregroundStyle(PL.inkDim)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: fit.row ? 12 : 16), count: fit.row ? 4 : 2), spacing: 16) {
                    ForEach(0..<4, id: \.self) { i in
                        let w = Self.night[slots[i]]
                        WordTile(word: w.1, lang: w.0, reading: Reading(ipa: w.2), size: side) {
                            tap()
                            LangVoice.shared.speak(w.1, w.0)
                        }
                            .rotation3DEffect(.degrees(angle[i]), axis: (x: 0, y: 1, z: 0), perspective: 0.4)
                            .rotationEffect(.degrees(i.isMultiple(of: 2) ? -2 : 1.5))
                            .offset(y: floating ? (i.isMultiple(of: 2) ? -4 : 4) : (i.isMultiple(of: 2) ? 3 : -3))
                            .animation(still ? nil : .easeInOut(duration: 2.4 + Double(i) * 0.35).repeatForever(autoreverses: true), value: floating)
                    }
                }
                .frame(maxWidth: .infinity)
                .opacity(shown ? 1 : 0)
                .offset(y: shown ? 0 : 16)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) { shown = true }
            floating = true
            LangVoice.shared.warm()
        }
        .task {
            guard !still else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(7))
                await flip(Int.random(in: 0..<4), speak: false)
            }
        }
    }

    func flip(_ i: Int, speak: Bool) async {
        if speak { tap() }
        let used = Set(slots)
        let next = (0..<Self.night.count).filter { !used.contains($0) }.randomElement() ?? slots[i]
        if still {
            slots[i] = next
        } else {
            withAnimation(.easeIn(duration: 0.24)) { angle[i] = 90 }
            try? await Task.sleep(for: .milliseconds(240))
            var t = Transaction()
            t.disablesAnimations = true
            withTransaction(t) {
                slots[i] = next
                angle[i] = -90
            }
            withAnimation(.easeOut(duration: 0.3)) { angle[i] = 0 }
        }
        if speak {
            let w = Self.night[next]
            if LangVoice.shared.canSpeak(w.1, w.0) { LangVoice.shared.speak(w.1, w.0, kind: .auto) }
        }
    }
}

struct QuizOption: Identifiable {
    let key: String
    let label: String
    var id: String { key }

    static let reasons: [QuizOption] = QuizReason.allCases.map { QuizOption(key: $0.rawValue, label: label($0)) }
    static let levels: [QuizOption] = QuizLevel.allCases.map { QuizOption(key: $0.rawValue, label: label($0)) }
    static let minutes: [QuizOption] = QuizMinutes.allCases.map { QuizOption(key: String($0.rawValue), label: label($0)) }
    static let times: [QuizOption] = QuizTime.allCases.map { QuizOption(key: $0.rawValue, label: label($0)) }
    static let deadlines: [QuizOption] = QuizDeadline.allCases.map { QuizOption(key: $0.rawValue, label: label($0)) }

    static func local(_ label: String) -> String { NSLocalizedString(label, comment: "") }

    static func label(_ r: QuizReason) -> String {
        switch r {
        case .travel: "Travel"
        case .family: "Family and friends"
        case .work: "Work"
        case .school: "School"
        case .culture: "Films, books and music"
        case .mind: "Keep my mind sharp"
        }
    }

    static func label(_ l: QuizLevel) -> String {
        switch l {
        case .new: "I'm new to them"
        case .words: "I know some words"
        case .getBy: "I can get by"
        case .talk: "I can hold a conversation"
        }
    }

    static func label(_ m: QuizMinutes) -> String {
        switch m {
        case .five: "5 min"
        case .ten: "10 min"
        case .fifteen: "15 min"
        case .twenty: "20 min"
        }
    }

    static func label(_ t: QuizTime) -> String {
        switch t {
        case .morning: "Morning"
        case .midday: "Midday"
        case .evening: "Evening"
        case .night: "Night"
        }
    }

    static func label(_ d: QuizDeadline) -> String {
        switch d {
        case .month: "In 1 month"
        case .quarter: "In 3 months"
        case .half: "In 6 months"
        case .year: "In a year"
        case .open: "No deadline"
        }
    }
}

enum PlanPaywall {
    static let key = "polingual.planPaywall"

    static func arm(_ defaults: UserDefaults = .standard) { defaults.set(true, forKey: key) }

    static func take(open: Bool, _ defaults: UserDefaults = .standard) -> Bool {
        guard defaults.bool(forKey: key) else { return false }
        defaults.removeObject(forKey: key)
        return !open
    }
}

struct PlanLine: View {
    let icon: String
    let text: LocalizedStringKey

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon).font(PL.text(15, .bold)).foregroundStyle(PL.lapis).frame(width: 22)
            Text(text).font(PL.text(15)).foregroundStyle(PL.ink)
        }
    }
}

struct Backdrop: View {
    var body: some View {
        PLDiagonalCut(start: 0.88, end: 0.8)
    }
}

struct StreakBadge: View {
    var body: some View {
        PLStreakFlame(days: 100, caption: String(localized: "DAY STREAK"))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("A 100 day streak")
    }
}

func accented(_ key: String.LocalizationValue, _ color: Color) -> AttributedString {
    var a = AttributedString(localized: key)
    for run in a.runs where run.inlinePresentationIntent?.contains(.stronglyEmphasized) == true {
        a[run.range].foregroundColor = color
        a[run.range].inlinePresentationIntent = nil
    }
    return a
}
