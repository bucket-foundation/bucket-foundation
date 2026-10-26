import BucketKit
import SwiftUI

struct SystemView: View {
    @Environment(LangStore.self) private var store
    @Binding var path: NavigationPath
    let systemId: String
    @State private var unitLang: String?
    @State private var editing: [String]?
    @State private var editError: String?

    var body: some View {
        Group {
            if store.status != .ready {
                ProgressView("Loading the system")
            } else if let system = store.system(systemId), let corpus = store.corpus {
                content(system, corpus)
            } else {
                StateMessage(title: "No such language system", detail: "It may have been removed on another device.", retry: nil)
            }
        }
        .paper()
        .navigationTitle(store.system(systemId)?.name ?? "Language system")
        .inlineTitle()
        .task { await store.load() }
    }

    func content(_ system: LangSystem, _ corpus: LangCorpus) -> some View {
        let state = store.state(system.id)
        let now = Date().timeIntervalSince1970 * 1000
        let per = langProgress(system, corpus, state, now: now)
        let sum = systemSummary(system, corpus, state, now: now)
        let shown = unitLang ?? system.targets.first ?? ""
        let units = unitStatus(system, corpus, state, shown)
        let friends = falseFriendsFor(corpus, system)
        let families = Array(corpus.items.filter { $0.kind == .word && sharedRootLangs($0, system).count >= 2 }.prefix(8))
        return List {
            Section {
                Text("\(sum.started) of \(sum.total) cards started across \(system.targets.count) languages. \(sum.due) due now.")
                    .font(.serif(.body))
                Button(sum.due > 0 ? "Review" : "Study") { path.append(LangRoute.study(system.id)) }
                    .buttonStyle(D8Primary(compact: true))
                HStack(spacing: 18) {
                    Text("\(Int(sum.xp)) xp")
                    Text("\(Int(sum.streak)) day streak")
                }
                .font(.subheadline)
                .foregroundStyle(Palette.muted)
                .monospacedDigit()
            }
            .listRowBackground(Palette.card)

            Section {
                if let draft = editing {
                    FlowLayout(spacing: 8) {
                        ForEach(Lang.codes.filter { $0 != system.root }, id: \.self) { c in
                            Chip(title: Lang.name(c), langs: [c], on: draft.contains(c)) {
                                editing = draft.contains(c) ? draft.filter { $0 != c } : draft + [c]
                            }
                        }
                    }
                    HStack {
                        Button("Save languages") {
                            Task {
                                do {
                                    try await store.edit(system.id, targets: draft)
                                    editing = nil
                                } catch let e as SystemError {
                                    editError = e.message
                                }
                            }
                        }
                        .buttonStyle(D8Primary(compact: true))
                        .disabled(draft.isEmpty || draft.count > Lang.maxTargets)
                        Button("Cancel") { editing = nil }.buttonStyle(D8Option(align: .center, compact: true))
                    }
                    Text("Progress in a removed language stays saved and returns if you add it back.").noticeStyle()
                    if let editError { Text(editError).noticeStyle() }
                } else {
                    Button("Edit languages") { editing = system.targets }
                }
                SaveNotice(state: store.saveState)
            } header: {
                Eyebrow(text: "Languages · \(system.targets.map(Lang.name).joined(separator: ", "))")
            }
            .listRowBackground(Palette.card)

            Section {
                ForEach(per) { p in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            HStack(spacing: 8) { FlagTile(lang: p.lang, size: 26); Text(Lang.name(p.lang)).font(.headline) }
                            Spacer()
                            Text("\(p.started)/\(p.total) started").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                        }
                        ProgressBar(started: p.total > 0 ? Double(p.started) / Double(p.total) : 0, mastered: p.total > 0 ? Double(p.mastered) / Double(p.total) : 0)
                            .accessibilityLabel("\(Lang.name(p.lang)) \(p.started) started, \(p.mastered) mastered")
                        FlowLayout(spacing: 10) {
                            Text("\(p.mastered) mastered")
                            Text("\(p.due) due")
                            Text("recall \(Int((p.retention * 100).rounded()))%")
                            if p.grammarTotal > 0 { Text("grammar \(p.grammarStarted)/\(p.grammarTotal)") }
                            if let placed = p.placedAt {
                                Text("placed at tier \(JSON.number(placed))")
                            } else {
                                Button("Take placement") { path.append(LangRoute.place(system.id, p.lang)) }.buttonStyle(.borderless)
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(Palette.muted)
                        .monospacedDigit()
                    }
                    .padding(.vertical, 4)
                }
            } header: {
                Eyebrow(text: "Per language")
            }
            .listRowBackground(Palette.card)

            Section {
                Picker("Language", selection: Binding(get: { shown }, set: { unitLang = $0 })) {
                    ForEach(system.targets, id: \.self) { Text(Lang.name($0)).tag($0) }
                }
                .pickerStyle(.segmented)
                ForEach(units) { u in
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(u.unit.index + 1). \(u.unit.title)").foregroundStyle(Palette.ink)
                            if !u.unit.grammar.isEmpty {
                                Text(u.unit.grammar.map { $0 == .gender ? "articles and gender" : "present tense" }.joined(separator: ", ")).font(.caption).foregroundStyle(Palette.muted)
                            }
                        }
                        Spacer()
                        Text(u.unlocked ? "\(u.started)/\(u.total)" : "locked").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                    }
                    .opacity(u.unlocked ? 1 : 0.5)
                }
                Text("A unit opens once 80% of the one before it has started.").noticeStyle()
            } header: {
                Eyebrow(text: "Skill tree")
            }
            .listRowBackground(Palette.card)

            if !friends.isEmpty {
                Section {
                    ForEach(friends, id: \.self) { f in
                        Text("**\(Lang.name(f.lang)) \(f.word)** means \(f.means), looks like English \(f.looksLike)\(f.crossWith.map { "; \(Lang.name($0.lang)) \($0.word) means \($0.means)" } ?? "")")
                            .font(.subheadline)
                    }
                } header: {
                    Eyebrow(text: "False friends · \(friends.count)")
                }
                .listRowBackground(Palette.card)
            }
            if !families.isEmpty {
                Section {
                    ForEach(families) { i in
                        Text("**\(i.root ?? "")** \(sharedRootLangs(i, system).map { "\(Lang.name($0)) \(i.forms[$0] ?? "")" }.joined(separator: " · "))")
                            .font(.subheadline)
                    }
                } header: {
                    Eyebrow(text: "Shared roots in this set · \(sum.sharedRootItems) words")
                }
                .listRowBackground(Palette.card)
            }
            Section {
                Text("\(corpus.attribution) \(corpus.sources.joined(separator: " ")) Audio is device text-to-speech, with recorded clips where a language has no voice.")
                    .font(.caption2)
                    .foregroundStyle(Palette.muted)
            }
            .listRowBackground(Color.clear)
        }
    }
}

struct ProgressBar: View {
    let started: Double
    let mastered: Double

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.muted.opacity(0.15))
                Capsule().fill(D8.lapis.opacity(0.45)).frame(width: g.size.width * started)
                Capsule().fill(D8.malachite).frame(width: g.size.width * mastered)
            }
        }
        .frame(height: 8)
    }
}
