import AVFoundation
import BucketKit
import MapKit
import SwiftUI

enum SavedCard {
    static let key = "polingual.familyCard"
    static let langs = ["en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi", "ru", "nl", "pl", "tr", "vi", "he", "el", "sv", "id"]

    static func load(_ defaults: UserDefaults = .standard) -> FamilyCard? {
        defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(FamilyCard.self, from: $0) }
    }

    static func save(_ card: FamilyCard, _ defaults: UserDefaults = .standard) {
        defaults.set(try? JSONEncoder().encode(card), forKey: key)
    }
}

struct PlayerCardSheet: View {
    enum Step { case who, speak, learn, check }
    @Environment(\.dismiss) private var dismiss
    @State private var step = Step.who
    @State private var card: FamilyCard
    let done: (FamilyCard) -> Void

    init(start: FamilyCard, done: @escaping (FamilyCard) -> Void) {
        _card = State(initialValue: start)
        self.done = done
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PL.Space.s4) {
                    switch step {
                    case .who: who
                    case .speak: speak
                    case .learn: learn
                    case .check: check
                    }
                }
                .padding(PL.Space.s4)
            }
            .paper()
            .navigationTitle("Player card")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
    }

    func header(_ n: Int, _ title: LocalizedStringKey) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s1) {
            Text("Step \(n) of 4").font(PL.label.font()).foregroundStyle(PL.inkDim)
            Text(title).font(PL.heading.font()).foregroundStyle(PL.ink)
        }
    }

    func tap(_ on: Bool, _ label: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Text(label).frame(maxWidth: .infinity) }
            .buttonStyle(.pl(on ? .success : .ghost, size: .sm))
            .accessibilityAddTraits(on ? .isSelected : [])
            .accessibilityIdentifier(id)
    }

    var grid: [GridItem] { [GridItem(.adaptive(minimum: 120), spacing: PL.Space.s2)] }

    var who: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            header(1, "Who is playing?")
            LazyVGrid(columns: grid, spacing: PL.Space.s2) {
                ForEach(SeatBand.allCases) { b in tap(card.band == b, b.label, id: "band-\(b.rawValue)") { card.band = b } }
            }
            TextField("Nickname", text: $card.nickname).lobbyField().accessibilityIdentifier("cardNickname")
            if card.band == .under13 {
                Text("Kids play with a fun name. Only the age band leaves this phone, and nothing about this seat is kept after the room closes.")
                    .font(PL.small.font()).foregroundStyle(PL.inkDim)
            }
            Button("Next") { step = .speak }.buttonStyle(.pl(.primary, size: .lg)).disabled(card.nickname.count < 2).accessibilityIdentifier("cardNext")
        }
    }

    var speak: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            header(2, "I speak")
            LazyVGrid(columns: grid, spacing: PL.Space.s2) {
                ForEach(SavedCard.langs, id: \.self) { l in tap(card.speaks(l), langName(l), id: "speak-\(l)") { card.toggleSpeak(l) } }
            }
            ForEach(card.speaks) { s in
                VStack(alignment: .leading, spacing: PL.Space.s2) {
                    Text(langName(s.lang)).font(PL.body.font()).foregroundStyle(PL.ink)
                    HStack(spacing: PL.Space.s2) {
                        ForEach(FamilyCard.levels, id: \.level) { lv in
                            tap(s.level == lv.level, "\(lv.face) \(lv.label)", id: "level-\(s.lang)-\(lv.level)") { card.setLevel(s.lang, lv.level) }
                        }
                    }
                }
            }
            nav(back: .who, next: .learn, ok: !card.speaks.isEmpty)
        }
    }

    var learn: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            header(3, "I want to learn")
            Text("Pick up to three.").font(PL.small.font()).foregroundStyle(PL.inkDim)
            LazyVGrid(columns: grid, spacing: PL.Space.s2) {
                ForEach(SavedCard.langs.filter { !card.speaks($0) }, id: \.self) { l in tap(card.learn.contains(l), langName(l), id: "learn-\(l)") { card.toggleLearn(l) } }
            }
            tap(card.surprise, String(localized: "Surprise me"), id: "learn-surprise") { card.setSurprise(!card.surprise) }
            nav(back: .speak, next: .check, ok: card.surprise || !card.learn.isEmpty)
        }
    }

    var check: some View {
        VStack(alignment: .leading, spacing: PL.Space.s4) {
            header(4, "Your card")
            PLCard {
                VStack(alignment: .leading, spacing: PL.Space.s2) {
                    Text(card.nickname).font(PL.heading.font()).foregroundStyle(PL.ink)
                    Text(card.band.label).font(PL.small.font()).foregroundStyle(PL.inkDim)
                    Text("Speaks \(card.speaks.map { langName($0.lang) }.joined(separator: ", "))").font(PL.body.font()).foregroundStyle(PL.ink)
                    Text(card.surprise ? String(localized: "Learning a surprise") : String(localized: "Learning \(card.learn.map(langName).joined(separator: ", "))")).font(PL.body.font()).foregroundStyle(PL.ink)
                }
            }
            Button("Take my seat") {
                SavedCard.save(card)
                done(card)
                dismiss()
            }
            .buttonStyle(.pl(.primary, size: .lg))
            .disabled(!card.ready)
            .accessibilityIdentifier("cardDone")
            Button("Back") { step = .learn }.buttonStyle(.pl(.ghost, size: .md))
        }
    }

    func nav(back: Step, next: Step, ok: Bool) -> some View {
        HStack(spacing: PL.Space.s3) {
            Button("Back") { step = back }.buttonStyle(.pl(.ghost, size: .md))
            Button("Next") { step = next }.buttonStyle(.pl(.primary, size: .md)).disabled(!ok).accessibilityIdentifier("cardNext")
        }
    }
}

