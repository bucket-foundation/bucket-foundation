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
                            ForEach(library.languageDecks) { entry in
                                NavigationLink(value: LangRoute.home) { DeckRow(entry: entry, subtitle: "Learn a set of languages together from one root language") }
                                    .listRowBackground(Palette.card)
                            }
                        } header: {
                            Eyebrow(text: "Languages")
                        }
                        Section {
                            ForEach(library.scienceDecks) { entry in
                                NavigationLink(value: entry) { DeckRow(entry: entry) }
                                    .listRowBackground(Palette.card)
                            }
                        } header: {
                            Eyebrow(text: "Seven branches and the meta-skill")
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
            BranchTile(branch: entry.id, size: 36)
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.headline).foregroundStyle(Palette.ink)
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
    @Environment(ScienceStore.self) private var science
    let entry: DeckEntry
    @State private var deck: PreparedDeck?
    @State private var studying: StudyLaunch?

    static let shells = [("prereq", "Prerequisites", "The base everything rests on"), ("nucleus", "Nucleus", "The small set that opens the most"), ("frontier", "Frontier", "Where the branch is still moving")]

    var body: some View {
        Group {
            if let deck {
                let state = science.state(deck.branch)
                let today = science.route(deck)
                List {
                    Section {
                        DeckStats(summary: science.summary(deck))
                        Button {
                            studying = StudyLaunch(entry: entry, deck: deck)
                        } label: {
                            Label(today.isEmpty ? String(localized: "Study") : String(localized: "Study today (\(today.count))"), systemImage: "play.fill").font(.headline)
                        }
                    }
                    .listRowBackground(Palette.card)
                    Section {
                        if today.isEmpty {
                            Text("Nothing due. Every card is scheduled ahead and today's new atoms are done.")
                                .font(.subheadline).foregroundStyle(Palette.muted)
                        }
                        ForEach(today, id: \.id) { item in
                            if let atom = deck.byId[item.id] {
                                NavigationLink(value: AtomRoute(deck: entry, atom: atom)) {
                                    HStack {
                                        Text(atom.title).font(.serif(.body)).foregroundStyle(Palette.ink)
                                        Spacer()
                                        Text(item.kind == .review ? String(localized: "REVIEW") : String(localized: "NEW")).font(.caption2.weight(.semibold)).tracking(1.2).foregroundStyle(Palette.muted)
                                    }
                                }
                            }
                        }
                    } header: {
                        Eyebrow(text: "Today's route")
                    }
                    .listRowBackground(Palette.card)
                    ForEach(Self.shells, id: \.0) { key, label, hint in
                        let atoms = deck.atoms.filter { ($0.shell ?? "nucleus") == key }
                        if !atoms.isEmpty {
                            Section {
                                ForEach(atoms) { atom in atomRow(atom, state) }
                            } header: {
                                Eyebrow(text: label)
                            } footer: {
                                Text(hint).font(.footnote).foregroundStyle(Palette.muted)
                            }
                            .listRowBackground(Palette.card)
                        }
                    }
                }
            } else if let error = library.deckErrors[entry.id] {
                StateMessage(title: "This deck did not load", detail: error) { Task { deck = await library.prepared(entry) } }
            } else {
                ProgressView()
            }
        }
        .paper()
        .navigationTitle(entry.title)
        .task {
            deck = await library.prepared(entry)
            await science.load(library.scienceDecks.map(\.id))
        }
        .sheet(item: $studying) { StudySession(entry: $0.entry, deck: $0.deck) }
    }

    func atomRow(_ atom: Atom, _ state: EngineState) -> some View {
        let started = state.cards.has(atom.id)
        let open = started || atom.requires.allSatisfy { state.cards.has($0) }
        return NavigationLink(value: AtomRoute(deck: entry, atom: atom)) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(atom.title).font(.serif(.body, weight: .medium)).foregroundStyle(open ? Palette.ink : Palette.muted)
                    if !open {
                        Text("After \(atom.requires.count) prerequisite\(atom.requires.count == 1 ? "" : "s")").font(.caption).foregroundStyle(Palette.muted)
                    } else if !atom.summary.isEmpty {
                        Text(atom.summary).font(.footnote).foregroundStyle(Palette.muted).lineLimit(2)
                    }
                }
                Spacer(minLength: 0)
                if started { MasteryBar(value: masteryFor(state, atom.id)) }
            }
            .padding(.vertical, 4)
        }
    }
}

