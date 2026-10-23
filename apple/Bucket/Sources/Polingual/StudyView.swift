import BucketKit
import SwiftUI

struct StudyView: View {
    @Environment(Reminders.self) private var reminders
    @Environment(LangStore.self) private var store
    @Environment(Gate.self) private var gate
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
        .task { await store.load() }
        .onChange(of: store.status, initial: true) { _, _ in startIfReady() }
    }

    func startIfReady() {
        guard queue == nil, store.status == .ready, let system = store.system(systemId), let corpus = store.corpus else { return }
        let state = store.state(systemId)
        xpStart = state.xp
        queue = buildQueue(system, corpus, state, now: Date().timeIntervalSince1970 * 1000)
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
            current = crossLanguageOptions(made, item, system, &rng)
        }
        currentKey = "\(i)-\(entry.itemId)-\(entry.lang)-\(entry.stage.rawValue)"
    }

    func done(_ results: [ExerciseResult]) {
        guard let q = queue, i < q.count else { return }
        let entry = q[i]
        var next = q
        let apply = {
            for r in results { store.grade(systemId, lang: r.lang, itemId: entry.itemId, rating: r.rating) }
        }
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
                Image(systemName: "checkmark.seal.fill").font(.system(size: 56)).foregroundStyle(Palette.green)
                Text("Session done").font(.serif(.title, weight: .semibold))
                ReminderPrompt()
                Text("\(correct) of \(graded) right · +\(Int(state.xp - xpStart)) xp · \(Int(state.streak)) day streak")
                    .foregroundStyle(Palette.muted)
                    .monospacedDigit()
                Button("See progress") {
                    path.removeLast()
                    path.append(LangRoute.system(system.id))
                }
                .buttonStyle(.borderedProminent)
                Button("Another round") {
                    self.queue = buildQueue(system, corpus, state, now: Date().timeIntervalSince1970 * 1000)
                    i = 0
                    graded = 0
                    correct = 0
                    xpStart = state.xp
                    makeExercise()
                }
                .buttonStyle(.bordered)
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let ex = current {
            let entry = queue[i]
            let unitTitle = corpus.byId[entry.itemId].map { corpus.units[$0.unit].title }
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text(system.name).lineLimit(1)
                        Spacer()
                        Text("\(i + 1) / \(queue.count) · \(Int(state.xp)) xp\(unitTitle.map { " · unit: \($0)" } ?? "")").lineLimit(1)
                    }
                    .font(.caption)
                    .foregroundStyle(Palette.muted)
                    .monospacedDigit()
                    ProgressView(value: Double(i), total: Double(queue.count)).tint(Palette.gold)
                    let maps = readingMaps(ex, corpus)
                    ExerciseView(ex: ex, readings: readings, reading: { form, lang in maps[lang]?[form] }, onDone: done)
                        .id(currentKey)
                    HStack {
                        Button("Skip this one") {
                            i += 1
                            makeExercise()
                        }
                        .font(.footnote)
                        .buttonStyle(.borderless)
                        Spacer()
                        Toggle("Show readings and IPA", isOn: $readings).font(.footnote).fixedSize()
                    }
                    .foregroundStyle(Palette.muted)
                }
                .padding(20)
                .frame(maxWidth: 680, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
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
