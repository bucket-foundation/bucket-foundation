import BucketKit
import SwiftUI

struct LearnView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                switch library.index {
                case .idle, .loading:
                    ProgressView("Opening the canon")
                case .failed(let message):
                    StateMessage(title: "Bucket could not load the decks", detail: message) {
                        Task { await library.retryIndex() }
                    }
                case .ready:
                    List {
                        Section {
                            ForEach(library.scienceDecks) { entry in
                                NavigationLink(value: entry) { DeckRow(entry: entry) }
                                    .listRowBackground(Palette.card)
                            }
                        } header: {
                            Eyebrow(text: "Seven branches and the meta-skill")
                        }
                        Section {
                            ForEach(library.languageDecks) { entry in
                                NavigationLink(value: LangRoute.home) { DeckRow(entry: entry, subtitle: "Learn a set of languages together from one root language") }
                                    .listRowBackground(Palette.card)
                            }
                        } header: {
                            Eyebrow(text: "Languages")
                        }
                    }
                }
            }
            .paper()
            .navigationTitle("Learn")
            .navigationDestination(for: DeckEntry.self) { DeckView(entry: $0) }
            .navigationDestination(for: AtomRoute.self) { AtomView(route: $0) }
            .langDestinations(path: $path)
        }
        .task {
            guard let spec = Launch.value("-openLang") else { return }
            await langs.load()
            let parts = spec.split(separator: ":").map(String.init)
            guard parts.count == 3 else { return }
            let targets = parts[1].split(separator: ",").map(String.init)
            let existing = langs.systems.first { $0.root == parts[0] && $0.targets == targets }
            let system: LangSystem? = if let existing { existing } else { try? await langs.create(root: parts[0], targets: targets) }
            guard let system else { return }
            path.append(LangRoute.home)
            switch parts[2] {
            case "study": path.append(LangRoute.study(system.id))
            case "place": path.append(LangRoute.place(system.id, nil))
            case "system": path.append(LangRoute.system(system.id))
            default: break
            }
        }
        .onChange(of: library.scienceDecks) { _, decks in
            if path.isEmpty, let id = Launch.value("-openDeck"), let d = decks.first(where: { $0.id == id }) { path.append(d) }
        }
    }
}

struct DeckRow: View {
    let entry: DeckEntry
    var subtitle: String?

    var body: some View {
        HStack(spacing: 14) {
            Text(entry.mark)
                .font(.serif(.title3, weight: .semibold))
                .foregroundStyle(Palette.gold)
                .frame(width: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.serif(.headline)).foregroundStyle(Palette.ink)
                if let sub = subtitle ?? entry.sub {
                    Text(sub).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(2)
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct AtomRoute: Hashable {
    let deck: DeckEntry
    let atom: Atom
}

struct DeckView: View {
    @Environment(Library.self) private var library
    let entry: DeckEntry
    @State private var deck: Deck?
    @State private var practicing = false

    var body: some View {
        Group {
            if let deck {
                List {
                    Section {
                        Button {
                            practicing = true
                        } label: {
                            Label("Practice this deck", systemImage: "play.fill").font(.headline)
                        }
                        .listRowBackground(Palette.card)
                    }
                    Section {
                        ForEach(deck.atoms) { atom in
                            NavigationLink(value: AtomRoute(deck: entry, atom: atom)) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(atom.title).font(.serif(.body, weight: .medium)).foregroundStyle(Palette.ink)
                                    Text(atom.summary).font(.footnote).foregroundStyle(Palette.muted).lineLimit(2)
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(Palette.card)
                        }
                    } header: {
                        Eyebrow(text: "\(deck.atoms.count) foundations")
                    }
                }
            } else if let error = library.deckErrors[entry.id] {
                StateMessage(title: "This deck did not load", detail: error) { Task { deck = await library.deck(entry) } }
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle(entry.title)
        .task { deck = await library.deck(entry) }
        .sheet(isPresented: $practicing) {
            if let deck { PracticeSession(title: entry.title, cards: PracticeCard.cards(from: deck.atoms)) }
        }
    }
}

struct AtomView: View {
    let route: AtomRoute
    @State private var depth = "core"
    @State private var practicing = false

    var atom: Atom { route.atom }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let type = atom.type { Eyebrow(text: type) }
                Text(atom.title).font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
                Text(atom.summary).font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85))
                if let eq = atom.equation, !eq.isEmpty { EquationView(tex: eq) }
                if !atom.orderedDepths.isEmpty {
                    Picker("Depth", selection: $depth) {
                        ForEach(atom.orderedDepths, id: \.key) { d in Text(Self.depthName(d.key)).tag(d.key) }
                    }
                    .pickerStyle(.segmented)
                    Text(atom.depths[depth] ?? "").font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                        .textSelection(.enabled)
                }
                if let lesson = atom.lesson, !lesson.isEmpty {
                    Divider().overlay(Palette.rule)
                    Eyebrow(text: "Lesson")
                    LessonText(markdown: lesson)
                }
                if !atom.quiz.isEmpty {
                    Button {
                        practicing = true
                    } label: {
                        Label("Test yourself", systemImage: "checkmark.circle").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .paper()
        .inlineTitle()
        .sheet(isPresented: $practicing) {
            PracticeSession(title: atom.title, cards: PracticeCard.cards(from: [atom]))
        }
    }

    static func depthName(_ key: String) -> String {
        switch key {
        case "eli5": "Simple"
        case "core": "Core"
        case "deep": "Deep"
        default: key.capitalized
        }
    }
}

struct LessonText: View {
    let markdown: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, p in
                if p.hasPrefix("#") {
                    Text(p.drop { $0 == "#" }.trimmingCharacters(in: .whitespaces))
                        .font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink)
                } else if p.hasPrefix("$$") {
                    EquationView(tex: p.trimmingCharacters(in: CharacterSet(charactersIn: "$ \n")))
                } else {
                    Text(Self.inline(p)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                }
            }
        }
        .textSelection(.enabled)
    }

    var paragraphs: [String] {
        markdown.components(separatedBy: "\n\n").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    static func inline(_ p: String) -> AttributedString {
        var text = ""
        var parts = p.components(separatedBy: "$")
        if parts.count.isMultiple(of: 2) { parts = [p] }
        for (i, part) in parts.enumerated() { text += i.isMultiple(of: 2) ? part : TeXLite.render(part) }
        return (try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(text)
    }
}