struct WaitingControls: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    let act: (@escaping () async throws -> Void) -> Void
    @Binding var editCard: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            if let me = lobby.me {
                Button(me.ready ? "Not ready" : "I'm ready") { act { try await lobbies.setReady(!me.ready) } }
                    .buttonStyle(.pl(me.ready ? .ghost : .success, size: .lg))
                    .accessibilityIdentifier("lobbyReady")
                Button("My player card") { editCard = true }.buttonStyle(.pl(.quiet, size: .sm)).accessibilityIdentifier("lobbyCard")
            }
            if lobby.isHost { host } else {
                Text(lobby.allReady ? "Waiting for \(lobby.hostName ?? String(localized: "the host")) to start." : "The game starts when everyone is ready.")
                    .font(PL.small.font()).foregroundStyle(PL.inkDim)
            }
        }
    }

    @ViewBuilder
    var host: some View {
        Button("Start game") { act { try await lobbies.start() } }
            .buttonStyle(.pl(.primary, size: .lg))
            .disabled(!lobby.canStart)
            .accessibilityIdentifier("lobbyStart")
        if !lobby.canStart {
            let names = lobby.waitingOn.map(\.name)
            Text(names.isEmpty ? String(localized: "Two players start a game. Share the code.") : String(localized: "Waiting on \(names.joined(separator: ", "))."))
                .font(PL.small.font()).foregroundStyle(PL.inkDim)
        }
        if lobby.me == nil { Text("You host from this phone without a seat.").font(PL.small.font()).foregroundStyle(PL.inkDim) }
        HStack(spacing: PL.Space.s2) {
            if lobby.nightRound == nil, !lobby.game.isRace {
                Button("Family night") { act { try await lobbies.familyNight() } }.buttonStyle(.pl(.accent, size: .sm)).accessibilityIdentifier("lobbyFamilyNight")
            } else if lobby.nightRound != nil {
                Button("One game") { act { try await lobbies.settings(setup: .single, game: .daily) } }.buttonStyle(.pl(.ghost, size: .sm))
            }
            if lobby.botsEnabled == true, lobby.botFill != true, !lobby.game.isRace {
                Button("Add bots") { act { try await lobbies.fillBots() } }.buttonStyle(.pl(.ghost, size: .sm)).accessibilityIdentifier("lobbyBots")
            }
        }
        if let watch = lobby.guestsWatch {
            Toggle("Guests can watch", isOn: Binding(get: { watch }, set: { on in act { try await lobbies.guestsWatch(on) } }))
                .font(PL.body.font()).tint(PL.malachite)
        }
        if lobby.canEnd == true {
            Button("Close lobby", role: .destructive) { act { try await lobbies.closeLobby() } }.buttonStyle(.pl(.quiet, size: .sm)).accessibilityIdentifier("lobbyClose")
        }
    }
}

