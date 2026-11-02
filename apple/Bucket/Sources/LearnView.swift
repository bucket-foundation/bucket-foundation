import BucketKit
import SwiftUI

struct LearnView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
                List {
                    if !langs.systems.isEmpty {
                        Section {
                            VoiceTile {
                                DeepLink.shared.listen = true
                                path.append(LearnRoute.translate)
                            }
                            .listRowInsets(EdgeInsets())
                        }
                        .listRowBackground(Color.clear)
                    }
                    LearnHeading(text: langs.systems.isEmpty ? "Languages" : "Your languages")
                    languages(proxy)
                    LearnHeading(text: "Explore")
                    GamesSection { path.append(LearnRoute.game($0)) }
                    ContentSection { path.append($0) }
                    SubjectsSection(open: { path.append($0) }, search: { path.append(LearnRoute.canon) })
                    if let corpus = langs.corpus { LanguageFooter(corpus: corpus) }
                }
                .listSectionSpacing(.compact)
                #if DEBUG
                .task {
                    guard let anchor = Launch.value("-learnScroll") else { return }
                    try? await Task.sleep(for: .seconds(4))
                    proxy.scrollTo(anchor, anchor: .top)
                }
                #endif
            }
            .paper()
            .navigationTitle("Learn")
            .navigationDestination(for: DeckEntry.self) { DeckView(entry: $0) }
            .navigationDestination(for: AtomRoute.self) { AtomView(route: $0) }
            .navigationDestination(for: LearnRoute.self) { destination($0) }
            .langDestinations(path: $path)
        }
        .task {
            await langs.load()
            #if DEBUG
            if let game = Launch.value("-openGame").flatMap(GameKind.init(rawValue:)) { path.append(LearnRoute.game(game)) }
            if let kind = Launch.value("-contentKind").flatMap(ContentKind.init(rawValue:)) { path.append(LearnRoute.content(kind)) }
            if let topic = ContentCatalog.topics.first(where: { $0.title == Launch.value("-readTopic") }) { path.append(LearnRoute.read(topic)) }
            #endif
            guard let spec = Launch.value("-openLang") else { return }
            let parts = spec.split(separator: ":").map(String.init)
            guard parts.count == 3 else { return }
            let targets = parts[1].split(separator: ",").map(String.init)
            let existing = langs.systems.first { $0.root == parts[0] && $0.targets == targets }
            let system: LangSystem? = if let existing { existing } else { try? await langs.create(root: parts[0], targets: targets) }
            guard let system else { return }
            switch parts[2] {
            case "study": path.append(LangRoute.study(system.id))
            case "place": path.append(LangRoute.place(system.id, nil))
            case "system": path.append(LangRoute.system(system.id))
            default: break
            }
        }
        .onChange(of: DeepLink.shared.pending, initial: true) { _, _ in Task { await follow() } }
        .onChange(of: library.scienceDecks) { _, decks in
            if DeepLink.shared.pending != nil { Task { await follow() } }
            if path.isEmpty, let id = Launch.value("-openDeck"), let d = decks.first(where: { $0.id == id }) { path.append(d) }
        }
    }

    @ViewBuilder func languages(_ proxy: ScrollViewProxy) -> some View {
        switch langs.status {
        case .idle, .loading:
            Section { ProgressView("Loading your language systems").frame(maxWidth: .infinity) }
                .listRowBackground(Color.clear)
        case .error:
            Section {
                Text("The language corpus files did not arrive. Check the connection and try again.").foregroundStyle(Palette.muted)
                Button("Retry") { Task { await langs.load(force: true) } }
            }
            .listRowBackground(Palette.card)
        case .ready:
            if let corpus = langs.corpus {
                if langs.systems.isEmpty {
                    LanguageSections(path: $path, corpus: corpus, proxy: proxy, builderOnly: true)
                } else {
                    Section {
                        LazyVGrid(columns: learnColumns, spacing: 14) {
                            ForEach(langs.systems) { LangTile(system: $0, corpus: corpus, open: { id in path.append(LangRoute.system(id)) }) }
                            NewSetTile { path.append(LearnRoute.newSet) }
                        }
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                        .listRowSeparator(.hidden)
                    }
                    .listRowBackground(Color.clear)
                }
            }
        }
    }

    @ViewBuilder func destination(_ route: LearnRoute) -> some View {
        switch route {
        case .canon: CanonView()
        case .game(let game): game.screen
        case .read(let topic, let lang): ReadView(topic: topic, langs: readLangs(lang)).fullHeightSession()
        case .content(let kind): ContentHub(embedded: true, start: kind).fullHeightSession()
        case .translate: TranslateScreen()
        case .newSet:
            ScrollViewReader { proxy in
                List {
                    if let corpus = langs.corpus { LanguageSections(path: $path, corpus: corpus, proxy: proxy, builderOnly: true) }
                }
            }
            .paper()
            .navigationTitle("New set")
            .inlineTitle()
        }
    }

    func readLangs(_ shared: String?) -> [String] {
        guard let shared else { return langs.contentLangs }
        return [shared] + langs.contentLangs.filter { $0 != shared }
    }
}

