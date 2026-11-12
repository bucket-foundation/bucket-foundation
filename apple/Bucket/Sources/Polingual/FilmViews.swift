import AVKit
import BucketKit
import SwiftUI

@MainActor
@Observable
final class FilmStore {
    enum Status { case idle, loading, ready, failed }

    static let shared = FilmStore()
    let api: WatchAPI
    var films: [WatchFilm] = []
    var status: Status = .idle
    var cues: [String: [WatchCue]] = [:]

    var playable: [WatchFilm] { status == .ready ? films.filter { $0.video != nil } : [] }

    init() {
        #if DEBUG
        if let base = Launch.value("-watchBase").flatMap(URL.init(string:)) {
            api = WatchAPI(base: base)
            return
        }
        #endif
        api = WatchAPI()
    }

    func load(force: Bool = false) async {
        guard force || status == .idle || status == .failed, status != .loading else { return }
        status = .loading
        do {
            films = try await api.index().films
            status = .ready
        } catch {
            status = .failed
        }
    }

    static func key(_ film: WatchFilm, _ lang: String) -> String { "\(film.id)/\(lang)" }

    func cues(_ film: WatchFilm, _ lang: String) async {
        let key = Self.key(film, lang)
        guard cues[key] == nil, let found = try? await api.cues(film: film.id, lang: lang) else { return }
        cues[key] = found
    }
}

struct FilmsSection: View {
    @Environment(LangStore.self) private var langs
    @State private var store = FilmStore.shared
    let open: (WatchFilm) -> Void

    var body: some View {
        if !store.playable.isEmpty {
            Section {
                ScrollView(.horizontal) {
                    HStack(alignment: .top, spacing: 14) {
                        ForEach(store.playable) { film in
                            FilmTile(film: film, langs: film.subtitleLangs(for: langs.contentLangs)) { open(film) }
                        }
                    }
                    .padding(.bottom, 4)
                }
                .scrollIndicators(.hidden)
            } header: {
                LearnGroupTitle(text: "Films")
            }
            .id("films")
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
        }
    }
}

struct FilmPoster: View {
    let film: WatchFilm

    var body: some View {
        Color.black
            .aspectRatio(16 / 9, contentMode: .fit)
            .overlay {
                AsyncImage(url: film.poster) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "film").font(.largeTitle).foregroundStyle(D8.parchment.opacity(0.6))
                }
            }
            .clipped()
    }
}

struct FilmTile: View {
    let film: WatchFilm
    let langs: [String]
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            VStack(alignment: .leading, spacing: 6) {
                FilmPoster(film: film)
                    .clipShape(.rect(cornerRadius: 12))
                Text(film.title(langs[0])).font(D8.word(18)).foregroundStyle(Palette.ink).lineLimit(2).multilineTextAlignment(.leading)
                HStack(spacing: 4) {
                    Text("\(film.minutes) min").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                    ForEach(langs.prefix(4), id: \.self) { FlagTile(lang: $0, size: 16) }
                }
            }
            .frame(width: 230, alignment: .leading)
        }
        .buttonStyle(.plain)
    }
}

struct FilmCredit: View {
    let film: WatchFilm

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Link(destination: film.source) {
                Text(verbatim: film.credit).font(.footnote.weight(.semibold))
            }
            if let deed = film.licenseUrl {
                Link(destination: deed) { Text(verbatim: film.license).font(.caption) }
            } else {
                Text(verbatim: film.license).font(.caption).foregroundStyle(Palette.muted)
            }
        }
    }
}

struct FilmView: View {
    @Environment(LangStore.self) private var langs
    let film: WatchFilm
    @State private var playback: FilmStart?

    var shown: [String] { film.subtitleLangs(for: langs.contentLangs) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                FilmPoster(film: film).clipShape(.rect(cornerRadius: 16))
                VStack(alignment: .leading, spacing: 4) {
                    Text(film.title(shown[0])).font(.serif(.title, weight: .semibold)).foregroundStyle(Palette.ink)
                    if film.title(shown[0]) != film.title("en") {
                        Text(verbatim: film.title("en")).font(.subheadline).foregroundStyle(Palette.muted)
                    }
                }
                HStack(spacing: 6) {
                    Text("\(film.minutes) min").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                    ForEach(shown, id: \.self) { FlagTile(lang: $0, size: 20) }
                }
                if film.video != nil {
                    Button {
                        playback = FilmStart(at: 0)
                    } label: {
                        Label("Play", systemImage: "play.fill").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(D8.lapis)
                }
                Text("Subtitles in \(shown.map(langName).joined(separator: ", "))").font(.subheadline).foregroundStyle(Palette.ink)
                Text("Subtitles: machine translation of the English original.").font(.footnote).foregroundStyle(Palette.muted)
                FilmCredit(film: film)
            }
            .padding()
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .paper()
        .navigationTitle(film.title(shown[0]))
        .inlineTitle()
        .filmCover(item: $playback) { start in
            if let video = film.video { FilmPlayer(film: film, video: video, langs: shown, start: start.at) }
        }
        #if DEBUG
        .task {
            guard let at = Launch.value("-playFilmAt").flatMap(Double.init) else { return }
            playback = FilmStart(at: at)
        }
        #endif
    }
}

