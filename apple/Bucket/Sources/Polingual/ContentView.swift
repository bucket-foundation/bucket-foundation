import AVFoundation
import BucketKit
import CoreLocation
import MediaPlayer
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

    func nearby(_ lang: String, place: Place.Spot?) async {
        let key = "near:\(lang)"
        failed.remove(key)
        let country = Locale.current.region?.identifier
        do {
            let found = try await api.stations(lang, near: place.map { ($0.lat, $0.lon) }, country: country, limit: 12)
            guard !Task.isCancelled else { return }
            stations[key] = found
            failed.remove(key)
        } catch {
            if !Task.isCancelled && stations[key] == nil { failed.insert(key) }
        }
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
    private(set) var station: RadioStation?
    private(set) var lang: String?
    private var counter: Task<Void, Never>?

    init() {
        #if os(iOS)
        Task { [weak self] in
            for await n in NotificationCenter.default.notifications(named: AVAudioSession.interruptionNotification) {
                let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
                if raw == AVAudioSession.InterruptionType.began.rawValue { self?.pause() }
                if raw == AVAudioSession.InterruptionType.ended.rawValue, let o = n.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt,
                   AVAudioSession.InterruptionOptions(rawValue: o).contains(.shouldResume) { self?.resume() }
            }
        }
        #endif
        let c = MPRemoteCommandCenter.shared()
        let run: (@escaping @MainActor (RadioPlayer) -> Void) -> (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus = { act in
            { [weak self] _ in
                MainActor.assumeIsolated {
                    guard let self, self.station != nil else { return .noActionableNowPlayingItem }
                    act(self)
                    return .success
                }
            }
        }
        c.playCommand.addTarget(handler: run { $0.resume() })
        c.pauseCommand.addTarget(handler: run { $0.pause() })
        c.stopCommand.addTarget(handler: run { $0.stop() })
        c.togglePlayPauseCommand.addTarget(handler: run { if $0.playing == nil { $0.resume() } else { $0.pause() } })
        commands(false)
    }

    func commands(_ on: Bool) {
        let c = MPRemoteCommandCenter.shared()
        for cmd in [c.playCommand, c.pauseCommand, c.stopCommand, c.togglePlayPauseCommand] { cmd.isEnabled = on }
    }

    func resume() {
        guard playing == nil, let station else { return }
        guard let player else {
            start(station, lang: lang)
            return
        }
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        player.currentItem?.seek(to: .positiveInfinity, completionHandler: nil)
        player.play()
        playing = station.id
        nowPlaying(rate: 1)
        counter = Immersion.shared.counting { [weak self] in self?.playing != nil }
    }

    func pause() {
        guard playing != nil else { return }
        player?.pause()
        playing = nil
        counter?.cancel()
        counter = nil
        nowPlaying(rate: 0)
    }

    func nowPlaying(rate: Double) {
        guard let station else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            return
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [
            MPMediaItemPropertyTitle: station.name,
            MPMediaItemPropertyArtist: [lang.map(langName), station.country.isEmpty ? nil : station.country].compactMap { $0 }.joined(separator: " · "),
            MPMediaItemPropertyAlbumTitle: Feedback.appName,
            MPNowPlayingInfoPropertyIsLiveStream: true,
            MPNowPlayingInfoPropertyPlaybackRate: rate,
        ]
        #if os(macOS)
        MPNowPlayingInfoCenter.default().playbackState = rate > 0 ? .playing : .paused
        #endif
    }

    func toggle(_ s: RadioStation, lang: String? = nil) {
        if playing == s.id {
            stop()
            return
        }
        start(s, lang: lang)
    }

    func start(_ s: RadioStation, lang: String?) {
        halt()
        guard let url = s.stream else { return }
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item)
        player = p
        playing = s.id
        station = s
        self.lang = lang
        failedId = nil
        p.play()
        nowPlaying(rate: 1)
        commands(true)
        counter = Immersion.shared.counting { [weak self] in self?.playing != nil }
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
        ]
    }

    func fail(_ id: String) {
        guard playing == id else { return }
        stop()
        failedId = id
    }

    func stop() {
        halt()
        station = nil
        lang = nil
        nowPlaying(rate: 0)
        commands(false)
    }

    private func halt() {
        counter?.cancel()
        counter = nil
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
            } footer: {
                ImmersionLine()
            }
            switch kind {
            case .read: ReadList(branch: branch, langs: shownLangs)
            case .listen: ListenList(branch: branch, langs: shownLangs, home: langs.systems.first?.root ?? Locale.current.language.languageCode?.identifier)
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
            if let i = args.firstIndex(of: "-watchQuery"), i + 1 < args.count {
                try? await Task.sleep(for: .seconds(2))
                InApp.shared.watch(args[i + 1], lang: learnerLangs.first ?? "es")
            }
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
        .inlineTitle()
        .environment(\.openURL, OpenURLAction { url in
            guard let p = WordTaps.parse(url) else { return InApp.shared.open(url) }
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

@MainActor
@Observable
final class Place: NSObject, CLLocationManagerDelegate {
    static let shared = Place()
    struct Spot: Equatable { let lat: Double; let lon: Double }
    private let manager = CLLocationManager()
    private(set) var spot: Spot?
    private(set) var status: CLAuthorizationStatus

    override init() {
        status = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyThreeKilometers
    }

    var allowed: Bool {
        #if os(iOS)
        status == .authorizedWhenInUse || status == .authorizedAlways
        #else
        status == .authorizedAlways
        #endif
    }

    func ask() {
        if status == .notDetermined { manager.requestWhenInUseAuthorization() } else if allowed { manager.requestLocation() }
    }

    func refresh() { if allowed && spot == nil { manager.requestLocation() } }

    nonisolated func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let s = m.authorizationStatus
        Task { @MainActor in
            status = s
            refresh()
        }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let c = locations.last?.coordinate else { return }
        Task { @MainActor in spot = Spot(lat: c.latitude, lon: c.longitude) }
    }

    nonisolated func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {}
}

struct NearbyRadio: View {
    let lang: String
    @State private var store = ContentStore.shared
    @State private var radio = RadioPlayer.shared
    @State private var place = Place.shared

    var body: some View {
        let key = "near:\(lang)"
        let shown = (store.stations[key] ?? []).filter { !store.hidden.contains($0.id) }
        Section {
            #if os(iOS)
            if !place.allowed && place.status != .denied && place.status != .restricted {
                Button { place.ask() } label: { Label("Find stations near me", systemImage: "location.fill") }
                    .foregroundStyle(D8.lapis)
            }
            #endif
            if store.failed.contains(key) {
                Button("Stations did not load. Retry") { Task { await store.nearby(lang, place: place.spot) } }
            } else if store.stations[key] == nil {
                ProgressView()
            } else if shown.isEmpty {
                Text("No stations found near you.").foregroundStyle(Palette.muted)
            }
            ForEach(shown) { s in StationRow(station: s, lang: lang) }
        } header: {
            HStack(spacing: 6) {
                Image(systemName: place.spot == nil ? "globe" : "location.fill").font(.caption).foregroundStyle(D8.lapis)
                Eyebrow(text: place.spot == nil ? String(localized: "Your country") : String(localized: "Near you"))
            }
        } footer: {
            if place.spot != nil { Text("Your location is rounded to about 11 km before it is sent to radio-browser.info.") }
        }
        .listRowBackground(Palette.card)
        .task(id: place.spot) { await store.nearby(lang, place: place.spot) }
        .onAppear { place.refresh() }
    }
}

struct StationRow: View {
    let station: RadioStation
    let lang: String
    @State private var store = ContentStore.shared
    @State private var radio = RadioPlayer.shared

    var body: some View {
        let s = station
        Button { radio.toggle(s, lang: lang) } label: {
            HStack(spacing: 12) {
                Image(systemName: radio.playing == s.id ? "stop.circle.fill" : "play.circle.fill")
                    .font(.title)
                    .foregroundStyle(radio.playing == s.id ? D8.vermilion : Palette.green)
                VStack(alignment: .leading, spacing: 3) {
                    Text(s.name).font(.headline).foregroundStyle(Palette.ink).lineLimit(1)
                    Text(radio.failedId == s.id ? String(localized: "This station did not play.") : (s.state.isEmpty ? s.country : s.state))
                        .font(.footnote)
                        .foregroundStyle(radio.failedId == s.id ? D8.vermilion : Palette.muted)
                        .lineLimit(1)
                }
            }
        }
        .accessibilityLabel(Text(radio.playing == s.id ? "Stop \(s.name)" : "Play \(s.name)"))
        .contextMenu { Button("Report station", systemImage: "flag", role: .destructive) { report() } }
        .swipeActions { Button("Report", systemImage: "flag", role: .destructive) { report() } }
    }

    func report() {
        if radio.playing == station.id { radio.stop() }
        store.report(station)
    }
}

struct ListenList: View {
    let branch: String?
    let langs: [String]
    var home: String?
    @State private var store = ContentStore.shared
    @State private var radio = RadioPlayer.shared

    var body: some View {
        if let home, branch == nil { NearbyRadio(lang: home) }
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
                ForEach(shown) { s in
                    Button { radio.toggle(s, lang: l) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: radio.playing == s.id ? "stop.circle.fill" : "play.circle.fill")
                                .font(.title)
                                .foregroundStyle(radio.playing == s.id ? D8.vermilion : Palette.green)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(s.name).font(.headline).foregroundStyle(Palette.ink).lineLimit(1)
                                Text(radio.failedId == s.id ? String(localized: "This station did not play.") : s.country)
                                    .font(.footnote)
                                    .foregroundStyle(radio.failedId == s.id ? D8.vermilion : Palette.muted)
                                ContentTags(langs: [l], branch: s.branch)
                            }
                        }
                    }
                    .accessibilityLabel(Text(radio.playing == s.id ? "Stop \(s.name)" : "Play \(s.name)"))
                    .contextMenu {
                        Button("Report station", systemImage: "flag", role: .destructive) { report(s) }
                    }
                    .swipeActions {
                        Button("Report", systemImage: "flag", role: .destructive) { report(s) }
                    }
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
            .task {
                await store.stations(l)
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("-playRadio"), radio.station == nil, let s = store.stations[l]?.first { radio.toggle(s, lang: l) }
                #endif
            }
        }
    }

    func report(_ s: RadioStation) {
        if radio.playing == s.id { radio.stop() }
        store.report(s)
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
                    Button { InApp.shared.watch(title ?? "\(t.title) \(Lang.info[l]?.name ?? l)", lang: l) } label: {
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

struct ImmersionLine: View {
    @State private var immersion = Immersion.shared

    var body: some View {
        let m = immersion.today
        Label(m == 0 ? String(localized: "Listen or watch to count minutes today") : String(localized: "\(m) min listened and watched today"), systemImage: "headphones")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(m == 0 ? Palette.muted : D8.malachite)
            .padding(.top, 6)
    }
}

struct RadioMiniPlayer: View {
    @State private var radio = RadioPlayer.shared

    var body: some View {
        if let s = radio.station {
            HStack(spacing: 10) {
                if let l = radio.lang { FlagTile(lang: l, size: 26) }
                VStack(alignment: .leading, spacing: 1) {
                    Text(s.name).font(.subheadline.weight(.bold)).lineLimit(1)
                    Text(radio.playing == nil ? String(localized: "Paused") : String(localized: "Live radio")).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
                }
                Spacer(minLength: 4)
                Image(systemName: "waveform").symbolEffect(.variableColor.iterative, isActive: radio.playing != nil).foregroundStyle(D8.vermilion)
                Button { if radio.playing == nil { radio.resume() } else { radio.pause() } } label: {
                    Image(systemName: radio.playing == nil ? "play.fill" : "pause.fill").font(.title3)
                }
                .accessibilityLabel(radio.playing == nil ? String(localized: "Play") : String(localized: "Pause"))
                Button { radio.stop() } label: { Image(systemName: "xmark").font(.subheadline.weight(.bold)) }
                    .accessibilityLabel("Stop radio")
            }
            .padding(.horizontal, 14)
            .buttonStyle(.plain)
        }
    }
}

extension View {
    func radioInTabBar() -> some View { modifier(RadioTabAccessory()) }
    func radioAtBottom() -> some View { modifier(RadioBottomBar()) }
}

struct RadioTabAccessory: ViewModifier {
    @State private var radio = RadioPlayer.shared

    func body(content: Content) -> some View {
        #if os(iOS)
        if #available(iOS 26.1, *) {
            content.tabViewBottomAccessory(isEnabled: radio.station != nil) { RadioMiniPlayer() }
        } else {
            content.radioAtBottom()
        }
        #else
        content
        #endif
    }
}

struct RadioBottomBar: ViewModifier {
    @State private var radio = RadioPlayer.shared

    func body(content: Content) -> some View {
        content.safeAreaInset(edge: .bottom) {
            if radio.station != nil {
                RadioMiniPlayer()
                    .padding(.vertical, 10)
                    .background(.regularMaterial, in: .capsule)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 4)
            }
        }
    }
}