struct LearnHeading: View {
    let text: String

    var body: some View {
        Section {
            Text(LocalizedStringKey(text))
                .font(.serif(.title2, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .accessibilityAddTraits(.isHeader)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 8, leading: 4, bottom: 0, trailing: 4))
        }
    }
}

struct LearnGroupTitle: View {
    let text: String
    var more: LearnRoute?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(LocalizedStringKey(text)).font(.headline).foregroundStyle(Palette.ink)
            Spacer()
            if let more {
                NavigationLink("See all", value: more).font(.subheadline.weight(.semibold))
            }
        }
        .textCase(nil)
    }
}

struct GamesSection: View {
    let open: (GameKind) -> Void

    var body: some View {
        Section {
            GamesBoard(open: open)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowSeparator(.hidden)
        } header: {
            LearnGroupTitle(text: "Games")
        }
        .id("games")
        .listRowBackground(Color.clear)
    }
}

let learnColumns = [GridItem(.adaptive(minimum: 150), spacing: 14)]

struct LearnTile<Mark: View>: View {
    let title: String
    let detail: String
    let face: Color
    var lip: Color?
    var item: TodayItem?
    let open: () -> Void
    @ViewBuilder let mark: () -> Mark

    var body: some View {
        Button(action: open) {
            VStack(alignment: .leading, spacing: 6) {
                mark().frame(height: 34)
                Text(title).font(D8.word(19)).foregroundStyle(D8.parchment).lineLimit(1).minimumScaleFactor(0.7)
                Text(detail).font(.footnote.weight(.medium)).foregroundStyle(D8.parchment.opacity(0.85))
                    .lineLimit(2, reservesSpace: true)
                    .multilineTextAlignment(.leading)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(GameLip(face: face, lip: lip ?? face.mix(with: .black, by: 0.3)))
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            if let item { AddToToday(item: item, look: .icon, color: D8.parchment).padding(8) }
        }
    }
}

struct LearnSymbol: View {
    let name: String

    var body: some View {
        Image(systemName: name).font(.system(size: 26, weight: .bold)).foregroundStyle(D8.parchment)
    }
}

struct LangTile: View {
    @Environment(LangStore.self) private var store
    let system: LangSystem
    let corpus: LangCorpus
    let open: (String) -> Void
    @State private var removing = false