struct AtomView: View {
    @Environment(Library.self) private var library
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
                    .buttonStyle(D8Primary())
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
            if let deck = library.prepared[route.deck.id] { AtomDrillSheet(deck: deck, atom: deck.byId[atom.id] ?? atom) }
        }
        .task { _ = await library.prepared(route.deck) }
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

    enum Block: Hashable {
        case heading(String), equation(String), text(String), bullet(String), numbered(String, String), quote(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                switch b {
                case .heading(let t):
                    Text(t).font(.serif(.title3, weight: .semibold)).foregroundStyle(Palette.ink)
                case .equation(let t):
                    EquationView(tex: t)
                case .text(let t):
                    Text(Self.inline(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                case .bullet(let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("•").foregroundStyle(Palette.muted)
                        Text(Self.inline(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .numbered(let n, let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(n).font(.serif(.body, weight: .semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                        Text(Self.inline(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .quote(let t):
                    Text(Self.inline(t)).font(.serif(.body).italic()).foregroundStyle(Palette.ink.opacity(0.8)).lineSpacing(4)
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) { Rectangle().fill(Palette.rule).frame(width: 3) }
                }
            }
        }
        .textSelection(.enabled)
    }

    var blocks: [Block] { Self.parse(markdown) }

    static func parse(_ markdown: String) -> [Block] {
        var out: [Block] = []
        for para in markdown.components(separatedBy: "\n\n") {
            let p = para.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !p.isEmpty else { continue }
            var body = p
            if p.hasPrefix("#") {
                let first = p.prefix { $0 != "\n" }
                out.append(.heading(first.drop { $0 == "#" }.trimmingCharacters(in: .whitespaces)))
                body = String(p.dropFirst(first.count)).trimmingCharacters(in: .whitespacesAndNewlines)
                if body.isEmpty { continue }
            }
            let parts = body.components(separatedBy: "$$")
            for (i, part) in parts.enumerated() {
                let t = part.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !t.isEmpty else { continue }
                if !i.isMultiple(of: 2) && parts.count >= 3 {
                    out.append(.equation(t))
                } else {
                    out.append(contentsOf: lines(t))
                }
            }
        }
        return out
    }

    static func lines(_ t: String) -> [Block] {
        var out: [Block] = []
        var prose: [String] = []
        func flush() {
            if !prose.isEmpty { out.append(.text(prose.joined(separator: " "))) }
            prose = []
        }
        for raw in t.components(separatedBy: "\n") {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("- ") || line.hasPrefix("* ") {
                flush()
                out.append(.bullet(String(line.dropFirst(2))))
            } else if let dot = line.firstIndex(of: "."), line[..<dot].allSatisfy(\.isNumber), !line[..<dot].isEmpty, line[line.index(after: dot)...].hasPrefix(" ") {
                flush()
                out.append(.numbered(String(line[...dot]), String(line[line.index(dot, offsetBy: 2)...])))
            } else if line.hasPrefix(">") {
                flush()
                out.append(.quote(line.drop { $0 == ">" || $0 == " " }.description))
            } else if !line.isEmpty {
                prose.append(line)
            }
        }
        flush()
        return out
    }

    static func inline(_ p: String) -> AttributedString {
        var text = ""
        var parts = p.components(separatedBy: "$")
        if parts.count.isMultiple(of: 2) { parts = [p] }
        for (i, part) in parts.enumerated() { text += i.isMultiple(of: 2) ? part : TeXLite.render(part) }
        return (try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(text)
    }
}
