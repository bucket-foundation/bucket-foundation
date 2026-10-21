import BucketKit
import SwiftUI

struct PracticeHome: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @State private var path = NavigationPath()
    @Environment(ScienceStore.self) private var science
    @State private var session: StudyLaunch?

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    ForEach(library.scienceDecks) { entry in
                        Button {
                            Task {
                                if let deck = await library.prepared(entry) { session = StudyLaunch(entry: entry, deck: deck) }
                            }
                        } label: {
                            ReviewDeckRow(entry: entry)
                        }
                        .listRowBackground(Palette.card)
                    }
                } header: {
                    Eyebrow(text: "Today's review")
                } footer: {
                    Text("Due reviews come first, then up to \(Int(EngineState().newPerDay)) new atoms a day in each deck.")
                        .font(.footnote).foregroundStyle(Palette.muted)
                }
                Section {
                    if langs.systems.isEmpty {
                        Button("Build a language system") { path.append(LangRoute.home) }
                    }
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
            .paper()
            .navigationTitle("Practice")
            .sheet(item: $session) { StudySession(entry: $0.entry, deck: $0.deck) }
            .langDestinations(path: $path)
            .task { await langs.load() }
            .task(id: library.scienceDecks.map(\.id)) {
                await science.load(library.scienceDecks.map(\.id))
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
