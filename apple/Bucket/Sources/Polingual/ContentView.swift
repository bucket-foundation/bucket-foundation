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

    var activity: TodayActivity? {
        switch self {
        case .read: nil
        case .listen: .listen
        case .watch: .watch
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

    var hidden: Set<String> = Set(UserDefaults.standard.stringArray(forKey: "content.hiddenStations") ?? [])

    func titles(for topic: ContentTopic) async -> [String: String]? {
        if let t = titles[topic.title] { return t }
        guard let t = try? await api.titles(topic.title) else {
            failed.insert("titles:\(topic.title)")
            return nil
        }
        failed.remove("titles:\(topic.title)")
        titles[topic.title] = t
        return t
    }

    func report(_ s: RadioStation) {
        hidden.insert(s.id)
        UserDefaults.standard.set(Array(hidden), forKey: "content.hiddenStations")
        Beta.shared.log("radio_report", ["station": .string(s.id), "name": .string(s.name), "country": .string(s.countrycode)])
    }

    func summary(_ lang: String, _ title: String) async -> WikiSummary? {
        let key = "\(lang):\(title)"
        if let s = summaries[key] { return s }
        guard let s = try? await api.summary(lang, title: title) else {
            failed.insert(key)
            return nil
        }
        failed.remove(key)
        summaries[key] = s
        return s
    }

    func stations(_ lang: String) async {
        guard stations[lang] == nil else { return }
        failed.remove("radio:\(lang)")
        do { stations[lang] = try await api.stations(lang) } catch { failed.insert("radio:\(lang)") }
    }
}

@MainActor
@Observable
final class RadioPlayer {
    static let shared = RadioPlayer()
    private var player: AVPlayer?
    private var watch: [Task<Void, Never>] = []
    private(set) var playing: String?
    private(set) var failedId: String?
    private var clock = PlayClock()

    init() {
        #if os(iOS)
        Task { [weak self] in
            for await n in NotificationCenter.default.notifications(named: AVAudioSession.interruptionNotification) {
                let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
                if raw == AVAudioSession.InterruptionType.began.rawValue { self?.stop() }
            }
        }
        #endif
    }

    func toggle(_ s: RadioStation) {
        if playing == s.id {
            stop()
            return
        }
        stop()
        guard let url = s.stream else { return }
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item)
        player = p
        playing = s.id
        failedId = nil
        p.play()
        let id = s.id
        watch = [
            Task { [weak self] in
                for await status in item.publisher(for: \.status).values where status == .failed {
                    self?.fail(id)
                    return
                }
            },
            Task { [weak self] in
                for await _ in NotificationCenter.default.notifications(named: AVPlayerItem.failedToPlayToEndTimeNotification, object: item) {
                    self?.fail(id)
                    return
                }
            },
            Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    self?.heard()
                }
            },
        ]
    }

    func heard() {
        guard player?.timeControlStatus == .playing else { return }
        if clock.tick(1, day: dayKey(Date().timeIntervalSince1970 * 1000)) { TodayPlanStore.shared.finish(TodayActivity.listen.id) }
    }

    func fail(_ id: String) {
        guard playing == id else { return }
        stop()
        failedId = id
    }

    func stop() {
        watch.forEach { $0.cancel() }
        watch = []
        player?.pause()
        player = nil
        playing = nil
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }
}

extension LangStore {
    var contentLangs: [String] {
        let all = gameLangs
        return all.isEmpty ? ["es", "fr"] : all
    }
}

struct ContentHub: View {
    @Environment(LangStore.self) private var langs
    var embedded = false
    @State private var kind: ContentKind
    @State private var branch: String?
    @State private var lang: String?
    @State private var openTopic: ContentTopic?
    let fixed: Bool
    let fromToday: Bool

    init(embedded: Bool = false, start: ContentKind? = nil, fromToday: Bool = false) {
        self.embedded = embedded
        self.fromToday = fromToday
        fixed = start != nil
        _kind = State(initialValue: start ?? Self.launchKind)
    }

    static var launchKind: ContentKind {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-contentKind"), i + 1 < args.count, let k = ContentKind(rawValue: args[i + 1]) { return k }
        #endif
        return .read
    }