    var body: some View {
        let sum = systemSummary(system, corpus, store.state(system.id), now: Date().timeIntervalSince1970 * 1000)
        Button { open(system.id) } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 4) { ForEach(system.targets.prefix(4), id: \.self) { FlagTile(lang: $0, size: 28) } }
                    .frame(height: 34, alignment: .leading)
                Text(system.name).font(.system(size: 17, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                    .lineLimit(2, reservesSpace: true).multilineTextAlignment(.leading)
                ProgressView(value: Double(sum.started), total: Double(max(1, sum.total))).tint(D8.malachite)
                Text("\(sum.started) of \(sum.total) cards").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(D8.face, in: .rect(cornerRadius: 18))
            .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(D8.edge, lineWidth: 2) }
            .background(D8.edge, in: .rect(cornerRadius: 18).offset(y: 5))
            .padding(.bottom, 5)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) { AddToToday(item: .system(system), look: .icon).padding(8) }
        .contextMenu { Button("Remove", systemImage: "minus.circle", role: .destructive) { removing = true } }
        .confirmationDialog("Remove \(system.name)?", isPresented: $removing, titleVisibility: .visible) {
            Button("Remove", role: .destructive) { Task { await store.remove(system.id) } }
        } message: {
            Text("Progress stays saved and returns if you build the same system again.")
        }
    }
}

struct NewSetTile: View {
    let open: () -> Void

    var body: some View {
        LearnTile(title: String(localized: "New set"), detail: String(localized: "Pick the languages to learn together."), face: D8.lapis, lip: Color(hex: 0x12326A), open: open) {
            LearnSymbol(name: "plus")
        }
    }
}

struct ContentSection: View {
    @Environment(LangStore.self) private var langs
    let open: (LearnRoute) -> Void

    var names: String { langs.contentLangs.prefix(3).map(langName).joined(separator: ", ") }

