import BucketKit
import SwiftUI

struct PlacementView: View {
    @Environment(LangStore.self) private var store
    @Binding var path: NavigationPath
    let systemId: String
    let requested: String?
    @State private var lang: String?
    @State private var rng = Rng(seed: UInt32(UInt64(Date().timeIntervalSince1970 * 1000) % 2147483647))
    @State private var answers: [CefrAnswer] = []
    @State private var seen = Set<String>()
    @State private var question: (band: CefrBand, task: CefrTask, ex: Exercise)?
    @State private var top: [TopWord]?
    @State private var result: CefrPlacement?
    @State private var asked = 0
    @AppStorage("bucket.lang.readings") private var readings = true
    @AppStorage("bucket.lang.placeQueue") private var queue = ""
    @State private var picking = false
    @State private var known = Set<String>()

    var body: some View {
        Group {
            if store.status != .ready {
                ProgressView("Loading placement")
            } else if picking, let system = store.system(systemId) {
                picker(system)
            } else if let system = store.system(systemId), let corpus = store.corpus, let lang {
                content(system, corpus, lang)
            } else if store.system(systemId) == nil {
                StateMessage(title: "No such language system", detail: "It may have been removed on another device.", retry: nil)
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle("Placement")
        .inlineTitle()
        .task { await store.load() }
        .onChange(of: store.status, initial: true) { _, _ in start() }
    }

    func source(_ system: LangSystem, _ corpus: LangCorpus, _ lang: String) -> PlacementSource {
        PlacementSource(system: system, corpus: corpus, lang: lang, top: top)
    }

    func start() {
        guard lang == nil, !picking, store.status == .ready, let system = store.system(systemId) else { return }
        guard let pick = requested.flatMap({ system.targets.contains($0) ? $0 : nil }) else {
            known = Set(system.targets.filter { (system.placement[$0] ?? 0) > 0 })
            picking = true
            return
        }
        if !queue.split(separator: ",").contains(Substring(pick)) { queue = "" }
        begin(pick)
    }

    func begin(_ pick: String) {
        top = LangStore.topWords(pick)
        lang = pick
        advance()
    }

    func confirmKnown(_ system: LangSystem) {
        let order = system.targets.filter { known.contains($0) }
        queue = order.joined(separator: ",")
        Task {
            for l in system.targets where !known.contains(l) { await store.unplace(system.id, lang: l) }
            picking = false
            if let first = order.first {
                begin(first)
            } else {
                path.removeLast()
                path.append(LangRoute.study(system.id))
            }
        }
    }

    @ViewBuilder
    func picker(_ system: LangSystem) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Eyebrow(text: String(localized: "Placement"))
                Text("Which of these do you already know?").font(.serif(.title2, weight: .semibold))
                Text("Pick the languages you can read or speak. Each one gets a level test. The rest start from the first words.")
                    .foregroundStyle(Palette.muted)
                ForEach(system.targets, id: \.self) { l in
                    let on = known.contains(l)
                    Button {
                        if on { known.remove(l) } else { known.insert(l) }
                    } label: {
                        HStack(spacing: 12) {
                            FlagTile(lang: l, size: 32)
                            Text(langName(l)).font(.headline)
                            Spacer()
                            Image(systemName: on ? "checkmark.circle.fill" : "circle").font(.title3)
                        }
                    }
                    .buttonStyle(D8Option(selected: on))
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
                Button(known.isEmpty ? String(localized: "Start from the first words") : String(localized: "Test my level")) { confirmKnown(system) }
                    .buttonStyle(D8Primary())
            }
            .padding(20)
            .frame(maxWidth: 680, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    func advance() {
        guard let system = store.system(systemId), let corpus = store.corpus, let lang, result == nil else { return }
        let src = source(system, corpus, lang)
        let available = Cefr.bandsAvailable(src)
        let step = Cefr.step(answers, available: available)
        if step.done {
            finish(src, step)
            return
        }
        guard let next = step.next, let q = Cefr.question(src, next.band, next.task, seen: seen, &rng, speech: LangListener.shared.supported) else {
            finish(src, step.stoppedHere)
            return
        }
        asked += 1
        question = (next.band, q.task, q.ex)
    }

    func finish(_ src: PlacementSource, _ step: CefrStep) {
        let p = Cefr.placement(src, answers, step)
        result = p
        question = nil
        Task { await store.place(systemId, lang: src.lang, tier: p.floorTier, only: p.placeIds, level: Cefr.levelLabel(p)) }
    }

    func answer(_ correct: Bool) {
        guard let q = question else { return }
        answers.append(CefrAnswer(band: q.band, task: q.task, itemId: q.ex.itemId, correct: correct))
        seen.insert(q.ex.itemId)
        question = nil
        advance()
    }

    @ViewBuilder
    func content(_ system: LangSystem, _ corpus: LangCorpus, _ lang: String) -> some View {
        if let result {
            let queued = queue.split(separator: ",").map(String.init).filter { $0 != lang && system.targets.contains($0) }
            let nextLang = queued.first
            List {
                Section {
                    Eyebrow(text: String(localized: "Placement · \(langName(lang))"))
                    Text("Level \(Cefr.levelLabel(result))").font(.serif(.title, weight: .semibold))
                    Text(summary(result)).foregroundStyle(Palette.muted)
                    ForEach(result.bands, id: \.band) { b in
                        Text(b.passed ? "\(b.band.rawValue): \(b.right) of \(b.asked) right, passed" : "\(b.band.rawValue): \(b.right) of \(b.asked) right, not passed")
                            .font(.footnote).foregroundStyle(Palette.ink).monospacedDigit()
                    }
                    if let u = result.unknownFrom {
                        Text("\(u.rawValue) and above: not enough material in this language to test").font(.footnote).foregroundStyle(Palette.muted)
                    }
                    SaveNotice(state: store.saveState)
                    if let nextLang {
                        Button("Place \(langName(nextLang))") {
                            queue = queued.joined(separator: ",")
                            path.removeLast()
                            path.append(LangRoute.place(system.id, nextLang))
                        }
                        .buttonStyle(D8Primary())
                    } else {
                        Button("Start studying") {
                            queue = ""
                            path.removeLast()
                            path.append(LangRoute.study(system.id))
                        }
                        .buttonStyle(D8Primary())
                    }
                    Button("Progress") {
                        path.removeLast()
                        path.append(LangRoute.system(system.id))
                    }
                    .buttonStyle(D8Option(align: .center))
                }
                .listRowBackground(Palette.card)
            }
        } else if let q = question {
            let maps = [lang: readingsByForm(corpus, lang), system.root: readingsByForm(corpus, system.root)]
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Eyebrow(text: String(localized: "Placement · \(langName(lang))"))
                    Text("\(langName(system.root)) to \(langName(lang))").font(.serif(.title2, weight: .semibold))
                    Text("Each level mixes typing, listening, gap fills, grammar and short reading. A level passes on 6 right before 3 misses. The test stops at the first level you do not pass.")
                        .foregroundStyle(Palette.muted)
                    Text("Question \(asked) · level \(q.band.rawValue)").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                    ExerciseView(ex: q.ex, readings: readings, reading: { form, l in maps[l]?[form] }, onDone: { results in
                        answer(results.contains { $0.rating > 1 })
                    })
                    .id("\(q.band.rawValue)-\(asked)")
                    Button("I do not know") { answer(false) }.buttonStyle(PlainLink())
                }
                .padding(20)
                .frame(maxWidth: 680, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
        } else {
            ProgressView("Picking the next question")
        }
    }

    func summary(_ r: CefrPlacement) -> String {
        let placed = r.placeIds.isEmpty ? String(localized: "You start from the first words.") : String(localized: "\(r.placeIds.count) words you answered right start as known.")
        let note = r.mapping == .none ? String(localized: "This language has no CEFR exam, so the bands carry no CEFR claim.") : String(localized: "Levels come from Polingual corpus bands mapped to CEFR as a proxy. No exam has validated them yet.")
        return String(localized: "\(answers.count) questions.") + " " + placed + " " + note
    }
}
