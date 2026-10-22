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
            current = exerciseFor(corpus, system, item, entry.lang, state.cards[cardId(entry.lang, entry.itemId)], &rng, speech: LangListener.shared.supported, afterIntro: entry.stage == .check, level: learnerLevel(state, entry.lang))
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
                Text("Session done").font(.serif(.title, weight: .semibold)).onAppear { reminders.noteStudy() }
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
                    ExerciseView(ex: ex, readings: readings, optionReadings: readingsByForm(corpus, ex.answerLang), onDone: done,
                                 switched: i > 0 && queue[i - 1].lang != entry.lang,
                                 setWords: ex.kind == .intro ? corpus.byId[entry.itemId].map { item in system.targets.compactMap { l in item.form(l).map { LangWord(lang: l, word: $0, reading: item.readings[l]) } } } ?? [] : [])
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
}
