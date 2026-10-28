import AVFoundation
import BucketKit
import SwiftUI

extension ContentKind {
    var title: String {
        switch self {
        case .read: String(localized: "Read")
        case .listen: String(localized: "Listen")
        case .watch: String(localized: "Watch")
        }
    }
}

func branchTitle(_ id: String) -> String {
    switch id {
    case "01": String(localized: "Mathematics")
    case "02": String(localized: "Physics")
    case "03": String(localized: "Chemistry")
    case "04": String(localized: "Information")
    case "05": String(localized: "Biophysics")
    case "06": String(localized: "Cosmology")
    case "07": String(localized: "Mind")
    default: String(localized: "Language")
    }
}

@MainActor
@Observable
final class ContentStore {
    static let shared = ContentStore()
    let api = ContentAPI()
    var titles: [String: [String: String]] = [:]
    var summaries: [String: WikiSummary] = [:]
    var stations: [String: [RadioStation]] = [:]
    var failed: Set<String> = []

    func titles(for topic: ContentTopic) async -> [String: String] {
        if let t = titles[topic.title] { return t }
        guard let t = try? await api.titles(topic.title) else { return ["en": topic.title] }
        titles[topic.title] = t
        return t
    }

    func summary(_ lang: String, _ title: String) async -> WikiSummary? {
        let key = "\(lang):\(title)"
        if let s = summaries[key] { return s }
        guard let s = try? await api.summary(lang, title: title) else {
            failed.insert(key)
            return nil
        }
        summaries[key] = s
        return s
    }

    func stations(_ lang: String) async {
        guard stations[lang] == nil else { return }
        do { stations[lang] = try await api.stations(lang) } catch { failed.insert("radio:\(lang)") }
    }
}

@MainActor
@Observable
final class RadioPlayer {
    static let shared = RadioPlayer()
    private var player: AVPlayer?
    private(set) var playing: String?

    func toggle(_ s: RadioStation) {
        if playing == s.id {
            stop()
            return
        }
        guard let url = s.stream else { return }
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        player = AVPlayer(url: url)
        player?.play()
        playing = s.id
    }

    func stop() {
        player?.pause()
        player = nil
        playing = nil
    }
}

struct ContentHub: View {
    @Environment(LangStore.self) private var langs
    var embedded = false
    @State private var kind: ContentKind = Self.launchKind
    @State private var branch: String?
    @State private var lang: String?
    @State private var openTopic: ContentTopic?

    static var launchKind: ContentKind {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-contentKind"), i + 1 < args.count, let k = ContentKind(rawValue: args[i + 1]) { return k }
        #endif
        return .read
    }

    var learnerLangs: [String] {
        let all = langs.gameLangs
        return all.isEmpty ? ["es", "fr"] : all
    }

    var shownLangs: [String] { lang.map { [$0] } ?? learnerLangs }

    var body: some View {
        if embedded {
            content
        } else {
            NavigationStack { content }
        }
    }

    var content: some View {
        List {
            Section {
                Picker("Content", selection: $kind) {
                    ForEach(ContentKind.allCases, id: \.self) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            switch kind {
            case .read: ReadList(branch: branch, langs: shownLangs)
            case .listen: ListenList(branch: branch, langs: shownLangs)
            case .watch: WatchList(branch: branch, langs: shownLangs)
            }
            if langs.systems.isEmpty {
                Section {
                    Text("Showing Spanish and French. Start a language set in Learn to see your own languages.")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                }
                .listRowBackground(Color.clear)
            }
        }
        .paper()
        .navigationTitle("Content")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Picker("Branch", selection: $branch) {
                        Text("All branches").tag(String?.none)
                        ForEach(ContentCatalog.branches, id: \.id) { Text(branchTitle($0.id)).tag(String?.some($0.id)) }
                    }
                    Picker("Language", selection: $lang) {
                        Text("All my languages").tag(String?.none)
                        ForEach(learnerLangs, id: \.self) { Text(langName($0)).tag(String?.some($0)) }
                    }
                } label: {
                    Label("Filter", systemImage: branch == nil && lang == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                }
            }
        }
        .navigationDestination(for: ContentTopic.self) { ReadView(topic: $0, langs: shownLangs) }
        .navigationDestination(item: $openTopic) { ReadView(topic: $0, langs: shownLangs) }
        .task {
            await langs.load()
            #if DEBUG
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "-readTopic"), i + 1 < args.count { openTopic = ContentCatalog.topics.first { $0.title == args[i + 1] } }
            #endif
        }
    }
}

extension ContentTopic: Hashable {
    public func hash(into h: inout Hasher) { h.combine(title) }
}

struct ContentTags: View {
    let langs: [String]
    let branch: String

    var body: some View {
        HStack(spacing: 4) {
            BranchTile(branch: branch, size: 18)
            Text(branchTitle(branch)).font(.caption2.weight(.semibold)).foregroundStyle(Palette.muted)
            ForEach(langs.prefix(4), id: \.self) { FlagTile(lang: $0, size: 16) }
        }
    }
}

struct ReadList: View {
    let branch: String?
    let langs: [String]

