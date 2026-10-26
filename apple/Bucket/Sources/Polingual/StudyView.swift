import BucketKit
import SwiftUI

struct StudyView: View {
    @Environment(Reminders.self) private var reminders
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
    @Environment(\.verticalSizeClass) private var vertical
    @Binding var path: NavigationPath
    let systemId: String
    @State private var queue: [QueueEntry]?
    @State private var i = 0
    @State private var graded = 0
    @State private var correct = 0
    @State private var xpStart = 0.0
    @State private var rng = Rng(seed: UInt32(UInt64(Date().timeIntervalSince1970 * 1000) % 2147483647))
    @State private var current: Exercise?
    @State private var currentKey = ""
    @State private var cardStart = Date()
    @AppStorage("bucket.lang.readings") private var readings = true

    var body: some View {
        Group {
            if store.status == .error {
                StateMessage(title: "The session did not load", detail: "The language corpus files did not arrive.") { Task { await store.load(force: true) } }
            } else if store.status != .ready || (store.system(systemId) != nil && queue == nil) {
                ProgressView("Building your session")
            } else if let system = store.system(systemId), let corpus = store.corpus, let queue {
                content(system, corpus, queue)
            } else {
                StateMessage(title: "No such language system", detail: "It may have been removed on another device.", retry: nil)
            }
        }
        .paper()
        .navigationTitle(store.system(systemId)?.name ?? "Study")
        .inlineTitle()
        .task {
            LangVoice.shared.warm()
            await store.load()
        }
        .onChange(of: store.status, initial: true) { _, _ in startIfReady() }
    }

    func startIfReady() {
        guard queue == nil, store.status == .ready, let system = store.system(systemId), let corpus = store.corpus else { return }
        let state = store.state(systemId)
        xpStart = state.xp
        let wanted = WantedWords.take(systemId, carded: { id in system.targets.contains { state.cards.has(cardId($0, id)) } })
        let asked = wanted.flatMap { id in
            system.targets.filter { corpus.byId[id]?.form($0) != nil }.flatMap { l in [QueueEntry(itemId: id, lang: l, stage: .intro), QueueEntry(itemId: id, lang: l, stage: .check)] }
        }
        queue = asked + buildQueue(system, corpus, state, now: Date().timeIntervalSince1970 * 1000)
        Beta.shared.studyStarted("lang:\(system.targets.joined(separator: ","))")
        makeExercise()
    }

    func makeExercise() {
        #if DEBUG
        if let kind = Self.forcedKind, let system = store.system(systemId), let corpus = store.corpus {
            current = forced(kind, system, corpus)
            currentKey = "\(i)-forced"
            return
        }
        #endif
        guard let queue, i < queue.count, let system = store.system(systemId), let corpus = store.corpus else {
            current = nil
            return
        }
        let entry = queue[i]
        guard let item = corpus.byId[entry.itemId] else {
            current = nil
            return
        }
        let state = store.state(systemId)
        if entry.stage == .match {
            current = matchExercise(corpus, system, item, &rng)
        } else {
            let made = exerciseFor(corpus, system, item, entry.lang, state.cards[cardId(entry.lang, entry.itemId)], &rng, speech: LangListener.shared.supported, afterIntro: entry.stage == .check, level: learnerLevel(state, entry.lang))
            let crossed = Beta.shared.flags.values["option_language"] == "same" ? made : crossLanguageOptions(made, item, system, &rng)
            current = crossed
        }
        currentKey = "\(i)-\(entry.itemId)-\(entry.lang)-\(entry.stage.rawValue)"
        cardStart = .now
    }

    func done(_ results: [ExerciseResult]) {
        guard let q = queue, i < q.count else { return }
        let entry = q[i]
        var next = q
        let apply = {
            for r in results { store.grade(systemId, lang: r.lang, itemId: entry.itemId, rating: r.rating) }
        }
        let ms = Int(Date.now.timeIntervalSince(cardStart) * 1000)
        for r in results { Beta.shared.answered("lang:\(r.lang)", correct: r.rating > 1, ms: ms, kind: current?.kind.rawValue ?? "") }
        if !results.isEmpty {
            reminders.noteStudy()
            if gate.guest && !store.guestMayStudy(systemId) { gate.require(apply) } else { apply() }
        }
        for r in results where r.rating == 1 {
            next = requeueAfterMiss(next, i, QueueEntry(itemId: entry.itemId, lang: r.lang, stage: .review))
        }
        graded += results.count
        correct += results.filter { $0.rating > 1 }.count
        queue = next
        i += 1
        makeExercise()
    }