struct ResultsPanel: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    let leave: () -> Void
    let act: (@escaping () async throws -> Void) -> Void

    var body: some View {
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s3) {
                if lobby.isClosed {
                    Text("The host closed this lobby.").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                } else if let left = lobby.nextGameRemaining(at: lobbies.now) {
                    if let night = lobby.nightRound, !night.final {
                        Text("Round \(night.index + 2) of \(night.total) in \(left)s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(PL.ink)
                    } else {
                        Text("Next game in \(left)s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(PL.ink).accessibilityIdentifier("lobbyNextIn")
                    }
                    Text("Everyone stays in. No need to ready up again.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                }
                HStack(spacing: PL.Space.s2) {
                    if lobby.isHost, !lobby.isClosed {
                        Button("Next game") { act { try await lobbies.nextGame() } }.buttonStyle(.pl(.primary, size: .md)).accessibilityIdentifier("lobbyNext")
                    }
                    Button("Leave", action: leave).buttonStyle(.pl(.ghost, size: .md)).accessibilityIdentifier("lobbyLeave")
                }
                if lobby.isHost, lobby.canEnd == true, !lobby.isClosed {
                    Button("Close lobby", role: .destructive) { act { try await lobbies.closeLobby() } }.buttonStyle(.pl(.quiet, size: .sm)).accessibilityIdentifier("lobbyClose")
                }
                if lobby.isHost, lobby.me == nil, lobby.players.count > 0 {
                    Text("Leaving hands the lobby to the next player.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                }
                LeagueCard(lobby: lobby)
            }
        }
    }
}

struct LeagueCard: View {
    @Environment(LobbyStore.self) private var lobbies
    @Environment(Account.self) private var account
    let lobby: Lobby
    @State private var board: LeagueBoard?
    @State private var added: Int?
    @State private var refused = false

    var eligible: Bool { LeagueBoard.eligible(SavedCard.load()?.band, signedIn: account.stage == .signedIn) && lobby.seated }

    var body: some View {
        if eligible {
            VStack(alignment: .leading, spacing: PL.Space.s2) {
                if let board {
                    Text("\(board.tierName) league, week \(board.week)").font(PL.label.font()).foregroundStyle(PL.inkDim)
                    ForEach(board.nearMe(), id: \.rank) { r in
                        HStack {
                            Text("\(r.rank)").monospacedDigit().frame(width: 28)
                            Text(r.name).fontWeight(r.me ? .bold : .regular)
                            Spacer()
                            Text("\(r.points)").monospacedDigit()
                        }
                        .font(PL.body.font())
                        .foregroundStyle(r.me ? PL.lapis : PL.ink)
                    }
                    if let added, added > 0 { Text("+\(added) league points").font(PL.small.font()).foregroundStyle(PL.malachite) }
                } else if refused {
                    Text("The league did not load.").font(PL.small.font()).foregroundStyle(PL.inkDim)
                }
            }
            .accessibilityIdentifier("leagueCard")
            .task(id: lobby.startedAt) { await load() }
        }
    }

    func load() async {
        let id = lobby.id
        added = try? await lobbies.withToken { api, t in try await api.claimLeague(token: t, lobbyId: id) }
        do { board = try await lobbies.withToken { api, t in try await api.league(token: t) } } catch { refused = true }
    }
}

struct NightInterludeView: View {
    let lobby: Lobby
    let interlude: FamilyInterlude

    var body: some View {
        switch interlude {
        case .voiceAtlas(let clip, let endsAt): AtlasInterlude(lobby: lobby, clip: clip, endsAt: endsAt)
        case .forehead(let card, let endsAt): ForeheadInterlude(lobby: lobby, card: card, endsAt: endsAt)
        case .familyTeach: TeachRound(lobby: lobby)
        case .ourTrivia: TriviaRound(lobby: lobby)
        }
    }
}

struct Countdown: View {
    @Environment(LobbyStore.self) private var lobbies
    let title: String
    let endsAt: Date

    var body: some View {
        HStack {
            Text(title).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
            Spacer()
            Text("\(max(0, Int(endsAt.timeIntervalSince(lobbies.now).rounded(.up))))s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(PL.vermilion)
        }
    }
}

struct AtlasInterlude: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    let clip: Int
    let endsAt: Date
    @State private var clips: [AtlasClip] = []
    @State private var pin: CLLocationCoordinate2D?
    @State private var result: [Int: String] = [:]
    @State private var loadProblem: String?

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            Countdown(title: String(localized: "Voice Atlas, clip \(clip + 1) of \(FamilyNight.atlasClips)"), endsAt: endsAt)
            Text("Listen to the TV. Tap the map where you think this voice comes from.").font(PL.body.font()).foregroundStyle(PL.ink)
            if let c = clips.first(where: { $0.clip == clip - 1 }), let lang = c.lang {
                Text("Last clip: \(c.form) was \(langName(lang))\(c.meaning.map { ", \($0)" } ?? "").").font(PL.small.font()).foregroundStyle(PL.inkDim)
            }
            MapReader { proxy in
                Map {
                    if let pin { Marker("", coordinate: pin).tint(PL.vermilion) }
                }
                .mapStyle(.standard(elevation: .flat))
                .onTapGesture { p in if result[clip] == nil { pin = proxy.convert(p, from: .local) } }
            }
            .frame(minHeight: 260)
            .clipShape(.rect(cornerRadius: PL.Radius.md))
            .accessibilityIdentifier("atlasMap")
            if let loadProblem { Text(loadProblem).font(PL.small.font()).foregroundStyle(PL.vermilion) }
            if let r = result[clip] {
                Text(r).font(PL.body.font()).foregroundStyle(PL.malachite).accessibilityIdentifier("atlasResult")
            } else {
                Button("Lock in my guess") { guess() }.buttonStyle(.pl(.primary, size: .md)).disabled(pin == nil || !lobby.seated).accessibilityIdentifier("atlasGuess")
            }
        }
        .task(id: clip) {
            pin = nil
            let id = lobby.id
            do throws(BucketError) {
                clips = try await lobbies.withToken { api, t in try await api.atlasClips(token: t, lobbyId: id) }
            } catch {
                if LobbyRules.pollProblem(error) { loadProblem = String(localized: "Voice Atlas did not load: \(lobbyProblem(error))") }
            }
        }
    }

    func guess() {
        guard let pin else { return }
        let id = lobby.id, n = clip
        Task {
            do {
                let r = try await lobbies.withToken { api, t in try await api.atlasGuess(token: t, lobbyId: id, clip: n, lat: pin.latitude, lon: pin.longitude) }
                result[n] = String(localized: "\(r.km) km away. +\(r.points)")
            } catch {
                result[n] = String(localized: "Too late for that clip.")
            }
        }
    }
}

struct ForeheadInterlude: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    let card: Int
    let endsAt: Date
    @State private var deck: [ForeheadWord] = []
    @State private var marked: [Int: String] = [:]

    var holder: LobbyPlayer? { lobby.foreheadHolder(card) }
    var holding: Bool { holder != nil && holder?.userId == lobby.me?.userId }

    var body: some View {
        VStack(spacing: PL.Space.s4) {
            Countdown(title: String(localized: "Forehead, card \(card + 1)"), endsAt: endsAt)
            if holding, !deck.isEmpty {
                let w = deck[card % deck.count]
                Text(w.form).font(PL.wordFont(56)).minimumScaleFactor(0.3).lineLimit(2).foregroundStyle(PL.ink)
                    .frame(maxWidth: .infinity, minHeight: 220).background(PL.card, in: .rect(cornerRadius: PL.Radius.lg))
                    .accessibilityIdentifier("foreheadCard")
                Text("Hold your phone on your forehead. The room gives you clues.").font(PL.small.font()).foregroundStyle(PL.inkDim)
            } else {
                Text(holder.map { String(localized: "\($0.name) holds the phone up. Give clues in any language!") } ?? String(localized: "Waiting for players"))
                    .font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink).multilineTextAlignment(.center)
            }
            if lobby.isHost, !holding {
                HStack(spacing: PL.Space.s2) {
                    Button("Got it") { mark(true) }.buttonStyle(.pl(.success, size: .lg)).accessibilityIdentifier("foreheadGot")
                    Button("Skip") { mark(false) }.buttonStyle(.pl(.ghost, size: .lg))
                }
                .disabled(marked[card] != nil)
            }
            if let m = marked[card] { Text(m).font(PL.body.font()).foregroundStyle(PL.inkDim) }
        }
        .task(id: lobby.startedAt) {
            deck = await lobbies.foreheadDeck(lobby)
        }
    }

    func mark(_ got: Bool) {
        let id = lobby.id, n = card, name = holder?.name ?? String(localized: "They")
        Task {
            do {
                try await lobbies.withToken { api, t in try await api.foreheadMark(token: t, lobbyId: id, card: n, got: got) }
                marked[n] = got ? String(localized: "\(name) got it! +100") : String(localized: "Skipped")
            } catch {
                marked[n] = String(localized: "Too late for that card.")
            }
        }
    }
}