struct FilmStart: Identifiable {
    let at: Double
    let id = UUID()
}

extension View {
    @ViewBuilder func filmCover<Cover: View>(item: Binding<FilmStart?>, @ViewBuilder content: @escaping (FilmStart) -> Cover) -> some View {
        #if os(iOS)
        fullScreenCover(item: item, content: content)
        #else
        sheet(item: item) { content($0).frame(minWidth: 720, minHeight: 600) }
        #endif
    }
}

@MainActor
@Observable
final class FilmClock {
    let player = AVPlayer()
    let url: URL
    var time: Double = 0
    var failed = false
    @ObservationIgnored private var seeking = false
    @ObservationIgnored private var token: Any?
    @ObservationIgnored private var statusWatch: NSKeyValueObservation?

    init(url: URL, start: Double) {
        self.url = url
        time = start
        load(at: start)
        token = player.addPeriodicTimeObserver(forInterval: CMTime(value: 1, timescale: 10), queue: .main) { [weak self] t in
            MainActor.assumeIsolated {
                guard let self, !self.seeking, t.isNumeric else { return }
                self.time = t.seconds
            }
        }
    }

    func load(at start: Double) {
        let item = AVPlayerItem(url: url)
        failed = false
        statusWatch = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
            let bad = item.status == .failed
            Task { @MainActor in if bad { self?.failed = true } }
        }
        player.replaceCurrentItem(with: item)
        seeking = start > 0
        if seeking {
            player.seek(to: CMTime(seconds: start, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                Task { @MainActor in self?.seeking = false }
            }
        }
    }

    func retry() {
        load(at: time)
        player.play()
    }

    func stop() {
        player.pause()
        if let token { player.removeTimeObserver(token) }
        token = nil
        statusWatch = nil
    }
}

struct FilmPlayer: View {
    let film: WatchFilm
    let video: URL
    let langs: [String]
    var start: Double = 0
    @Environment(\.dismiss) private var dismiss
    @State private var clock: FilmClock?
    @State private var store = FilmStore.shared

    var body: some View {
        GeometryReader { geo in
            let wide = geo.size.width > geo.size.height * 1.2
            let layout = wide ? AnyLayout(HStackLayout(alignment: .top, spacing: 0)) : AnyLayout(VStackLayout(spacing: 0))
            layout {
                if !wide { bar }
                VideoPlayer(player: clock?.player)
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .overlay { if clock?.failed == true { failure } }
                    .frame(maxWidth: wide ? geo.size.width * 0.6 : .infinity)
                VStack(spacing: 0) {
                    if wide { bar }
                    FilmCues(film: film, langs: langs, time: clock?.time ?? start, cues: store.cues)
                        .simultaneousGesture(TapGesture().onEnded { clock?.player.pause() })
                }
            }
        }
        .background(Color.black.ignoresSafeArea())
        .environment(\.colorScheme, .dark)
        .wordTaps(reveal: true)
        .task {
            if clock == nil {
                clock = FilmClock(url: video, start: start)
                #if DEBUG
                if !Launch.flag("-filmHold") { clock?.player.play() }
                #else
                clock?.player.play()
                #endif
            }
            await withTaskGroup(of: Void.self) { group in
                for lang in langs { group.addTask { await store.cues(film, lang) } }
            }
        }
        .onDisappear { clock?.stop() }
    }

    var failure: some View {
        VStack(spacing: 12) {
            Text("This film did not play. Check the connection and try again.")
                .font(.subheadline)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 12) {
                Button("Retry") { clock?.retry() }.buttonStyle(.borderedProminent).tint(D8.lapis)
                Button("Close") { dismiss() }.buttonStyle(.bordered).tint(.white)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    var bar: some View {
        HStack(spacing: 10) {
            Button { dismiss() } label: {
                Image(systemName: "xmark").font(.headline).frame(width: 44, height: 44)
            }
            .accessibilityLabel(Text("Done"))
            Text(film.title(langs[0])).font(.headline).foregroundStyle(.white).lineLimit(1)
            Spacer(minLength: 0)
        }
        .tint(.white)
        .padding(.horizontal, 8)
    }
}

struct FilmCues: View {
    let film: WatchFilm
    let langs: [String]
    let time: Double
    let cues: [String: [WatchCue]]

    func line(_ lang: String) -> String {
        let all = cues[FilmStore.key(film, lang)] ?? []
        return VTT.cue(at: time, in: all)?.text.replacingOccurrences(of: "\n", with: " ") ?? ""
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(langs, id: \.self) { lang in
                    let text = line(lang)
                    HStack(alignment: .top, spacing: 10) {
                        FlagTile(lang: lang, size: 22)
                        Text(tapText(text, lang, color: .white))
                            .font(.system(size: 19, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, minHeight: 24, alignment: .leading)
                            .opacity(text.isEmpty ? 0 : 1)
                    }
                    .environment(\.layoutDirection, Lang.isRTL(lang) ? .rightToLeft : .leftToRight)
                }
                Text("Tap a word to look it up. Pause first to read it.").font(.caption).foregroundStyle(.white.opacity(0.6))
                FilmCredit(film: film).tint(.white)
            }
            .padding(16)
        }
    }
}
