import BucketKit
import SwiftUI

extension LobbyGame {
    var title: String {
        switch self {
        case .daily: String(localized: "Daily Set")
        case .sameWord: String(localized: "Same Word")
        case .flags: String(localized: "Flags")
        case .live: String(localized: "Live Mix")
        case .tiles: String(localized: "Tiles")
        case .duel: String(localized: "Flag Duel")
        case .spy: String(localized: "I Spy")
        case .other: String(localized: "Game")
        default: raceKind?.title ?? String(localized: "Game")
        }
    }

    var raceKind: GameKind? {
        switch self {
        case .mini: .mini
        case .wordGroups: .wordGroups
        case .match: .match
        case .voice: .voice
        case .letters: .letters
        case .polyword: .polyword
        case .flagTiles: .flagTiles
        case .babel: .babel
        case .shift: .shift
        case .snake: .snake
        case .atlas: .atlas
        case .forehead: .forehead
        case .ispy: .ispy
        case .flagDuel: .duel
        default: nil
        }
    }

    func fits(_ targets: [String]) -> Bool { self != .sameWord || targets.count >= 2 }
}

@MainActor
enum LobbyRace {
    static weak var store: LobbyStore?
    static let gate = LobbyRaceGate()

    static var seed: UInt64? {
        guard gate.isOpen, let lobby = store?.current, lobby.game.isRace, lobby.status == .playing else { return nil }
        return lobby.seedValue
    }

    static func begin(_ store: LobbyStore, hold: LobbyRaceGate.Hold) {
        self.store = store
        gate.open(hold)
    }

    static func finished(_ kind: GameKind, score: Int) {
        guard seed != nil, let store, store.current?.game.raceKind == kind else { return }
        Task { await store.postScore(score) }
    }

    static func dealSeed() -> String { seed.map(LobbyRaceSeed.deal) ?? DealSeeds.fresh() }
}

@MainActor
func playDayKey() -> String {
    LobbyRace.seed.map(LobbyRaceSeed.dayKey) ?? dayKey(Date().timeIntervalSince1970 * 1000)
}

@MainActor
func playDayNumber() -> Int {
    LobbyRace.seed.map(LobbyRaceSeed.dayNumber) ?? Polyword.dayNumber(localPolyDate())
}

struct RaceGameHost: View, Equatable {
    let kind: GameKind

    var body: some View { kind.screen }
}

struct LobbyRaceView: View {
    let lobby: Lobby
    let remaining: Double
    @Environment(LobbyStore.self) private var lobbies
    @State private var armed = false
    @State private var hold = LobbyRaceGate.Hold()