@MainActor
@Observable
final class ClipRecorder {
    var recording = false
    var clip: String?
    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private let url = FileManager.default.temporaryDirectory.appending(path: "family-teach.m4a")

    func start() async {
        #if os(iOS)
        guard await AVAudioApplication.requestRecordPermission() else { return }
        try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        let settings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 22_050, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 32_000]
        recorder = try? AVAudioRecorder(url: url, settings: settings)
        recording = recorder?.record(forDuration: 8) ?? false
    }

    func stop() {
        recorder?.stop()
        recording = false
        guard let data = try? Data(contentsOf: url), !data.isEmpty else { return }
        let encoded = "data:audio/mp4;base64,\(data.base64EncodedString())"
        clip = encoded.count <= 280_000 ? encoded : nil
    }

    func play(_ dataURL: String) {
        guard let comma = dataURL.firstIndex(of: ","), let data = Data(base64Encoded: String(dataURL[dataURL.index(after: comma)...])) else { return }
        player = try? AVAudioPlayer(data: data)
        player?.play()
    }
}

struct TeachRound: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    @State private var view: TeachView?
    @State private var problem: String?
    @State private var choices = ["", "", ""]
    @State private var answer = 0
    @State private var recorder = ClipRecorder()

    static let errors: [String: String] = [
        "no_card": String(localized: "Fill your player card first. Seats under 13 do not record."),
        "not_adult": String(localized: "Recording is for adults. Pass the phone to a grown-up."),
        "not_home_language": String(localized: "Pick a language you marked as a home language."),
        "not_approved": String(localized: "The host approves the speaker on the TV first."),
        "not_adult_account": String(localized: "This account is not set as 18 and over, so it cannot record."),
        "age_unavailable": String(localized: "We could not check this account's age. Try again in a moment."),
        "not_allowed": String(localized: "That step is not open right now."),
    ]

    var speaker: LobbyPlayer? { view.flatMap { v in lobby.players.first { $0.userId == v.speakerId } } }
    var isSpeaker: Bool { view?.speakerId != nil && view?.speakerId == lobby.me?.userId }
    var homeLangs: [String] { (SavedCard.load()?.speaks ?? []).filter { $0.level == 4 }.map(\.lang) }

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            Text("Family Teach").font(PL.heading.font()).foregroundStyle(PL.ink)
            Text("A grown-up records a word in a home language. Everyone else guesses what it means.").font(PL.small.font()).foregroundStyle(PL.inkDim)
            content
            if let problem { Text(problem).font(PL.small.font()).foregroundStyle(PL.vermilion) }
        }
        .task {
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    @ViewBuilder
    var content: some View {
        let status = view?.status
        if lobby.isHost, status == nil || status == .done || status == .skipped || status == .reported {
            ForEach(lobby.players.filter { !$0.isBot }) { p in
                Button(String(localized: "Ask \(p.name) to teach")) { act(.ask, speakerId: p.userId, lang: nil) }.buttonStyle(.pl(.ghost, size: .sm))
            }
        }
        if let v = view {
            switch v.status {
            case .asked:
                Text("\(speaker?.name ?? "") is up.").font(PL.body.font()).foregroundStyle(PL.ink)
                if lobby.isHost { Button("Approve the speaker") { act(.approve) }.buttonStyle(.pl(.primary, size: .md)) }
            case .approved where isSpeaker: recordPanel
            case .approved: Text("\(speaker?.name ?? "") is recording.").font(PL.body.font()).foregroundStyle(PL.ink)
            case .ready:
                Text("The clip is ready.").font(PL.body.font()).foregroundStyle(PL.ink)
                if lobby.isHost { Button("Play it for the room") { act(.play) }.buttonStyle(.pl(.primary, size: .md)) }
            case .open:
                if let clip = v.clip { Button("Play the clip") { recorder.play(clip) }.buttonStyle(.pl(.accent, size: .md)) }
                if !isSpeaker {
                    ForEach(Array(v.choices.enumerated()), id: \.offset) { i, c in
                        Button(c) { act(.guess, guess: i) }.buttonStyle(.pl(v.myGuess == i ? .success : .ghost, size: .md)).disabled(v.myGuess != nil)
                    }
                }
                Text("\(v.guessed) guessed").font(PL.small.font()).foregroundStyle(PL.inkDim)
                if lobby.isHost { Button("Reveal") { act(.reveal) }.buttonStyle(.pl(.primary, size: .md)) }
            case .done:
                if let a = v.answer, v.choices.indices.contains(a) { Text("It meant \(v.choices[a]).").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink) }
                if v.teacherAward == true { Text("\(speaker?.name ?? "") earns the teacher award.").font(PL.body.font()).foregroundStyle(PL.malachite) }
            default: EmptyView()
            }
            if lobby.isHost, [.asked, .approved, .ready, .open].contains(v.status) {
                Button("Skip") { act(.skip) }.buttonStyle(.pl(.quiet, size: .sm))
            }
        }
    }

    var recordPanel: some View {
        VStack(alignment: .leading, spacing: PL.Space.s2) {
            Text("Say one word, then write what it means and two wrong answers.").font(PL.body.font()).foregroundStyle(PL.ink)
            Button(recorder.recording ? "Stop" : (recorder.clip == nil ? "Record" : "Record again")) {
                if recorder.recording { recorder.stop() } else { Task { await recorder.start() } }
            }
            .buttonStyle(.pl(recorder.recording ? .primary : .accent, size: .md))
            .accessibilityIdentifier("teachRecord")
            ForEach(choices.indices, id: \.self) { i in
                HStack {
                    TextField(i == answer ? "What it means" : "A wrong answer", text: $choices[i]).lobbyField()
                    Button { answer = i } label: { Image(systemName: i == answer ? "checkmark.circle.fill" : "circle") }
                        .accessibilityLabel(Text("Mark as the right answer"))
                }
            }
            Button("Send to the room") {
                act(.record, lang: homeLangs.first, clip: recorder.clip, choices: choices.map { $0.trimmingCharacters(in: .whitespaces) }, answer: answer)
            }
            .buttonStyle(.pl(.primary, size: .md))
            .disabled(recorder.clip == nil || choices.contains { $0.trimmingCharacters(in: .whitespaces).isEmpty } || homeLangs.isEmpty)
        }
    }

    func load() async {
        let id = lobby.id
        do throws(BucketError) {
            view = try await lobbies.withToken { api, t in try await api.teach(token: t, lobbyId: id) }
        } catch {
            if LobbyRules.pollProblem(error) { problem = String(localized: "Family Teach did not load: \(lobbyProblem(error))") }
        }
    }

    func act(_ a: TeachAction, speakerId: String? = nil, lang: String? = nil, clip: String? = nil, choices: [String]? = nil, answer: Int? = nil, guess: Int? = nil) {
        let id = lobby.id
        problem = nil
        Task {
            do {
                try await lobbies.withToken { api, t in try await api.teachAct(token: t, lobbyId: id, action: a, speakerId: speakerId, lang: lang, clip: clip, choices: choices, answer: answer, guess: guess) }
                await load()
            } catch {
                if case .server(_, let code?) = error { problem = Self.errors[code] ?? String(localized: "That did not save. Try again.") } else { problem = String(localized: "That did not save. Try again.") }
            }
        }
    }
}

