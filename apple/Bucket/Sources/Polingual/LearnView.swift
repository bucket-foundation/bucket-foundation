import BucketKit
import SwiftUI

struct LearnView: View {
    @Environment(LangStore.self) private var langs
    @State private var path = NavigationPath()
    var subjects: (any Subjects)?

    var decks: [DeckEntry] { subjects?.decks ?? [] }

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
                    FilmsSection { path.append(LearnRoute.film($0)) }
                    subjects?.section(open: { path.append($0) }, search: { path.append(LearnRoute.canon) })
                    if let corpus = langs.corpus { LanguageFooter(corpus: corpus) }
                }
                .compactSections()
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
            .toolbar { ToolbarItem(placement: .primaryAction) { ScreenShareButton() } }
            .navigationDestination(for: DeckEntry.self) { subjects?.deck($0) }
            .navigationDestination(for: AtomRoute.self) { subjects?.atom($0) }
            .navigationDestination(for: LearnRoute.self) { destination($0) }
            .langDestinations(path: $path)
        }
        .task {
            await langs.load()
            await FilmStore.shared.load()
            #if DEBUG
            if let game = Launch.value("-openGame").flatMap(GameKind.init(rawValue:)) { path.append(LearnRoute.game(game)) }
            if let kind = Launch.value("-contentKind").flatMap(ContentKind.init(rawValue:)) { path.append(LearnRoute.content(kind)) }
            if let topic = ContentCatalog.topics.first(where: { $0.title == Launch.value("-readTopic") }) { path.append(LearnRoute.read(topic)) }
            if let book = Launch.value("-openLibrary") {
                path.append(LearnRoute.library)
                if book != "list" { path.append(LearnRoute.book(book)) }
            }
            if let id = Launch.value("-openFilm") {
                await FilmStore.shared.load()
                if let film = FilmStore.shared.films.first(where: { $0.id == id }) { path.append(LearnRoute.film(film)) }
            }
            #endif
            guard let spec = Launch.value("-openLang") else { return }
            let parts = spec.split(separator: ":").map(String.init)
            guard parts.count == 3 else { return }
            let targets = parts[1].split(separator: ",").map(String.init)
            let existing = langs.systems.first { $0.root == parts[0] && $0.targets == targets }
            let system: LangSystem? = if let existing { existing } else { try? await langs.create(root: parts[0], targets: targets) }
            guard let system else { return }
            #if DEBUG
            if existing == nil, let n = Launch.value("-polingualDemo").flatMap(Int.init), let corpus = langs.corpus {
                for (i, lang) in system.targets.enumerated() { await langs.place(system.id, lang: lang, tier: Double(max(0, 2 - i))) }
                for item in corpus.items.prefix(n) {
                    for lang in system.targets { langs.grade(system.id, lang: lang, itemId: item.id, rating: 3) }
                }
            }
            #endif
            switch parts[2] {
            case "study": path.append(LangRoute.study(system.id))
            case "place": path.append(LangRoute.place(system.id, nil))
            case "system": path.append(LangRoute.system(system.id))
            default: break
            }
        }
        .onChange(of: DeepLink.shared.pending, initial: true) { _, _ in Task { await follow() } }
        .onChange(of: decks) { _, decks in
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
                    LanguageSections(path: $path, corpus: corpus, proxy: proxy)
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
        case .canon: subjects?.canon()
        case .game(let game): game.screen
        case .read(let topic, let lang): ReadView(topic: topic, langs: readLangs(lang)).fullHeightSession()
        case .content(let kind): ContentHub(embedded: true, start: kind).fullHeightSession()
        case .translate: TranslateScreen()
        case .library: LibraryList { path.append(LearnRoute.book($0)) }
        case .book(let id): LibraryReader(id: id).fullHeightSession()
        case .film(let film): FilmView(film: film).fullHeightSession()
        case .newSet:
            ScrollViewReader { proxy in
                List {
                    if let corpus = langs.corpus { LanguageSections(path: $path, corpus: corpus, proxy: proxy) }
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
                Text(system.title).font(.system(size: 17, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
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
        .confirmationDialog("Remove \(system.title)?", isPresented: $removing, titleVisibility: .visible) {
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
    @State private var library = LibraryStore.shared
    let open: (LearnRoute) -> Void

    var names: String { langs.contentLangs.prefix(3).map(langName).joined(separator: ", ") }

    var body: some View {
        Section {
            LazyVGrid(columns: learnColumns, spacing: 14) {
                LearnTile(title: ContentKind.read.title, detail: String(localized: "Side by side in \(names)"), face: D8.malachite, lip: D8.malachiteLip, open: { open(.content(.read)) }) {
                    LearnSymbol(name: "book")
                }
                LearnTile(title: ContentKind.listen.title, detail: String(localized: "Live radio in \(names)"), face: D8.vermilion, lip: D8.vermilionLip, item: .activity(.listen), open: { open(.content(.listen)) }) {
                    LearnSymbol(name: "dot.radiowaves.left.and.right")
                }
                LearnTile(title: ContentKind.watch.title, detail: String(localized: "Videos on \(ContentCatalog.topics.count) topics"), face: D8.lapis, lip: Color(hex: 0x12326A), item: .activity(.watch), open: { open(.content(.watch)) }) {
                    LearnSymbol(name: "play.rectangle")
                }
                if library.index?.books.isEmpty == false {
                    LibraryTile { open(.library) }
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
        .task { await library.loadIndex() }
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
            guard let subjects else {
                DeepLink.shared.pending = nil
                return
            }
            guard let entry = decks.first(where: { $0.id == id }) else {
                if !decks.isEmpty { DeepLink.shared.pending = nil }
                return
            }
            DeepLink.shared.pending = nil
            path = NavigationPath()
            path.append(entry)
            if case .atom(_, let atomId) = link, let deck = await subjects.prepared(entry), let atom = deck.byId[atomId] {
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
            DeepLink.shared.pending = nil
            path = NavigationPath()
            path.append(LearnRoute.translate)
        default: break
        }
    }
}

enum LearnRoute: Hashable {
    case canon
    case game(GameKind)
    case read(ContentTopic, lang: String? = nil)
    case content(ContentKind)
    case translate
    case newSet
    case library
    case book(String)
    case film(WatchFilm)
}

struct AtomRoute: Hashable {
    let deck: DeckEntry
    let atom: Atom
}

extension View {
    @ViewBuilder func compactSections() -> some View {
        #if os(iOS)
        listSectionSpacing(.compact)
        #else
        self
        #endif
    }
}
