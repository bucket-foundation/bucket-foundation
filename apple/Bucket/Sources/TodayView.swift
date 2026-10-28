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
        let now = Date().timeIntervalSince1970 * 1000
        let new = w.reduce(0) { $0 + $1.new } + langs.systems.reduce(0) { $0 + langNewLeft($1, langs.state($1.id), now: now) }
        let today = dayKey(now)
        let done = library.scienceDecks.reduce(0) { t, e in t + science.state(e.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
            + langs.systems.reduce(0) { t, s in t + langs.state(s.id).history[today].map { Int($0.new + $0.reviews) }.orZero }
        NavigationStack(path: $path) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 14) {
                        if streak > 0 { Text("\(streakText(streak)) streak").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted) }
                        HStack(spacing: 0) {
                            Tally(n: due, label: "due now", color: D8.vermilion)
                            Tally(n: new, label: "new today", color: D8.lapis)
                            Tally(n: done, label: "done today", color: D8.malachite)
                        }
                        Text(due + new == 0 ? (w.isEmpty && langs.systems.isEmpty ? "Start a deck in Learn or build a language system, and its reviews show up here." : "All caught up. Reviews come back as their intervals run out.") : "Due reviews first, then new cards.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                        if let first = pending.first {
                            Button("Start · \(first.entry.title)") {
                                session = StudyLaunch(entry: first.entry, deck: first.deck)
                            }
                            .buttonStyle(D8Primary())
                        } else if let lang = langDue.first(where: { $0.due > 0 }) ?? langDue.first(where: { langs.state($0.system.id).cards.count == 0 }) {
                            Button(lang.due > 0 ? "Review · \(lang.system.name)" : "Start · \(lang.system.name)") {
                                path.append(LangRoute.study(lang.system.id))
                            }
                            .buttonStyle(D8Primary())
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
            if let c = counts { CountPills(due: c.due, new: c.new) }
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
    var due = langDue(langs)
    for entry in library.scienceDecks {
        for (id, card) in science.state(entry.id).cards.entries {
            guard let d = card.due else { continue }
            due.append((d, library.prepared[entry.id]?.byId[id]?.title))
        }
    }
    let streak = max(langStreak(langs), library.scienceDecks.map { Int(science.state($0.id).streak) }.max() ?? 0)
    return ReminderPlan.forecast(due: due, at: date, streak: streak)
}

struct Tally: View {
    let n: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(n)").font(.system(size: 34, weight: .bold, design: .rounded)).foregroundStyle(n > 0 ? color : Palette.muted).monospacedDigit()
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

extension Optional where Wrapped == Int {
    var orZero: Int { self ?? 0 }
}