    @ViewBuilder
    func content(_ system: LangSystem, _ corpus: LangCorpus, _ queue: [QueueEntry]) -> some View {
        let state = store.state(systemId)
        if queue.isEmpty {
            StateMessage(title: "Nothing due", detail: "You have met today's new words in every language of this set. Come back tomorrow.", retry: nil)
        } else if i >= queue.count || current == nil {
            VStack(spacing: 16) {
                Image(systemName: "checkmark").font(.system(size: 34, weight: .heavy)).foregroundStyle(.white)
                    .frame(width: 76, height: 76).background(D8.malachite, in: .circle)
                    .onAppear {
                        haptic(true)
                        Beta.shared.studyEnded("lang:\(system.targets.joined(separator: ","))", graded: graded, correct: correct)
                    }
                Text("Session done").font(.system(size: 30, weight: .bold, design: .rounded))
                ReminderPrompt()
                FeedbackLink()
                Text("\(correct) of \(graded) right · +\(Int(state.xp - xpStart)) xp · \(Int(state.streak)) day streak")
                    .foregroundStyle(Palette.muted)
                    .monospacedDigit()
                ShareProgress(langs: system.targets, streak: Int(state.streak), learned: systemSummary(system, corpus, state, now: Date().timeIntervalSince1970 * 1000).started)
                Button("See progress") {
                    path.removeLast()
                    path.append(LangRoute.system(system.id))
                }
                .buttonStyle(D8Primary())
                Button("Another round") {
                    self.queue = buildQueue(system, corpus, state, now: Date().timeIntervalSince1970 * 1000)
                    i = 0
                    graded = 0
                    correct = 0
                    xpStart = state.xp
                    makeExercise()
                }
                .buttonStyle(D8Option(align: .center))
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .modifier(AskForReview(streak: Int(state.streak), graded: graded, correct: correct))
        } else if let ex = current {
            let maps = readingMaps(ex, corpus)
            let page = VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 10) {
                    ProgressView(value: Double(i), total: Double(queue.count)).tint(D8.malachite)
                    Text("\(i + 1)/\(queue.count)").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                }
                ExerciseView(ex: ex, readings: readings, reading: { form, lang in maps[lang]?[form] }, onDone: done)
                    .id(currentKey)
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
            .padding(.bottom, 12)
            .frame(maxWidth: 900, alignment: .top)
            .frame(maxWidth: .infinity)
            Group {
                if vertical == .compact {
                    page.frame(maxHeight: .infinity, alignment: .top)
                } else {
                    ScrollView { page }
                        .scrollBounceBehavior(.basedOnSize)
                        .scrollDismissesKeyboard(.interactively)
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button("Skip this one", systemImage: "forward") {
                            i += 1
                            makeExercise()
                        }
                        Toggle("Show readings and IPA", systemImage: "character.phonetic", isOn: $readings)
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                    .accessibilityLabel("Session options")
                }
            }
        }
    }

    func readingMaps(_ ex: Exercise, _ corpus: LangCorpus) -> [String: [String: Reading]] {
        var langs: Set<String> = [ex.answerLang, ex.lang, ex.promptLang]
        langs.formUnion((ex.optionLangs ?? [:]).values)
        langs.formUnion((ex.family ?? []).map(\.lang))
        langs.formUnion((ex.pairs ?? []).map(\.lang))
        var out: [String: [String: Reading]] = [:]
        for l in langs { out[l] = readingsByForm(corpus, l) }
        return out
    }

    #if DEBUG
    static let forcedKind: ExerciseKind? = {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-forceKind"), i + 1 < args.count else { return nil }
        return ExerciseKind(rawValue: args[i + 1])
    }()

    func forced(_ kind: ExerciseKind, _ system: LangSystem, _ corpus: LangCorpus) -> Exercise? {
        for _ in 0..<4000 {
            let item = corpus.items[rng.index(corpus.items.count)]
            let lang = system.targets[rng.index(system.targets.count)]
            guard item.form(lang) != nil, item.form(system.root) != nil else { continue }
            if item.kind == .conj && item.conj[lang] == nil { continue }
            if item.kind == .gender && item.gender[lang] == nil { continue }
            if kind == .match {
                if let m = matchExercise(corpus, system, item, &rng) { return m }
                continue
            }
            var card = Card(state: rng.next() < 0.3 ? "relearning" : "review")
            card.reps = Double(rng.index(6))
            card.lapses = Double(rng.index(2))
            let made = exerciseFor(corpus, system, item, lang, kind == .intro ? nil : card, &rng, speech: true, afterIntro: false, level: 3)
            if made.kind == kind { return crossLanguageOptions(made, item, system, &rng) }
        }
        return nil
    }
    #endif
}