    var body: some View {
        Section {
            ForEach(ContentCatalog.topics(in: branch)) { t in
                NavigationLink(value: t) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(t.title).font(.headline)
                        ContentTags(langs: langs, branch: t.branch)
                    }
                    .padding(.vertical, 2)
                }
            }
        } header: {
            Eyebrow(text: "Wikipedia side by side")
        } footer: {
            Text("Tap any word to hear it. Text from Wikipedia, CC BY-SA.")
        }
        .listRowBackground(Palette.card)
    }
}

struct ReadView: View {
    let topic: ContentTopic
    let langs: [String]
    @State private var titles: [String: String] = [:]
    @State private var texts: [String: WikiSummary] = [:]
    @State private var loading = true

    var body: some View {
        ScrollView(.vertical) {
            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(langs, id: \.self) { l in column(l) }
                }
                .padding()
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .paper()
        .navigationTitle(topic.title)
        .inlineTitle()
        .environment(\.openURL, OpenURLAction { url in
            guard let p = WordTaps.parse(url) else { return .systemAction }
            _ = LangVoice.shared.speak(p.word, p.lang)
            return .handled
        })
        .task { await load() }
    }

    func column(_ l: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                FlagTile(lang: l, size: 26)
                Text(texts[l]?.title ?? titles[l] ?? langName(l)).font(.serif(.title3, weight: .semibold))
            }
            if let s = texts[l] {
                Text(tappable(s.extract, l))
                    .font(.serif(.body))
                    .lineSpacing(4)
                    .environment(\.layoutDirection, Lang.info[l]?.rtl == true ? .rightToLeft : .leftToRight)
            } else if loading {
                ProgressView()
            } else {
                Text("No \(langName(l)) article on this topic yet.").foregroundStyle(Palette.muted)
            }
        }
        .padding(16)
        .frame(width: 320, alignment: .topLeading)
        .background(Palette.card, in: .rect(cornerRadius: 16))
    }

    func tappable(_ text: String, _ lang: String) -> AttributedString {
        var out = AttributedString(text)
        for (word, range) in WordTaps.words(text) {
            guard let lower = AttributedString.Index(range.lowerBound, within: out),
                  let upper = AttributedString.Index(range.upperBound, within: out),
                  let url = WordTaps.link(lang: lang, word: word) else { continue }
            out[lower..<upper].link = url
            out[lower..<upper].foregroundColor = Palette.ink
        }
        return out
    }

    func load() async {
        let store = ContentStore.shared
        titles = await store.titles(for: topic)
        await withTaskGroup(of: (String, WikiSummary?).self) { group in
            for l in langs {
                guard let t = titles[l] else { continue }
                group.addTask { await (l, store.summary(l, t)) }
            }
            for await (l, s) in group { if let s { texts[l] = s } }
        }
        loading = false
    }
}

struct ListenList: View {
    let branch: String?
    let langs: [String]
    @State private var store = ContentStore.shared
    @State private var radio = RadioPlayer.shared

    var body: some View {
        ForEach(langs, id: \.self) { l in
            let all = store.stations[l] ?? []
            let shown = all.filter { branch == nil || $0.branch == branch }
            Section {
                if store.stations[l] == nil && !store.failed.contains("radio:\(l)") {
                    ProgressView()
                } else if shown.isEmpty {
                    Text(all.isEmpty ? String(localized: "No stations found.") : String(localized: "No stations in this branch.")).foregroundStyle(Palette.muted)
                }
                ForEach(shown) { s in
                    Button { radio.toggle(s) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: radio.playing == s.id ? "stop.circle.fill" : "play.circle.fill")
                                .font(.title)
                                .foregroundStyle(radio.playing == s.id ? D8.vermilion : Palette.green)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(s.name).font(.headline).foregroundStyle(Palette.ink).lineLimit(1)
                                Text(s.country).font(.footnote).foregroundStyle(Palette.muted)
                                ContentTags(langs: [l], branch: s.branch)
                            }
                        }
                    }
                    .accessibilityLabel(Text(radio.playing == s.id ? "Stop \(s.name)" : "Play \(s.name)"))
                }
            } header: {
                HStack(spacing: 6) {
                    FlagTile(lang: l, size: 18)
                    Eyebrow(text: langName(l))
                }
            } footer: {
                if l == langs.last { Text("Stations from radio-browser.info.") }
            }
            .listRowBackground(Palette.card)
            .task { await store.stations(l) }
        }
    }
}

struct WatchList: View {
    let branch: String?
    let langs: [String]
    @State private var store = ContentStore.shared

    var body: some View {
        ForEach(ContentCatalog.topics(in: branch)) { t in
            Section {
                ForEach(langs, id: \.self) { l in
                    let title = store.titles[t.title]?[l]
                    Link(destination: ContentCatalog.youtube(title ?? "\(t.title) \(Lang.info[l]?.name ?? l)")) {
                        HStack(spacing: 10) {
                            FlagTile(lang: l, size: 24)
                            Text(title ?? t.title).foregroundStyle(Palette.ink)
                            Spacer()
                            Image(systemName: "play.rectangle.fill").foregroundStyle(D8.vermilion)
                        }
                    }
                }
            } header: {
                HStack(spacing: 6) {
                    BranchTile(branch: t.branch, size: 18)
                    Eyebrow(text: t.title)
                }
            }
            .listRowBackground(Palette.card)
            .task { _ = await store.titles(for: t) }
        }
    }
}
