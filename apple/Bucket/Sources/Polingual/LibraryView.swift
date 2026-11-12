import BucketKit
import SwiftUI

@MainActor
@Observable
final class LibraryStore {
    static let shared = LibraryStore()
    let api = LibraryAPI()
    let progress = LibraryProgress()
    var index: LibraryIndex?
    var books: [String: LibraryBook] = [:]
    var indexFailed = false
    var failed: Set<String> = []

    func loadIndex() async {
        #if DEBUG
        if Launch.flag("-libraryFixture") {
            index = Self.fixture("index")
            return
        }
        #endif
        if index == nil { index = api.cachedIndex() }
        indexFailed = false
        do { index = try await api.index() } catch { indexFailed = index == nil }
    }

    func load(_ id: String) async {
        #if DEBUG
        if Launch.flag("-libraryFixture") {
            books[id] = Self.fixture(id)
            return
        }
        #endif
        guard books[id] == nil else { return }
        failed.remove(id)
        let entry = index?.books.first { $0.id == id }
        do { books[id] = try await api.book(id, stamp: entry?.stamp) } catch { failed.insert(id) }
    }

    #if DEBUG
    static func fixture<T: Decodable>(_ name: String) -> T? {
        guard LibraryAPI.validId(name) else { return nil }
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appending(path: "../../../BucketKit/Tests/BucketKitTests/Fixtures/library/\(name).json")
        guard let data = try? Data(contentsOf: url.standardized) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
    #endif
}

extension LangStore {
    var libraryLangs: [String] {
        #if DEBUG
        if let forced = Launch.value("-libraryLangs") { return forced.split(separator: ",").map(String.init) }
        #endif
        return contentLangs
    }
}

struct LibraryTile: View {
    @Environment(LangStore.self) private var langs
    let open: () -> Void

    var names: String { langs.libraryLangs.prefix(3).map(langName).joined(separator: ", ") }

    var body: some View {
        LearnTile(title: String(localized: "Library"), detail: String(localized: "Fables in \(names)"), face: Color(hex: 0x8C5A1C), lip: Color(hex: 0x5E3B10), open: open) {
            LearnSymbol(name: "books.vertical")
        }
    }
}

struct LibraryList: View {
    @Environment(LangStore.self) private var langs
    @State private var store = LibraryStore.shared
    let open: (String) -> Void

    var body: some View {
        List {
            if let index = store.index {
                Section {
                    ForEach(index.books) { book in
                        Button { open(book.id) } label: { card(book) }
                            .buttonStyle(.plain)
                            .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                            .listRowSeparator(.hidden)
                    }
                }
                .listRowBackground(Color.clear)
            } else if store.indexFailed {
                Section {
                    Text("The library did not load. Check your connection.").foregroundStyle(Palette.muted)
                    Button("Retry") { Task { await store.loadIndex() } }
                }
                .listRowBackground(Palette.card)
            } else {
                Section { ProgressView().frame(maxWidth: .infinity) }
                    .listRowBackground(Color.clear)
            }
        }
        .paper()
        .navigationTitle("Library")
        .inlineTitle()
        .task { await store.loadIndex() }
    }

