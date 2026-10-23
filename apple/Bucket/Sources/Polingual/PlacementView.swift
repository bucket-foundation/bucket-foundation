import BucketKit
import SwiftUI

struct PlacementView: View {
    @Environment(LangStore.self) private var store
    @Binding var path: NavigationPath
    let systemId: String
    let requested: String?
    @State private var lang: String?
    @State private var rng = Rng(seed: UInt32(UInt64(Date().timeIntervalSince1970 * 1000) % 2147483647))
    @State private var answers: [PlacementAnswer] = []
    @State private var seen = Set<String>()
    @State private var item: LangItem?
    @State private var options: [String] = []
    @State private var mode = PlacementMode.recognize
    @State private var typed = ""
    @State private var result: Double?
    @AppStorage("bucket.lang.readings") private var readings = true

    var body: some View {
        Group {
            if store.status != .ready {
                ProgressView("Loading placement")
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

    func start() {
        guard lang == nil, let system = store.system(systemId) else { return }
        lang = requested.flatMap { system.targets.contains($0) ? $0 : nil } ?? system.targets.first { system.placement[$0] == nil } ?? system.targets.first
        advance()
    }

    func advance() {
        guard let system = store.system(systemId), let corpus = store.corpus, let lang, result == nil else { return }
        let step = placementStep(answers)
        if step.done {
            finish(step.tier)
            return
        }
        guard let next = placementItem(system, corpus, lang, step.nextTier!, seen, &rng) else {
            finish(step.tier)
            return
        }
        mode = step.nextMode ?? .recognize
        typed = ""
        options = placementOptions(corpus, next, lang, system.root, &rng)
        item = next
    }

    func finish(_ tier: Double) {
        result = tier
        item = nil
        if let lang { Task { await store.place(systemId, lang: lang, tier: tier) } }
    }

    func answer(_ correct: Bool) {
        guard let item else { return }
        let tier = placementStep(answers).nextTier ?? item.tier
        answers.append(PlacementAnswer(tier: tier, correct: correct, mode: mode))
        seen.insert(item.id)
        self.item = nil
        advance()
    }

    @ViewBuilder
    func content(_ system: LangSystem, _ corpus: LangCorpus, _ lang: String) -> some View {
        if let result {
            let nextLang = system.targets.first { $0 != lang && system.placement[$0] == nil }
            List {
                Section {
                    Eyebrow(text: "Placement · \(langName(lang))")
                    Text("Placed at tier \(JSON.number(result))").font(.serif(.title, weight: .semibold))
                    Text("\(answers.count) questions. \(result > 0 ? "Words below tier \(JSON.number(result)) start as known and come back for review on the normal schedule." : "You start from the first words.")")
                        .foregroundStyle(Palette.muted)
                    SaveNotice(state: store.saveState)
                    if let nextLang {
                        Button("Place \(langName(nextLang))") {
                            path.removeLast()
                            path.append(LangRoute.place(system.id, nextLang))
                        }
                        .buttonStyle(D8Primary())
                    } else {
                        Button("Start studying") {
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
        } else if let item {
            let optionReadings = readingsByForm(corpus, lang)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Eyebrow(text: "Placement · \(langName(lang))")
                    Text("\(langName(system.root)) to \(langName(lang))").font(.serif(.title2, weight: .semibold))
                    Text("Pick the word you know. Skip the ones you do not. The test narrows in on your level and stops when it finds it.")
                        .foregroundStyle(Palette.muted)
                    Text("Question \(answers.count + 1) · tier \(JSON.number(item.tier))").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(spacing: 10) { FlagTile(lang: lang, size: 32); Text(item.forms[system.root] ?? "").font(.system(size: 30, weight: .bold, design: .rounded)) }
                        if mode == .produce {
                            HStack {
                                TextField("Answer in \(langName(lang))", text: $typed)
                                    .textFieldStyle(.roundedBorder)
                                    .autocorrectionDisabled()
                                    .langInput(lang)
                                    .onSubmit { answer(judgeTyped(typed, [item.forms[lang] ?? ""], lang) != .wrong) }
                                Button("Check") { answer(judgeTyped(typed, [item.forms[lang] ?? ""], lang) != .wrong) }
                                    .buttonStyle(D8Primary(compact: true))
                            }
                        } else {
                            ForEach(options, id: \.self) { o in
                                OptionButton(text: o, lang: lang, reading: readings ? optionReadings[o] : nil) {
                                    answer(o == item.forms[lang])
                                }
                            }
                        }
                        Button("I do not know") { answer(false) }.buttonStyle(PlainLink())
                    }
                    .exerciseCard()
                }
                .padding(20)
                .frame(maxWidth: 680, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
        } else {
            ProgressView("Picking the next word")
        }
    }
}