    var clock: String {
        let s = Int(remaining.rounded(.up))
        return "\(s / 60):" + (s % 60 < 10 ? "0" : "") + "\(s % 60)"
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            if armed, let kind = lobby.game.raceKind {
                RaceGameHost(kind: kind).equatable()
            } else {
                Spacer(minLength: 0)
            }
        }
        .onAppear {
            LobbyRace.begin(lobbies, hold: hold)
            armed = true
        }
    }

    var header: some View {
        VStack(spacing: 6) {
            HStack {
                Text(lobby.game.title).font(.headline).foregroundStyle(Palette.ink)
                Spacer()
                Text(clock).font(.headline.monospacedDigit()).foregroundStyle(remaining < 30 ? D8.vermilion : Palette.ink)
                    .accessibilityIdentifier("lobbyRaceClock")
            }
            ProgressView(value: min(max(0, remaining), lobby.playSeconds), total: max(1, lobby.playSeconds)).tint(PL.tyrian)
            HStack {
                Text("\(lobby.raceFinishers.count) of \(lobby.players.count) finished")
                Spacer()
                if let score = lobbies.raceScore {
                    Text("Your score: \(score)").accessibilityIdentifier("lobbyRaceScore")
                } else {
                    Text("Highest score wins")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(Palette.muted)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Palette.card)
    }
}

struct LobbiesTile: View {
    var body: some View {
        NavigationLink {
            LobbiesScreen()
        } label: {
            TileRow(symbol: "person.3.fill", title: String(localized: "Live Lobbies"), detail: String(localized: "Play the same round with friends, live."), color: D8.malachite)
                .padding(12)
                .background(Palette.card, in: .rect(cornerRadius: 18))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("lobbiesTile")
    }
}

struct StagedLobbyHook: ViewModifier {
    #if DEBUG
    @Environment(LobbyStore.self) private var lobbies
    @State private var open = false
    #endif

    func body(content: Content) -> some View {
        #if DEBUG
        content
            .navigationDestination(isPresented: $open) { LobbyRoom() }
            .task {
                guard !lobbies.staged, let players = Launch.value("-lobbyStage").flatMap(Int.init) else { return }
                lobbies.stage(players: players, mode: Launch.value("-lobbyStageMode").flatMap(LobbyPromptMode.init(rawValue:)) ?? .form)
                open = true
            }
        #else
        content
        #endif
    }
}

struct LobbiesScreen: View {
    @Environment(LobbyStore.self) private var lobbies
    @Environment(LangStore.self) private var langs
    @AppStorage("groups.displayName") private var displayName = ""
    @State private var code = ""
    @State private var problem: String?
    @State private var inRoom = false
    @State private var game = LobbyGame.daily

    var name: String { String(displayName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40)) }

    var body: some View {
        List {
            Section("You") {
                TextField("Name others see", text: $displayName).accessibilityIdentifier("lobbyName")
            }
            Section("Join by code") {
                HStack {
                    TextField("6 letter code", text: $code)
                        #if os(iOS)
                        .textInputAutocapitalization(.characters)
                        #endif
                        .autocorrectionDisabled()
                        .accessibilityIdentifier("lobbyCode")
                    Button("Join") { act { try await lobbies.join(code: code, displayName: name) } }
                        .disabled(name.isEmpty || code.count < 6 || lobbies.busy)
                }
            }
            Section("New lobby") {
                Picker("Game", selection: $game) {
                    ForEach(lobbies.hostable) { Text($0.title).tag($0) }
                }
                .accessibilityIdentifier("lobbyGame")
                ForEach(langs.systems.filter { game.fits($0.targets) }) { s in
                    Button {
                        act { try await lobbies.create(name: "\(name)'s lobby", game: game, root: s.root, targets: s.targets, displayName: name) }
                    } label: {
                        HStack(spacing: -6) {
                            ForEach(s.targets.prefix(5), id: \.self) { FlagTile(lang: $0, size: 30) }
                            Text(s.name).padding(.leading, 14).foregroundStyle(Palette.ink)
                        }
                    }
                    .disabled(name.isEmpty || lobbies.busy)
                }
                if langs.systems.isEmpty { Text("Start a language set in Learn first.").foregroundStyle(Palette.muted) }
            }
            Section("Open lobbies") {
                if lobbies.open.isEmpty { Text("No open lobbies right now. Start one and share the code.").foregroundStyle(Palette.muted) }
                ForEach(lobbies.open) { l in
                    Button { act { try await lobbies.join(l, displayName: name) } } label: {
                        HStack {
                            HStack(spacing: -6) { ForEach(l.targets.prefix(4), id: \.self) { FlagTile(lang: $0, size: 26) } }
                            VStack(alignment: .leading) {
                                Text(l.name).font(.headline).foregroundStyle(Palette.ink)
                                Text("\(l.game.title) · \(l.host) · \(l.players) of \(LobbyRules.cap)").font(.footnote).foregroundStyle(Palette.muted)
                            }
                            .padding(.leading, 10)
                            Spacer()
                            if l.isMember { Text("Rejoin").font(.caption.weight(.heavy)).foregroundStyle(D8.malachite) }
                        }
                    }
                    .disabled(name.isEmpty && !l.isMember)
                }
            }
            if let problem { Section { Text(problem).foregroundStyle(D8.vermilion) } }
            Section { AdPrivacyButton() }
        }
        .paper()
        .navigationTitle("Live Lobbies")
        .refreshable { await lobbies.refresh() }
        .task {
            await langs.load()
            while !Task.isCancelled {
                if !inRoom { await lobbies.refresh() }
                try? await Task.sleep(for: .seconds(5))
            }
        }
        .navigationDestination(isPresented: $inRoom) { LobbyRoom() }
        .safeAreaInset(edge: .bottom) { LobbyBanner() }
        .task(id: LobbyAds.shared.allowed) { LobbyAds.shared.start() }
    }

    func act(_ work: @escaping () async throws -> Lobby) {
        problem = nil
        Task {
            do {
                _ = try await work()
                code = ""
                inRoom = true
            } catch let e as BucketError {
                problem = lobbyProblem(e)
            } catch {
                problem = String(localized: "Something went wrong.")
            }
        }
    }
}

func lobbyProblem(_ e: BucketError) -> String {
    switch e {
    case .groupNotFound: String(localized: "No lobby with that code.")
    case .nameNotAllowed: String(localized: "Pick a different name.")
    case .textNotAllowed: String(localized: "That message can't be sent.")
    case .rateLimited: String(localized: "Slow down a moment.")
    case .server(409, "lobby_full"): String(localized: "That lobby is full.")
    case .server(409, "lobby_started"): String(localized: "That game already started.")
    case .server(409, "hosted_limit"): String(localized: "You host three lobbies already.")
    case .server(409, "need_ready"): String(localized: "Two players need to be ready.")
    case .revoked: String(localized: "Pick a name to play live.")
    default: e.localizedDescription
    }
}

struct LobbyRoom: View {
    @Environment(LobbyStore.self) private var lobbies
    @Environment(\.dismiss) private var dismiss
    @Environment(Account.self) private var account
    @State private var draft = ""
    @State private var problem: String?
    @State private var sawFinish = false
    @State private var tapped: [Int: Set<Int>] = [:]

    var body: some View {
        Group {
            if let lobby = lobbies.current {
                TimelineView(.periodic(from: .now, by: 0.25)) { _ in
                    content(lobby, LobbyClock.phase(lobby, at: lobbies.now))
                }
            } else {
                ContentUnavailableView("Lobby closed", systemImage: "door.left.hand.closed")
            }
        }
        .paper()
        .navigationTitle(lobbies.current?.name ?? "")
        .inlineTitle()
        .fullHeightSession()
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Leave") {
                    Task { await lobbies.leave() }
                    dismiss()
                }
            }
        }
        .task { await lobbies.follow() }
        .onDisappear { LobbyAds.shared.leftRoom(finishedGame: sawFinish) }
    }

    @ViewBuilder
    func content(_ l: Lobby, _ phase: LobbyPhase) -> some View {
        if l.game.isRace, phase.playing {
            LobbyRaceView(lobby: l, remaining: l.raceRemaining(at: lobbies.now))
        } else {
            rounds(l, phase)
        }
    }

    @ViewBuilder
    func rounds(_ l: Lobby, _ phase: LobbyPhase) -> some View {
        switch phase {
        case .waiting: waiting(l)
        case .countdown(let s):
            VStack(spacing: 12) {
                Text("Get ready").font(D8.word(26)).foregroundStyle(Palette.ink)
                Text("\(Int(s.rounded(.up)))").font(.system(size: 96, weight: .heavy, design: .rounded)).foregroundStyle(D8.vermilion)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .round(let i, let remaining): round(l, i, remaining)
        case .reveal(let i, let remaining): reveal(l, i, remaining)
        case .finished: board(l)
        }
    }

    func waiting(_ l: Lobby) -> some View {
        VStack(spacing: 0) {
            List {
                Section {
                    HStack {
                        Text("Code").foregroundStyle(Palette.muted)
                        Text(l.code).font(.system(.title2, design: .monospaced).weight(.heavy)).textSelection(.enabled)
                        Spacer()
                        ShareLink(item: String(localized: "Join my Polingual lobby with code \(l.code): https://polingual.com/play/\(l.code)")) { Image(systemName: "square.and.arrow.up") }
                    }
                    HStack(spacing: -6) { ForEach(l.targets, id: \.self) { FlagTile(lang: $0, size: 28) } }
                    if l.game.isRace {
                        Text("\(l.game.title), highest score in \(Int(l.playSeconds) / 60) minutes wins").font(.footnote).foregroundStyle(Palette.muted)
                    } else {
                        Text("\(l.game.title), \(l.rounds) rounds, \(l.roundSeconds) seconds each").font(.footnote).foregroundStyle(Palette.muted)
                    }
                }
                Section("Players") {
                    ForEach(l.players) { p in
                        HStack {
                            Circle().fill(p.online ? D8.malachite : Palette.rule).frame(width: 8, height: 8)
                            Text(p.name).foregroundStyle(Palette.ink)
                            if p.isHost { Image(systemName: "crown.fill").foregroundStyle(D8.vermilion).font(.caption) }
                            Spacer()
                            Text(p.ready ? "Ready" : "Waiting").font(.caption.weight(.heavy)).foregroundStyle(p.ready ? D8.malachite : Palette.muted)
                        }
                    }
                }
                Section {
                    if let me = l.me {
                        Button(me.ready ? "Not ready" : "I'm ready") { act { try await lobbies.setReady(!me.ready) } }
                            .accessibilityIdentifier("lobbyReady")
                    }
                    if l.isHost {
                        Button("Start game") { act { try await lobbies.start() } }
                            .disabled(!l.canStart)
                            .accessibilityIdentifier("lobbyStart")
                        if !l.canStart { Text("Two ready players start the game.").font(.footnote).foregroundStyle(Palette.muted) }
                    }
                    if let problem { Text(problem).foregroundStyle(D8.vermilion) }
                }
                Section("Chat") { chatLog(l) }
            }
            chatBar
        }
    }

    func chatLog(_ l: Lobby) -> some View {
        ForEach(l.messages.suffix(30)) { m in
            VStack(alignment: .leading, spacing: 2) {
                Text(m.name).font(.caption.weight(.heavy)).foregroundStyle(m.from == l.me?.userId ? D8.lapis : Palette.muted)
                Text(m.body).foregroundStyle(Palette.ink)
            }
        }
    }

    var chatBar: some View {
        HStack {
            TextField("Say something", text: $draft)
                .textFieldStyle(.roundedBorder)
                .onSubmit(sendChat)
                .accessibilityIdentifier("lobbyChat")
            Button(action: sendChat) { Image(systemName: "paperplane.fill") }
                .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
        .background(Palette.card)
    }

    func sendChat() {
        let text = draft
        draft = ""
        act { try await lobbies.send(text) }
    }

    @ViewBuilder
    func round(_ l: Lobby, _ i: Int, _ remaining: Double) -> some View {
        if let p = l.prompt(i), p.mode == .tiles {
            tilesRound(l, p, remaining)
        } else if let p = l.prompt(i), p.mode == .spy || p.mode == .other {
            onWeb(l, p, remaining)
        } else if let p = l.prompt(i) {
            let picked = lobbies.picks[i]
            FitPage { VStack(spacing: 16) {
                HStack {
                    Text("Round \(i + 1) of \(l.rounds)").font(.headline).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("\(Int(remaining.rounded(.up)))s").font(.headline.monospacedDigit()).foregroundStyle(remaining < 3 ? D8.vermilion : Palette.ink)
                }
                ProgressView(value: max(0, remaining), total: Double(l.roundSeconds)).tint(D8.malachite)
                VStack(spacing: 6) {
                    if let lang = p.lang, p.mode != .flag { FlagTile(lang: lang, size: 40) }
                    Text(p.mode == .flag ? String(localized: "Which language?") : "").font(.subheadline).foregroundStyle(Palette.muted)
                    Text(p.gloss).font(D8.word(30)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
                }
                .padding(.vertical, 8)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                    ForEach(p.choices, id: \.self) { c in
                        let mark = lobbies.marks[i]
                        let state: RowState = c != picked ? .other : mark == true ? .right : mark == false ? .wrong : .other
                        Button {
                            Task { await lobbies.pick(c, round: i) }
                        } label: {
                            Group {
                                if p.mode == .flag { FlagTile(lang: c, size: 64) } else { Text(c).font(D8.word(22)).lineLimit(2).minimumScaleFactor(0.5) }
                            }
                                .padding(10).frame(maxWidth: .infinity, minHeight: 100)
                                .foregroundStyle(state == .right ? .white : Palette.ink)
                        }
                        .buttonStyle(GameChoiceStyle(state: state))
                        .disabled(picked != nil)
                        .accessibilityIdentifier("lobby-choice")
                    }
                }
                answered(l)
                if i > 0 { lastRound(l, i - 1) }
                Spacer(minLength: 0)
            }
            .padding() }
        } else {
            GameWaiting(message: String(localized: "Loading the words for this lobby."))
        }
    }

    func roundHeader(_ l: Lobby, _ i: Int, _ remaining: Double) -> some View {
        VStack(spacing: 10) {
            HStack {
                Text("Round \(i + 1) of \(l.rounds)").font(.headline).foregroundStyle(Palette.ink)
                Spacer()
                Text("\(Int(remaining.rounded(.up)))s").font(.headline.monospacedDigit()).foregroundStyle(remaining < 3 ? D8.vermilion : Palette.ink)
            }
            ProgressView(value: max(0, remaining), total: Double(l.roundSeconds)).tint(D8.malachite)
        }
    }

    func tilesRound(_ l: Lobby, _ p: LobbyPrompt, _ remaining: Double) -> some View {
        let i = p.round
        let tiles = LobbyTilePicks.tiles(p)
        let mine = tapped[i] ?? []
        let sent = lobbies.picks[i] != nil
        return FitPage { VStack(spacing: 14) {
            roundHeader(l, i, remaining)
            Text("Tap every word for \(p.gloss)").font(D8.word(24)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 10)], spacing: 10) {
                ForEach(Array(tiles.enumerated()), id: \.offset) { n, t in
                    let on = mine.contains(n)
                    let state: RowState = !on ? .other : lobbies.marks[i] == false ? .wrong : .right
                    Button {
                        guard !sent else { return }
                        if on { tapped[i, default: []].remove(n) } else { tapped[i, default: []].insert(n) }
                    } label: {
                        HStack(spacing: 8) {
                            if !t.lang.isEmpty { FlagTile(lang: t.lang, size: 24) }
                            Text(t.form).font(D8.word(19)).lineLimit(2).minimumScaleFactor(0.5)
                        }
                        .padding(8).frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(state == .right ? .white : Palette.ink)
                    }
                    .buttonStyle(GameChoiceStyle(state: state))
                    .disabled(sent)
                    .accessibilityIdentifier("lobby-tile")
                }
            }
            Button("Done") { submitTiles(i) }
                .buttonStyle(.borderedProminent)
                .tint(D8.malachite)
                .disabled(sent)
                .accessibilityIdentifier("lobby-tiles-done")
            if i > 0 { lastRound(l, i - 1) }
            Spacer(minLength: 0)
        }
        .padding() }
        .onChange(of: LobbyTilePicks.submitDue(remaining: remaining, roundSeconds: l.roundSeconds), initial: true) { _, due in
            if due { submitTiles(i) }
        }
    }

    func submitTiles(_ i: Int) {
        guard lobbies.picks[i] == nil else { return }
        let choice = LobbyTilePicks.choice(tapped[i] ?? [])
        Task { await lobbies.pick(choice, round: i) }
    }

    func onWeb(_ l: Lobby, _ p: LobbyPrompt, _ remaining: Double) -> some View {
        VStack(spacing: 16) {
            roundHeader(l, p.round, remaining)
            Text(p.gloss).font(D8.word(30)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
            Text("This round plays on polingual.com.").foregroundStyle(Palette.muted).multilineTextAlignment(.center)
            if let url = URL(string: "https://polingual.com/play/\(l.code)") {
                Link("Open polingual.com", destination: url)
                    .buttonStyle(.borderedProminent)
                    .tint(D8.malachite)
            }
            Spacer(minLength: 0)
        }
        .padding()
    }

    func reveal(_ l: Lobby, _ i: Int, _ remaining: Double) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Round \(i + 1) of \(l.rounds)").font(.headline).foregroundStyle(Palette.ink)
                Spacer()
                Text("Next round").font(.subheadline).foregroundStyle(Palette.muted)
                Text("\(Int(remaining.rounded(.up)))s").font(.headline.monospacedDigit()).foregroundStyle(Palette.ink)
            }
            if let p = l.prompt(i) {
                if !p.revealOrdered.isEmpty {
                    verdict(p, i)
                    revealWords(p)
                } else {
                    VStack(spacing: 6) {
                        if let lang = p.lang, p.mode != .flag { FlagTile(lang: lang, size: 40) }
                        Text(p.gloss).font(D8.word(30)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
                        if p.mode == .flag, let a = p.answer { FlagTile(lang: a, size: 56) }
                        else if p.mode.choosesText, let a = p.answer { Text(a).font(D8.word(24)).foregroundStyle(D8.malachite) }
                        else if p.mode == .tiles, let right = LobbyTilePicks.answer(p) {
                            let tiles = LobbyTilePicks.tiles(p)
                            ForEach(right.sorted().filter { $0 < tiles.count }, id: \.self) { n in
                                Text(tiles[n].form).font(D8.word(20)).foregroundStyle(D8.malachite)
                            }
                        }
                    }
                }
            }
            lastRound(l, i)
            Spacer(minLength: 0)
        }
        .padding()
    }

    @ViewBuilder
    func verdict(_ p: LobbyPrompt, _ i: Int) -> some View {
        if p.mode != .tiles, let answer = p.answer {
            let pick = lobbies.picks[i]
            let right = pick.map { $0 == answer }
            VStack(alignment: .leading, spacing: 4) {
                Text(right == true ? String(localized: "You got it") : right == false ? String(localized: "Not this time") : String(localized: "Time is up"))
                    .font(.headline).foregroundStyle(right == true ? D8.malachite : right == false ? D8.vermilion : Palette.ink)
                choiceLine(String(localized: "Answer"), p.label(answer))
                if let pick, pick != answer { choiceLine(String(localized: "You picked"), p.label(pick)) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }

    func choiceLine(_ key: String, _ label: LobbyChoiceLabel) -> some View {
        HStack(spacing: 6) {
            Text(key).font(.caption.weight(.heavy)).foregroundStyle(Palette.muted)
            if let lang = label.lang { FlagTile(lang: lang, size: 18) }
            if let word = label.word { Text(word).font(.subheadline.weight(.bold)).foregroundStyle(Palette.ink) }
            if let lang = label.lang { Text(langName(lang)).font(.subheadline).foregroundStyle(Palette.muted) }
        }
    }

    func revealWords(_ p: LobbyPrompt) -> some View {
        let entries = p.revealOrdered
        return VStack(alignment: .leading, spacing: 6) {
            Text(p.mode == .flag ? entries.first(where: \.correct)?.meaning ?? p.gloss : p.gloss)
                .font(D8.word(22)).foregroundStyle(Palette.ink).lineLimit(2).minimumScaleFactor(0.6)
            ViewThatFits(in: .vertical) {
                revealGrid(entries)
                ScrollView { revealGrid(entries) }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    func revealGrid(_ entries: [LobbyRevealEntry]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 8)], spacing: 8) {
            ForEach(Array(entries.enumerated()), id: \.offset) { _, e in
                HStack(alignment: .top, spacing: 8) {
                    FlagTile(lang: e.lang, size: 28)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(e.word).font(D8.word(18)).foregroundStyle(Palette.ink).lineLimit(1).minimumScaleFactor(0.6)
                        if let roman = e.roman, !roman.isEmpty, roman != e.word {
                            Text(roman).font(.caption).foregroundStyle(Palette.muted).lineLimit(1)
                        }
                        Text(langName(e.lang)).font(.caption2.weight(.heavy)).foregroundStyle(Palette.muted).lineLimit(1)
                        Text(e.meaning).font(.caption).foregroundStyle(Palette.ink).lineLimit(2)
                    }
                    Spacer(minLength: 0)
                    if e.correct { Image(systemName: "checkmark.circle.fill").foregroundStyle(D8.malachite) }
                }
                .padding(8)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .background(Palette.card, in: .rect(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(e.correct ? D8.malachite : .clear, lineWidth: 2))
                .accessibilityElement(children: .combine)
            }
        }
    }

    func answered(_ l: Lobby) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                ForEach(l.standings) { pl in
                    Label(pl.name, systemImage: pl.answered ? "checkmark.circle.fill" : "circle")
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                        .fixedSize()
                        .foregroundStyle(pl.answered ? D8.malachite : Palette.muted)
                        .accessibilityValue(pl.answered ? String(localized: "Answered") : String(localized: "Waiting"))
                }
            }
            HStack(spacing: 6) {
                ForEach(l.standings) { pl in
                    Image(systemName: pl.answered ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(pl.answered ? D8.malachite : Palette.muted)
                        .accessibilityLabel(pl.name)
                        .accessibilityValue(pl.answered ? String(localized: "Answered") : String(localized: "Waiting"))
                }
                Text(verbatim: "\(l.standings.filter(\.answered).count)/\(l.standings.count)")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Palette.muted)
            }
        }
    }

    func lastRound(_ l: Lobby, _ i: Int) -> some View {
        let results = l.results(for: i)
        return VStack(alignment: .leading, spacing: 4) {
            Text("Last round").font(.caption.weight(.heavy)).foregroundStyle(Palette.muted)
            ForEach(l.standings) { pl in
                let r = results.first { $0.userId == pl.userId }
                HStack {
                    Text(pl.name)
                    Spacer()
                    Text(r.map { $0.correct ? "+\($0.points)" : "miss" } ?? "no answer").monospacedDigit()
                        .foregroundStyle(r?.correct == true ? D8.malachite : Palette.muted)
                }
                .font(.footnote)
            }
        }
        .padding(12)
        .background(Palette.card, in: .rect(cornerRadius: 12))
    }

    func board(_ l: Lobby) -> some View {
        List {
            Section { LearnUpsell() }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            Section("Final scores") {
                ForEach(Array(l.standings.enumerated()), id: \.element.id) { n, p in
                    HStack {
                        Text("\(n + 1)").font(.headline.monospacedDigit()).frame(width: 28)
                        Text(p.name).font(n == 0 ? .headline : .body)
                        if n == 0 { Image(systemName: "trophy.fill").foregroundStyle(D8.vermilion) }
                        Spacer()
                        Text("\(p.score)").font(.headline.monospacedDigit())
                    }
                    .foregroundStyle(Palette.ink)
                }
            }
            if !l.prompts.isEmpty { Section("Words") {
                ForEach(l.prompts) { p in
                    let n = p.round
                    HStack {
                        if let lang = p.lang { FlagTile(lang: lang, size: 22) }
                        Text(p.mode == .flag ? p.gloss : p.answer ?? "").font(.headline)
                        Text(p.mode == .flag ? "" : p.gloss).foregroundStyle(Palette.muted)
                        Spacer()
                        if let mine = l.results.first(where: { $0.round == n && $0.userId == l.me?.userId }) {
                            Image(systemName: mine.correct ? "checkmark" : "xmark").foregroundStyle(mine.correct ? D8.malachite : D8.vermilion)
                        }
                    }
                }
            } }
            Section("Chat") { chatLog(l) }
        }
        .safeAreaInset(edge: .bottom) { chatBar }
        .onAppear {
            sawFinish = true
            SaveNudge.gameEnded(signedIn: account.stage == .signedIn)
        }
    }

    func act(_ work: @escaping () async throws -> Void) {
        problem = nil
        Task {
            do { try await work() } catch let e as BucketError { problem = lobbyProblem(e) } catch { problem = String(localized: "Something went wrong.") }
        }
    }
}