    func card(_ book: LibraryEntry) -> some View {
        let first = langs.libraryLangs.first ?? "en"
        let at = store.progress.sentence(book.id)
        return HStack(alignment: .top, spacing: 14) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(D8.parchment)
                .frame(width: 52, height: 52)
                .background(Color(hex: 0x8C5A1C), in: .rect(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 4) {
                Text(book.title(in: [first]))
                    .font(.serif(.title3, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .environment(\.layoutDirection, Lang.isRTL(first) ? .rightToLeft : .leftToRight)
                Text(book.author).font(.subheadline).foregroundStyle(Palette.muted)
                if at > 0 {
                    ProgressView(value: Double(at + 1), total: Double(max(1, book.sentences))).tint(D8.malachite)
                    Text("Sentence \(at + 1) of \(book.sentences)").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(D8.face, in: .rect(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(D8.edge, lineWidth: 2) }
    }
}

struct LibraryReader: View {
    @Environment(LangStore.self) private var langs
    @State private var store = LibraryStore.shared
    @State private var page: Int?
    let id: String

    var shown: [String] { langs.libraryLangs }

    var body: some View {
        Group {
            if let book = store.books[id] {
                reader(book)
            } else if store.failed.contains(id) {
                VStack(spacing: 12) {
                    Text("This book did not load. Check your connection.").foregroundStyle(Palette.muted).multilineTextAlignment(.center)
                    Button("Retry") { Task { await store.load(id) } }.buttonStyle(D8Primary(compact: true))
                }
                .padding(24)
            } else {
                ProgressView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .paper()
        .navigationTitle(store.books[id]?.title(in: shown) ?? String(localized: "Library"))
        .inlineTitle()
        .wordTaps(reveal: true)
        .task {
            await store.load(id)
            if page == nil, let book = store.books[id] {
                page = min(store.progress.sentence(id), max(0, book.sentences.count - 1))
            }
        }
    }

    func reader(_ book: LibraryBook) -> some View {
        let at = page ?? 0
        let total = book.sentences.count
        return VStack(spacing: 12) {
            header(book)
            ScrollView(.horizontal) {
                LazyHStack(spacing: 0) {
                    ForEach(book.sentences.indices, id: \.self) { i in
                        card(book, i)
                            .padding(.horizontal, 16)
                            .containerRelativeFrame(.horizontal)
                            .id(i)
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: $page)
            .scrollIndicators(.hidden)
            VStack(spacing: 8) {
                ProgressView(value: Double(at + 1), total: Double(max(1, total))).tint(D8.malachite)
                HStack {
                    Button { go(at - 1, total) } label: { Label("Previous", systemImage: "chevron.backward") }
                        .disabled(at == 0)
                    Spacer()
                    Text("Sentence \(at + 1) of \(total)").font(.footnote).foregroundStyle(Palette.muted).monospacedDigit()
                    Spacer()
                    if at + 1 < total {
                        Button { go(at + 1, total) } label: { Label("Next", systemImage: "chevron.forward") }
                    } else {
                        Button { go(0, total) } label: { Label("Read again", systemImage: "arrow.counterclockwise") }
                    }
                }
                .labelStyle(.iconOnly)
                .font(.title3.weight(.semibold))
                .buttonStyle(.borderless)
                .tint(Palette.green)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
        .onChange(of: page) { _, p in
            if let p { store.progress.save(book.id, sentence: p) }
        }
    }

    func go(_ i: Int, _ total: Int) {
        guard (0..<total).contains(i) else { return }
        withAnimation { page = i }
    }

    func header(_ book: LibraryBook) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(book.author).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
            if book.machine(in: shown) {
                Label("Machine translation", systemImage: "globe").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            }
            Text(book.license).font(.caption).foregroundStyle(Palette.muted).fixedSize(horizontal: false, vertical: true)
            ForEach(book.credits(shown), id: \.lang) { c in
                Text(verbatim: "\(c.lang.uppercased()) · \(c.name)").font(.caption).foregroundStyle(Palette.muted)
            }
            if let url = book.sourceURL {
                Link(destination: url) { Text("Source") }.font(.caption.weight(.semibold)).tint(Palette.green)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    func card(_ book: LibraryBook, _ i: Int) -> some View {
        ScrollView(.vertical) {
            VStack(alignment: .leading, spacing: 18) {
                ForEach(book.lines(i, langs: shown), id: \.lang) { line in
                    row(line.lang, line.text)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .scrollBounceBehavior(.basedOnSize)
        .background(Palette.card, in: .rect(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(D8.edge, lineWidth: 1) }
    }

    func row(_ lang: String, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            FlagTile(lang: lang, size: 22).alignmentGuide(.firstTextBaseline) { $0[.bottom] - 4 }
            Text(tapText(text, lang))
                .font(.serif(.title3))
                .lineSpacing(4)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
            PlayButton(text: text, lang: lang, label: String(localized: "Play \(langName(lang))"))
                .font(.title3)
        }
        .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
    }
}