    var learnerLangs: [String] { langs.contentLangs }

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
            if !fixed {
                Section {
                    Picker("Content", selection: $kind) {
                        ForEach(ContentKind.allCases, id: \.self) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
            }
            switch kind {
            case .read: ReadList(branch: branch) { openTopic = $0 }
            case .listen: ListenList(branch: branch, langs: shownLangs)
            case .watch: WatchList(branch: branch, langs: shownLangs, earns: fromToday)
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
        .navigationTitle(fixed ? kind.title : String(localized: "Content"))
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
            if fixed, let activity = kind.activity {
                ToolbarItem(placement: .primaryAction) { AddToToday(item: .activity(activity), look: .icon) }
            }
        }
        .navigationDestination(for: ContentTopic.self) { ReadView(topic: $0, langs: shownLangs).fullHeightSession() }
        .onChange(of: kind) { _, k in if k != .listen { RadioPlayer.shared.stop() } }
        .onDisappear { RadioPlayer.shared.stop() }
        .navigationDestination(item: $openTopic) { ReadView(topic: $0, langs: shownLangs).fullHeightSession() }
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
    let open: (ContentTopic) -> Void

    var body: some View {
        Section {
            LazyVGrid(columns: learnColumns, spacing: 14) {
                ForEach(ContentCatalog.topics(in: branch)) { t in
                    LearnTile(title: t.title, detail: branchTitle(t.branch), face: BranchTile.face(t.branch), item: .topic(t), open: { open(t) }) {
                        Text(BranchTile.glyph(t.branch)).font(.system(size: 26, weight: .bold, design: .serif)).foregroundStyle(D8.parchment)
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            .listRowSeparator(.hidden)
        } footer: {
            Text("Tap any word to hear it. Text from Wikipedia, CC BY-SA.")
        }
        .listRowBackground(Color.clear)
    }
}

struct ReadView: View {
    let topic: ContentTopic
    let langs: [String]
    @State private var titles: [String: String] = [:]
    @State private var texts: [String: WikiSummary] = [:]
    @State private var loading = true
    @State private var failed = false

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
        .toolbar {
            ToolbarItem(placement: .primaryAction) { AddToToday(item: .topic(topic), look: .icon) }
            ToolbarItem(placement: .primaryAction) { ScreenShareButton() }
        }
        .shareObjects(langs.compactMap { l in texts[l].map { .content(ShareMoment(title: $0.title, source: String(localized: "\(langName(l)) Wikipedia"), branch: topic.branch, lang: l, quote: $0.extract, topic: topic.title)) } })
        .inlineTitle()
        .environment(\.openURL, OpenURLAction { url in
            guard let p = WordTaps.parse(url) else { return .systemAction }
            _ = LangVoice.shared.speak(p.word, p.lang)
            return .handled
        })
        .overlay {
            if failed {
                VStack(spacing: 12) {
                    Text("Wikipedia did not answer. Check your connection.").foregroundStyle(Palette.muted).multilineTextAlignment(.center)
                    Button("Retry") { Task { await load() } }.buttonStyle(D8Primary(compact: true))
                }
                .padding(24)
                .background(Palette.card, in: .rect(cornerRadius: 16))
            }
        }
        .task { await load() }
        .task(id: texts.isEmpty) {
            guard !texts.isEmpty else { return }
            try? await Task.sleep(for: .seconds(30))
            if !Task.isCancelled { TodayPlanStore.shared.finish(TodayItem.topic(topic).id) }
        }
    }

    func column(_ l: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                FlagTile(lang: l, size: 26)
                Text(texts[l]?.title ?? titles[l] ?? langName(l)).font(.serif(.title3, weight: .semibold))
                if let s = texts[l] {
                    Spacer(minLength: 0)
                    ShareObjectButton(.content(ShareMoment(title: s.title, source: String(localized: "\(langName(l)) Wikipedia"), branch: topic.branch, lang: l, quote: s.extract, topic: topic.title)))
                }
            }
            if let s = texts[l] {
                Text(tapText(s.extract, l))
                    .font(.serif(.body))
                    .lineSpacing(4)
                    .environment(\.layoutDirection, Lang.info[l]?.rtl == true ? .rightToLeft : .leftToRight)
            } else if loading {
                ProgressView()
            } else if let t = titles[l], ContentStore.shared.failed.contains("\(l):\(t)") {
                Text("This article did not load.").foregroundStyle(Palette.muted)
                Button("Retry") { Task { await load() } }
            } else {
                Text("No \(langName(l)) article on this topic yet.").foregroundStyle(Palette.muted)
            }
        }
        .padding(16)
        .frame(width: 320, alignment: .topLeading)
        .background(Palette.card, in: .rect(cornerRadius: 16))
    }

    func load() async {
        let store = ContentStore.shared
        loading = true
        failed = false
        for l in langs { if let t = titles[l] { store.failed.remove("\(l):\(t)") } }
        guard let found = await store.titles(for: topic) else {
            failed = true
            loading = false
            return
        }
        titles = found
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
            let shown = all.filter { (branch == nil || $0.branch == branch) && !store.hidden.contains($0.id) }
            Section {
                if store.failed.contains("radio:\(l)") {
                    Button("Stations did not load. Retry") { Task { await store.stations(l) } }
                } else if store.stations[l] == nil {
                    ProgressView()
                } else if shown.isEmpty {
                    Text(all.isEmpty ? String(localized: "No stations found.") : String(localized: "No stations in this branch.")).foregroundStyle(Palette.muted)
                }
                LazyVGrid(columns: learnColumns, spacing: 14) {
                    ForEach(shown) { s in
                        LearnTile(title: s.name, detail: radio.failedId == s.id ? String(localized: "This station did not play.") : s.country, face: radio.playing == s.id ? D8.vermilion : BranchTile.face(s.branch), open: { radio.toggle(s) }) {
                            LearnSymbol(name: radio.playing == s.id ? "stop.fill" : "play.fill")
                        }
                        .accessibilityLabel(Text(radio.playing == s.id ? "Stop \(s.name)" : "Play \(s.name)"))
                        .overlay(alignment: .topTrailing) {
                            ShareObjectButton(.content(ShareMoment(title: s.name, source: s.country, branch: s.branch, lang: l))).tint(D8.parchment).padding(10)
                        }
                        .contextMenu {
                            Button("Report station", systemImage: "flag", role: .destructive) { report(s) }
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowSeparator(.hidden)
            } header: {
                HStack(spacing: 6) {
                    FlagTile(lang: l, size: 18)
                    Eyebrow(text: langName(l))
                }
            } footer: {
                if l == langs.last { Text("Stations from radio-browser.info.") }
            }
            .listRowBackground(Color.clear)
            .task { await store.stations(l) }
        }
    }

    func report(_ s: RadioStation) {
        if radio.playing == s.id { radio.stop() }
        store.report(s)
    }
}

struct WatchList: View {
    @Environment(\.openURL) private var openURL
    let branch: String?
    let langs: [String]
    var earns = false
    @State private var store = ContentStore.shared

    var body: some View {
        ForEach(ContentCatalog.topics(in: branch)) { t in
            Section {
                LazyVGrid(columns: learnColumns, spacing: 14) {
                    ForEach(langs, id: \.self) { l in
                        let title = store.titles[t.title]?[l]
                        LearnTile(title: title ?? t.title, detail: langName(l), face: BranchTile.face(t.branch), open: {
                            if earns { WatchDwell.opened() }
                            openURL(ContentCatalog.youtube(title ?? "\(t.title) \(Lang.info[l]?.name ?? l)"))
                        }) {
                            FlagTile(lang: l, size: 30)
                        }
                        .overlay(alignment: .topTrailing) {
                            ShareObjectButton(.content(ShareMoment(title: title ?? t.title, source: branchTitle(t.branch), branch: t.branch, lang: l, topic: t.title))).tint(D8.parchment).padding(10)
                        }
                    }
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                .listRowSeparator(.hidden)
            } header: {
                HStack(spacing: 6) {
                    BranchTile(branch: t.branch, size: 18)
                    Eyebrow(text: t.title)
                }
            }
            .listRowBackground(Color.clear)
            .task { _ = await store.titles(for: t) }
        }
    }
}