struct TriviaRound: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    @State private var view: TriviaView?
    @State private var draft = [TriviaQuestion()]
    @State private var problem: String?

    var body: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            Text("Our Trivia").font(PL.heading.font()).foregroundStyle(PL.ink)
            if let v = view, v.current >= 0 || !lobby.isHost { play(v) } else if lobby.isHost { editor } else {
                Text("The host is writing questions about your family.").font(PL.body.font()).foregroundStyle(PL.inkDim)
            }
            if let problem { Text(problem).font(PL.small.font()).foregroundStyle(PL.vermilion) }
        }
        .task {
            while !Task.isCancelled {
                let id = lobby.id
                do throws(BucketError) {
                    view = try await lobbies.withToken { api, t in try await api.trivia(token: t, lobbyId: id) }
                } catch {
                    if LobbyRules.pollProblem(error) { problem = String(localized: "Our Trivia did not load: \(lobbyProblem(error))") }
                }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    var editor: some View {
        VStack(alignment: .leading, spacing: PL.Space.s3) {
            Text("Write questions only your family can answer.").font(PL.small.font()).foregroundStyle(PL.inkDim)
            ForEach(draft.indices, id: \.self) { q in
                PLCard {
                    VStack(alignment: .leading, spacing: PL.Space.s2) {
                        TextField("Question", text: $draft[q].prompt).lobbyField()
                        ForEach(draft[q].choices.indices, id: \.self) { c in
                            HStack {
                                TextField("Answer \(c + 1)", text: $draft[q].choices[c]).lobbyField()
                                Button { draft[q].answer = c } label: { Image(systemName: draft[q].answer == c ? "checkmark.circle.fill" : "circle") }
                                    .accessibilityLabel(Text("Mark as the right answer"))
                            }
                        }
                        if draft[q].choices.count < 4 { Button("Add an answer") { draft[q].choices.append("") }.buttonStyle(.pl(.quiet, size: .sm)) }
                    }
                }
            }
            HStack(spacing: PL.Space.s2) {
                if draft.count < 10 { Button("Add a question") { draft.append(TriviaQuestion()) }.buttonStyle(.pl(.ghost, size: .sm)) }
                Button("Save and start") { save() }.buttonStyle(.pl(.primary, size: .md)).disabled(!draft.allSatisfy(\.valid))
            }
        }
    }

    @ViewBuilder
    func play(_ v: TriviaView) -> some View {
        if let prompt = v.prompt {
            Text("Question \(v.current + 1) of \(v.count)").font(PL.label.font()).foregroundStyle(PL.inkDim)
            Text(prompt).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
            ForEach(Array(v.choices.enumerated()), id: \.offset) { i, c in
                let tone: PLButtonVariant = v.answer == i ? .success : (v.myPick == i ? .accent : .ghost)
                Button(c) { act(.answer, index: v.current, pick: i) }.buttonStyle(.pl(tone, size: .md)).disabled(lobby.isHost || v.myPick != nil || !v.open)
            }
            Text("\(v.picked) answered").font(PL.small.font()).foregroundStyle(PL.inkDim)
        } else {
            Text("Questions are ready.").font(PL.body.font()).foregroundStyle(PL.inkDim)
        }
        if lobby.isHost {
            if v.open { Button("Reveal") { act(.reveal) }.buttonStyle(.pl(.primary, size: .md)) }
            else if v.current + 1 < v.count { Button("Next question") { act(.open, index: v.current + 1) }.buttonStyle(.pl(.primary, size: .md)) }
        }
    }

    func save() {
        let qs = draft.map { TriviaQuestion(prompt: $0.prompt.trimmingCharacters(in: .whitespaces), choices: $0.choices.map { $0.trimmingCharacters(in: .whitespaces) }, answer: $0.answer) }
        let id = lobby.id
        Task {
            do {
                try await lobbies.withToken { api, t in try await api.triviaAct(token: t, lobbyId: id, action: .save, questions: qs) }
                try await lobbies.withToken { api, t in try await api.triviaAct(token: t, lobbyId: id, action: .open, index: 0) }
            } catch { problem = String(localized: "Those questions did not save. Keep them short and kind.") }
        }
    }

    func act(_ a: TriviaAction, index: Int? = nil, pick: Int? = nil) {
        let id = lobby.id
        Task {
            do { try await lobbies.withToken { api, t in try await api.triviaAct(token: t, lobbyId: id, action: a, index: index, pick: pick) } } catch { problem = String(localized: "That step is not open right now.") }
        }
    }
}

struct AudienceView: View {
    @Environment(LobbyStore.self) private var lobbies
    let lobby: Lobby
    let phase: LobbyPhase
    @State private var voted: [Int: String] = [:]
    @State private var problem: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PL.Space.s4) {
                Text("You are watching").font(PL.label.font()).foregroundStyle(PL.inkDim).accessibilityIdentifier("audienceView")
                if let night = lobby.nightRound { Text("\(night.label), round \(night.index + 1) of \(night.total)").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink) }
                round
                PLCard {
                    VStack(alignment: .leading, spacing: PL.Space.s2) {
                        ForEach(Array(lobby.standings.enumerated()), id: \.element.id) { n, p in
                            HStack {
                                Text("\(n + 1)").monospacedDigit().frame(width: 28)
                                Text(p.name)
                                Spacer()
                                Text("\(p.score)").monospacedDigit()
                            }
                            .font(PL.body.font()).foregroundStyle(PL.ink)
                        }
                    }
                }
                HStack {
                    ForEach(LobbyReaction.all, id: \.self) { e in
                        Button(e) { Task { await lobbies.react(e) } }.font(.title2).frame(maxWidth: .infinity)
                    }
                }
                if let problem { Text(problem).font(PL.small.font()).foregroundStyle(PL.vermilion) }
            }
            .padding(PL.Space.s4)
        }
    }

    @ViewBuilder
    var round: some View {
        switch phase {
        case .round(let i, let remaining), .reveal(let i, let remaining):
            if let p = lobby.prompt(i) {
                PLCard {
                    VStack(alignment: .leading, spacing: PL.Space.s2) {
                        HStack {
                            Text("Round \(i + 1) of \(lobby.rounds)").font(PL.label.font()).foregroundStyle(PL.inkDim)
                            Spacer()
                            Text("\(Int(remaining.rounded(.up)))s").monospacedDigit().foregroundStyle(PL.vermilion)
                        }
                        Text(p.gloss).font(PL.wordFont(28)).foregroundStyle(PL.ink)
                        if lobby.bonusQuestion(i) { vote(p, i) }
                    }
                }
            }
        case .finished:
            Text("Game over. The next one starts soon.").font(PL.body.font()).foregroundStyle(PL.inkDim)
        default:
            Text("Waiting for the game to start.").font(PL.body.font()).foregroundStyle(PL.inkDim)
        }
    }

    func vote(_ p: LobbyPrompt, _ i: Int) -> some View {
        VStack(alignment: .leading, spacing: PL.Space.s2) {
            Text("Bonus question. Vote with the room.").font(PL.label.font()).foregroundStyle(PL.ochre)
            let tally = lobby.bonusTally(i)
            ForEach(p.choices, id: \.self) { c in
                let votes = tally?.choices.first { $0.choice == c }?.votes ?? 0
                Button {
                    Task {
                        do throws(BucketError) {
                            try await lobbies.vote(c, round: i)
                            voted[i] = c
                        } catch {
                            problem = String(localized: "Your vote did not count. One vote each.")
                        }
                    }
                } label: {
                    HStack {
                        Text(p.label(c).word ?? c)
                        Spacer()
                        if tally != nil { Text("\(votes)").monospacedDigit() }
                    }
                }
                .buttonStyle(.pl(voted[i] == c ? .success : .ghost, size: .sm))
                .disabled(voted[i] != nil)
                .accessibilityIdentifier("bonusVote")
            }
        }
    }
}
