import BucketKit
import SwiftUI

struct TodayView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @State private var path = NavigationPath()
    @State private var session: StudyLaunch?

    struct Work {
        let entry: DeckEntry
        let deck: PreparedDeck
        let due: Int
        let new: Int
    }

    var work: [Work] {
        library.scienceDecks.compactMap { entry in
            guard let deck = library.prepared[entry.id], science.state(entry.id).cards.count > 0 else { return nil }
            let r = science.route(deck)
            let due = r.filter { $0.kind == .review }.count
            return Work(entry: entry, deck: deck, due: due, new: r.count - due)
        }
    }

    var langDue: [(system: LangSystem, due: Int)] {
        guard let corpus = langs.corpus else { return [] }
        let now = Date().timeIntervalSince1970 * 1000
        return langs.systems.map { ($0, systemSummary($0, corpus, langs.state($0.id), now: now).due) }
    }

    var streak: Double {
        (library.scienceDecks.map { science.state($0.id).streak } + langs.systems.map { langs.state($0.id).streak }).max() ?? 0
    }

    var body: some View {
        let w = work
        let pending = w.filter { $0.due + $0.new > 0 }.sorted { ($0.due, $0.new) > ($1.due, $1.new) }
        let due = w.reduce(0) { $0 + $1.due } + langDue.reduce(0) { $0 + $1.due }
        let new = w.reduce(0) { $0 + $1.new }
        NavigationStack(path: $path) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        if streak > 0 { Eyebrow(text: "\(streakText(streak)) streak") }
                        Text(due + new == 0 ? (langs.systems.contains { langs.state($0.id).cards.count == 0 } && w.isEmpty ? "Ready when you are" : "All caught up") : "\(due) due · \(new) new")
                            .font(.serif(.largeTitle, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                            .monospacedDigit()
                        Text(w.isEmpty && langs.systems.isEmpty ? "Start a deck in Learn or build a language system, and its reviews show up here." : w.isEmpty && langs.systems.contains(where: { langs.state($0.id).cards.count == 0 }) ? "Your first words are waiting. Reviews appear here as you learn." : due + new == 0 ? "Reviews come back as their intervals run out." : "Due reviews first, then new atoms, up to \(Int(EngineState().newPerDay)) a day in each deck.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                        if let first = pending.first {
                            Button {
                                session = StudyLaunch(entry: first.entry, deck: first.deck)
                            } label: {
                                Text("Start with \(first.entry.title)").frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                            .padding(.top, 4)
                        } else if let lang = langDue.first(where: { $0.due > 0 }) ?? langDue.first(where: { langs.state($0.system.id).cards.count == 0 }) {
                            Button {
                                path.append(LangRoute.study(lang.system.id))
                            } label: {
                                Text(lang.due > 0 ? "Review \(lang.system.name)" : "Start \(lang.system.name)").frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.large)
                            .padding(.top, 4)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Palette.card)
                if !pending.isEmpty {
                    Section {
                        ForEach(pending, id: \.entry.id) { item in
                            Button {
                                session = StudyLaunch(entry: item.entry, deck: item.deck)
                            } label: {
                                ReviewDeckRow(entry: item.entry)
                            }
                        }
                        .listRowBackground(Palette.card)
                    } header: {
                        Eyebrow(text: "Science")
                    }
                }
                if !langs.systems.isEmpty {
                Section {
                    ForEach(langs.systems) { s in
                        Button {
                            path.append(LangRoute.study(s.id))
                        } label: {
                            LangSystemRow(system: s)
                        }
                    }
                    .listRowBackground(Palette.card)
                } header: {
                    Eyebrow(text: "Language systems")
                }
                }
            }
            .paper()
            .navigationTitle("Today")
            .sheet(item: $session) { StudySession(entry: $0.entry, deck: $0.deck) }
            .langDestinations(path: $path)
            .task { await langs.load() }
            .task(id: library.scienceDecks.map(\.id)) {
                await science.load(library.scienceDecks.map(\.id))
                for entry in library.scienceDecks { _ = await library.prepared(entry) }
                guard session == nil, let id = Launch.value("-study"), let entry = library.scienceDecks.first(where: { $0.id == id }), let deck = await library.prepared(entry) else { return }
                session = StudyLaunch(entry: entry, deck: deck)
            }
        }
    }
}

struct ReviewDeckRow: View {
    @Environment(Library.self) private var library
    @Environment(ScienceStore.self) private var science
    let entry: DeckEntry

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            DeckRow(entry: entry, subtitle: detail)
            Spacer(minLength: 0)
            if let due = counts?.due, due > 0 {
                Text("\(due)").font(.subheadline.weight(.semibold)).monospacedDigit()
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Palette.gold.opacity(0.18), in: .capsule)
                    .foregroundStyle(Palette.ink)
                    .accessibilityLabel("\(due) due")
            }
        }
        .task { _ = await library.prepared(entry) }
    }

    var counts: (due: Int, new: Int, streak: Double)? {
        guard let deck = library.prepared[entry.id] else { return nil }
        let r = science.route(deck)
        let due = r.filter { $0.kind == .review }.count
        return (due, r.count - due, science.state(entry.id).streak)
    }

    var detail: String? {
        guard let c = counts else { return entry.sub }
        if c.due == 0 && c.new == 0 { return "Nothing due today" }
        var parts = ["\(c.due) due", "\(c.new) new"]
        if c.streak > 0 { parts.append("\(streakText(c.streak)) streak") }
        return parts.joined(separator: " · ")
    }
}

@MainActor
func bucketForecast(_ library: Library, _ science: ScienceStore, _ langs: LangStore, at date: Date) -> ReviewForecast {
    let t = date.timeIntervalSince1970 * 1000
    var count = 0
    var best: (due: Double, text: String)?
    for entry in library.scienceDecks {
        let state = science.state(entry.id)
        for (id, card) in state.cards.entries {
            guard let due = card.due, due <= t else { continue }
            count += 1
            if best == nil || due < best!.due, let title = library.prepared[entry.id]?.byId[id]?.title { best = (due, title) }
        }
    }
    let lang = langForecast(langs, at: date)
    let streak = max(lang.streak, library.scienceDecks.map { Int(science.state($0.id).streak) }.max() ?? 0)
    return ReviewForecast(count: count + lang.count, example: best?.text ?? lang.example, streak: streak)
}