    var body: some View {
        Section {
            LazyVGrid(columns: learnColumns, spacing: 14) {
                LearnTile(title: ContentKind.read.title, detail: String(localized: "Side by side in \(names)"), face: D8.malachite, lip: D8.malachiteLip, open: { open(.content(.read)) }) {
                    LearnSymbol(name: "book")
                }
                LearnTile(title: ContentKind.listen.title, detail: String(localized: "Live radio in \(names)"), face: D8.vermilion, lip: D8.vermilionLip, open: { open(.content(.listen)) }) {
                    LearnSymbol(name: "dot.radiowaves.left.and.right")
                }
                LearnTile(title: ContentKind.watch.title, detail: String(localized: "Videos on \(ContentCatalog.topics.count) topics"), face: D8.lapis, lip: Color(hex: 0x12326A), open: { open(.content(.watch)) }) {
                    LearnSymbol(name: "play.rectangle")
                }
                ForEach(ContentCatalog.topics.prefix(3)) { topic in
                    LearnTile(title: topic.title, detail: branchTitle(topic.branch), face: BranchTile.face(topic.branch), item: .topic(topic), open: { open(.read(topic)) }) {
                        LearnSymbol(name: "text.book.closed")
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            .listRowSeparator(.hidden)
        } header: {
            LearnGroupTitle(text: "Content", more: .content(.read))
        }
        .id("content")
        .listRowBackground(Color.clear)
    }
}

struct SubjectsSection: View {
    @Environment(Library.self) private var library
    let open: (DeckEntry) -> Void
    let search: () -> Void

    var body: some View {
        Section {
            switch library.index {
            case .idle, .loading:
                ProgressView("Opening the canon").frame(maxWidth: .infinity)
            case .failed(let message):
                Text(message).foregroundStyle(Palette.muted)
                Button("Retry") { Task { await library.retryIndex() } }
            case .ready:
                LazyVGrid(columns: learnColumns, spacing: 14) {
                    LearnTile(title: String(localized: "Search the canon"), detail: String(localized: "Every idea across seven branches."), face: Palette.ink, open: search) {
                        LearnSymbol(name: "text.magnifyingglass")
                    }
                    ForEach(library.scienceDecks) { entry in
                        LearnTile(title: entry.title, detail: entry.sub ?? "", face: BranchTile.face(entry.id), item: .deck(entry), open: { open(entry) }) {
                            Text(BranchTile.glyph(entry.id)).font(.system(size: 26, weight: .bold, design: .serif)).foregroundStyle(D8.parchment)
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowSeparator(.hidden)
            }
        } header: {
            LearnGroupTitle(text: "Subjects")
        }
        .id("subjects")
        .listRowBackground(Color.clear)
    }
}

extension LearnView {
    func follow() async {
        guard let link = DeepLink.shared.pending, link.tab == .learn else { return }
        switch link {
        case .langs(let root, let targets):
            DeepLink.shared.pending = nil
            await langs.load()
            path = NavigationPath()
            if let system = langs.systems.first(where: { $0.root == root && Set($0.targets) == Set(targets) }) {
                path.append(LangRoute.system(system.id))
            }
        case .deck(let id), .atom(let id, _):
            guard let entry = library.scienceDecks.first(where: { $0.id == id }) else {
                if !library.scienceDecks.isEmpty { DeepLink.shared.pending = nil }
                return
            }
            DeepLink.shared.pending = nil
            path = NavigationPath()
            path.append(entry)
            if case .atom(_, let atomId) = link, let deck = await library.prepared(entry), let atom = deck.byId[atomId] {
                path.append(AtomRoute(deck: entry, atom: atom))
            }
        case .content(let title, let lang, let fallback):
            DeepLink.shared.pending = nil
            path = NavigationPath()
            if let topic = ContentCatalog.topics.first(where: { $0.title == title }) {
                path.append(LearnRoute.read(topic, lang: lang))
            } else {
                path.append(LearnRoute.content(fallback))
            }
        case .voice:
            path = NavigationPath()
            path.append(LearnRoute.translate)
        default: break
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

enum LearnRoute: Hashable {
    case canon
    case game(GameKind)
    case read(ContentTopic, lang: String? = nil)
    case content(ContentKind)
    case translate
    case newSet
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
                                        Text(LessonText.inline(atom.title)).font(.serif(.body)).foregroundStyle(Palette.ink)
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
        .toolbar { ToolbarItem(placement: .primaryAction) { AddToToday(item: .deck(entry), look: .icon) } }
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
                    Text(LessonText.inline(atom.title)).font(.serif(.body, weight: .medium)).foregroundStyle(open ? Palette.ink : Palette.muted)
                    if !open {
                        Text("After \(atom.requires.count) prerequisite\(atom.requires.count == 1 ? "" : "s")").font(.caption).foregroundStyle(Palette.muted)
                    } else if !atom.summary.isEmpty {
                        Text(LessonText.inline(atom.summary)).font(.footnote).foregroundStyle(Palette.muted).lineLimit(2)
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
                Text(LessonText.inline(atom.title)).font(.serif(.largeTitle, weight: .semibold)).foregroundStyle(Palette.ink)
                Text(LessonText.inline(atom.summary)).font(.serif(.title3)).foregroundStyle(Palette.ink.opacity(0.85))
                if let eq = atom.equation, !eq.isEmpty { EquationView(tex: eq) }
                if !atom.orderedDepths.isEmpty {
                    Picker("Depth", selection: $depth) {
                        ForEach(atom.orderedDepths, id: \.key) { d in Text(Self.depthName(d.key)).tag(d.key) }
                    }
                    .pickerStyle(.segmented)
                    Text(LessonText.inline(atom.depths[depth] ?? "")).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
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
                    Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(5)
                case .bullet(let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("•").foregroundStyle(Palette.muted)
                        Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .numbered(let n, let t):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(n).font(.serif(.body, weight: .semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                        Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body)).foregroundStyle(Palette.ink).lineSpacing(4)
                    }
                case .quote(let t):
                    Text(Self.inline(t)).accessibilityLabel(Self.spoken(t)).font(.serif(.body).italic()).foregroundStyle(Palette.ink.opacity(0.8)).lineSpacing(4)
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

    static func inline(_ p: String) -> AttributedString { TeXLite.attributed(p) }

    static func spoken(_ p: String) -> Text { Text(TeXLite.spokenProse(p)) }
}
