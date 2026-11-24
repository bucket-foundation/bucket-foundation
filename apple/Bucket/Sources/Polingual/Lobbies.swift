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

    static var system: LangSystem? {
        guard seed != nil else { return nil }
        return store?.current?.raceSystem
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
    static func dealRandom() -> RaceRandom { RaceRandom(seed: seed) }
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

    var body: some View { kind.board }
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
                Text(lobby.game.title).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                Spacer()
                Text(clock).font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(remaining < 30 ? PL.vermilion : PL.ink)
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
            .font(PL.label.font())
            .foregroundStyle(PL.inkDim)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(PL.card)
    }
}

struct LobbiesTile: View {
    var body: some View {
        NavigationLink {
            LobbiesScreen()
        } label: {
            TileRow(symbol: "person.3.fill", title: String(localized: "Live Lobbies"), detail: String(localized: "Play the same round with friends, live."), color: PL.malachite)
                .padding(12)
                .background(PL.card, in: .rect(cornerRadius: 18))
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
                lobbies.stage(players: players, mode: Launch.value("-lobbyStageMode").flatMap(LobbyPromptMode.init(rawValue:)) ?? .form, race: Launch.value("-lobbyStageRace").flatMap(LobbyGame.init(rawValue:)), chat: Launch.value("-lobbyStageChat") == "1")
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
        ScrollView {
            VStack(alignment: .leading, spacing: PL.Space.s4) {
                PlayLabel(text: "You")
                PLCard {
                    TextField("Name others see", text: $displayName).lobbyField().accessibilityIdentifier("lobbyName")
                }
                PlayLabel(text: "Join by code")
                PLCard {
                    HStack(spacing: PL.Space.s3) {
                        TextField("6 letter code", text: $code)
                            #if os(iOS)
                            .textInputAutocapitalization(.characters)
                            #endif
                            .autocorrectionDisabled()
                            .lobbyField()
                            .accessibilityIdentifier("lobbyCode")
                        Button("Join") { act { try await lobbies.join(code: code, displayName: name) } }
                            .buttonStyle(.pl(.primary, size: .md, full: false))
                            .disabled(name.isEmpty || code.count < 6 || lobbies.busy)
                    }
                }
                PlayLabel(text: "New lobby")
                PLCard {
                    VStack(alignment: .leading, spacing: PL.Space.s3) {
                        HStack {
                            Text("Game").font(PL.body.font()).foregroundStyle(PL.ink)
                            Spacer()
                            Picker("Game", selection: $game) {
                                ForEach(lobbies.hostable) { Text($0.title).tag($0) }
                            }
                            .tint(PL.tyrian)
                            .accessibilityIdentifier("lobbyGame")
                        }
                        ForEach(langs.systems.filter { game.fits($0.targets) }) { s in
                            Button {
                                act { try await lobbies.create(name: "\(name)'s lobby", game: game, root: s.root, targets: s.targets, displayName: name) }
                            } label: {
                                HStack(spacing: -6) {
                                    ForEach(s.targets.prefix(5), id: \.self) { FlagTile(lang: $0, size: 30) }
                                    Text(s.name).font(PL.body.font()).lineLimit(2).padding(.leading, PL.Space.s4)
                                    Spacer(minLength: 0)
                                }
                                .padding(PL.Space.s3)
                            }
                            .buttonStyle(GameAnswerStyle(state: .other))
                            .disabled(name.isEmpty || lobbies.busy)
                        }
                        if langs.systems.isEmpty { Text("Start a language set in Learn first.").font(PL.body.font()).foregroundStyle(PL.inkDim) }
                    }
                }
                PlayLabel(text: "Open lobbies")
                PLCard {
                    VStack(alignment: .leading, spacing: PL.Space.s3) {
                        if lobbies.open.isEmpty { Text("No open lobbies right now. Start one and share the code.").font(PL.body.font()).foregroundStyle(PL.inkDim) }
                        ForEach(lobbies.open) { l in
                            Button { act { try await lobbies.join(l, displayName: name) } } label: {
                                HStack {
                                    HStack(spacing: -6) { ForEach(l.targets.prefix(4), id: \.self) { FlagTile(lang: $0, size: 26) } }
                                    VStack(alignment: .leading) {
                                        Text(l.name).font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                                        Text("\(l.game.title) · \(l.host) · \(l.players) of \(LobbyRules.cap)").font(PL.small.font()).foregroundStyle(PL.inkDim)
                                    }
                                    .padding(.leading, PL.Space.s2)
                                    Spacer()
                                    if l.isMember { Text("Rejoin").font(PL.label.font()).foregroundStyle(PL.malachite) }
                                }
                                .padding(PL.Space.s3)
                            }
                            .buttonStyle(GameAnswerStyle(state: .other))
                            .disabled(name.isEmpty && !l.isMember)
                        }
                    }
                }
                if let problem { Text(problem).font(PL.body.font()).foregroundStyle(PL.ochre) }
                AdPrivacyButton().buttonStyle(.pl(.ghost, size: .sm, full: false))
            }
            .padding(PL.Space.s4)
        }
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .plGround(.lattice, band: true)
        .lightStatusBar()
        .inlineTitle()
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Live Lobbies").font(PL.heading.font()).foregroundStyle(PL.paper).accessibilityAddTraits(.isHeader)
            }
        }
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
        .safeAreaInset(edge: .bottom) { AdBanner(surface: .lobby) }
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

extension View {
    func lobbyField() -> some View {
        font(PL.body.font())
            .foregroundStyle(PL.ink)
            .padding(PL.Space.s3)
            .background(PL.paper, in: .rect(cornerRadius: PL.Radius.sm))
    }
}

func chatReportLabel(_ r: ChatReportReason) -> String {
    switch r {
    case .offensiveName: String(localized: "Offensive name")
    case .harassment: String(localized: "Harassment")
    case .spam: String(localized: "Spam")
    case .other: String(localized: "Something else")
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
    @Environment(LangStore.self) private var langs
    @State private var draft = ""
    @State private var problem: String?
    @State private var sawFinish = false
    @State private var tapped: [Int: Set<Int>] = [:]
    @State private var blockTarget: LobbyMessage?
    @State private var reportSent: LobbyMessage?

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
        .task(id: "\(lobbies.current?.id ?? "")|\(lobbies.current?.me?.userId ?? "")|\(lobbies.blocks == nil)") { if lobbies.blocks == nil { await lobbies.loadBlocks() } }
        .confirmationDialog(Text("Block \(blockTarget?.name ?? "")?"), isPresented: Binding(get: { blockTarget != nil }, set: { if !$0 { blockTarget = nil } }), titleVisibility: .visible, presenting: blockTarget) { m in
            Button("Block", role: .destructive) { block(m) }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            Text("You will stop seeing their messages.")
        }
        .alert(Text("Report sent"), isPresented: Binding(get: { reportSent != nil }, set: { if !$0 { reportSent = nil } }), presenting: reportSent) { m in
            Button("Block \(m.name)", role: .destructive) { block(m) }
            Button("Done", role: .cancel) {}
        } message: { _ in
            Text("We will review this report within 24 hours and act on it.")
        }
        .onDisappear { LobbyAds.shared.left(.lobby, finishedGame: sawFinish) }
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
                Text("Get ready").font(PL.wordFont(26)).foregroundStyle(PL.ink)
                Text("\(Int(s.rounded(.up)))").font(PL.script(96)).foregroundStyle(PL.vermilion)
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
                        Text("Code").foregroundStyle(PL.inkDim)
                        Text(l.code).font(PL.capsFont(22)).textSelection(.enabled)
                        Spacer()
                        ShareLink(item: String(localized: "Join my Polingual lobby with code \(l.code): https://polingual.com/play/\(l.code)")) { Image(systemName: "square.and.arrow.up") }
                    }
                    HStack(spacing: -6) { ForEach(l.targets, id: \.self) { FlagTile(lang: $0, size: 28) } }
                    if l.game.isRace {
                        Text("\(l.game.title), highest score in \(Int(l.playSeconds) / 60) minutes wins").font(PL.small.font()).foregroundStyle(PL.inkDim)
                    } else {
                        Text("\(l.game.title), \(l.rounds) rounds, \(l.roundSeconds) seconds each").font(PL.small.font()).foregroundStyle(PL.inkDim)
                    }
                }
                Section("Players") {
                    ForEach(l.players) { p in
                        HStack {
                            Circle().fill(p.online ? PL.malachite : PL.paper3).frame(width: 8, height: 8)
                            Text(p.name).foregroundStyle(PL.ink)
                            if p.isHost { Image(systemName: "crown.fill").foregroundStyle(PL.vermilion).font(PL.label.font()) }
                            Spacer()
                            Text(p.ready ? "Ready" : "Waiting").font(PL.label.font()).foregroundStyle(p.ready ? PL.malachite : PL.inkDim)
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
                        if !l.canStart { Text("Two ready players start the game.").font(PL.small.font()).foregroundStyle(PL.inkDim) }
                    }
                    if let problem { Text(problem).foregroundStyle(PL.vermilion) }
                }
                Section("Chat") { chatLog(l) }
            }
            chatBar
        }
    }

    @ViewBuilder
    func chatLog(_ l: Lobby) -> some View {
        if lobbies.blocks == nil {
            Text("Loading chat…").font(PL.small.font()).foregroundStyle(PL.inkDim)
        }
        if lobbies.blocksFailed {
            Text("Your block list did not load. Blocked players may show.").font(PL.small.font()).foregroundStyle(PL.vermilion)
        }
        ForEach(lobbies.visibleMessages(l).suffix(30)) { m in
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(m.name).font(PL.label.font()).foregroundStyle(m.from == l.me?.userId ? PL.lapis : PL.inkDim)
                    Text(m.body).foregroundStyle(PL.ink)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if ChatModeration.canModerate(m, in: l) { moderationMenu(m) }
            }
        }
    }

    func moderationMenu(_ m: LobbyMessage) -> some View {
        Menu {
            Menu("Report") {
                ForEach(ChatReportReason.allCases) { reason in
                    Button(chatReportLabel(reason)) { report(m, reason) }
                }
            }
            Button("Block \(m.name)", role: .destructive) { blockTarget = m }
        } label: {
            Image(systemName: "ellipsis")
                .foregroundStyle(PL.inkDim)
                .frame(width: 44, height: 44)
                .contentShape(.rect)
        }
        .accessibilityLabel(Text("Report or block \(m.name)"))
        .accessibilityIdentifier("chatModerate")
    }

    func report(_ m: LobbyMessage, _ reason: ChatReportReason) {
        problem = nil
        Task {
            do throws(BucketError) {
                try await lobbies.report(m, reason: reason)
                reportSent = m
            } catch {
                problem = String(localized: "Report not sent: \(lobbyProblem(error))")
            }
        }
    }

    func block(_ m: LobbyMessage) {
        problem = nil
        Task {
            do throws(BucketError) { try await lobbies.block(m) } catch { problem = String(localized: "Block failed: \(lobbyProblem(error))") }
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
        .background(PL.card)
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
                    Text("Round \(i + 1) of \(l.rounds)").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                    Spacer()
                    Text("\(Int(remaining.rounded(.up)))s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(remaining < 3 ? PL.vermilion : PL.ink)
                }
                ProgressView(value: max(0, remaining), total: Double(l.roundSeconds)).tint(PL.malachite)
                VStack(spacing: 6) {
                    if let lang = p.lang, p.mode != .flag { FlagTile(lang: lang, size: 40) }
                    Text(p.mode == .flag ? String(localized: "Which language?") : "").font(PL.small.font()).foregroundStyle(PL.inkDim)
                    Text(p.gloss).font(PL.wordFont(30)).foregroundStyle(PL.ink).multilineTextAlignment(.center)
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
                                if p.mode == .flag { FlagTile(lang: c, size: 64) } else { Text(c).font(PL.wordFont(22)).lineLimit(2).minimumScaleFactor(0.5) }
                            }
                                .padding(10).frame(maxWidth: .infinity, minHeight: 100)
                        }
                        .buttonStyle(GameAnswerStyle(state: state))
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
                Text("Round \(i + 1) of \(l.rounds)").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                Spacer()
                Text("\(Int(remaining.rounded(.up)))s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(remaining < 3 ? PL.vermilion : PL.ink)
            }
            ProgressView(value: max(0, remaining), total: Double(l.roundSeconds)).tint(PL.malachite)
        }
    }

    func tilesRound(_ l: Lobby, _ p: LobbyPrompt, _ remaining: Double) -> some View {
        let i = p.round
        let tiles = LobbyTilePicks.tiles(p)
        let mine = tapped[i] ?? []
        let sent = lobbies.picks[i] != nil
        return FitPage { VStack(spacing: 14) {
            roundHeader(l, i, remaining)
            Text("Tap every word for \(p.gloss)").font(PL.wordFont(24)).foregroundStyle(PL.ink).multilineTextAlignment(.center)
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
                            Text(t.form).font(PL.wordFont(19)).lineLimit(2).minimumScaleFactor(0.5)
                        }
                        .padding(8).frame(maxWidth: .infinity, minHeight: 56)
                    }
                    .buttonStyle(GameAnswerStyle(state: state))
                    .disabled(sent)
                    .accessibilityIdentifier("lobby-tile")
                }
            }
            Button("Done") { submitTiles(i) }
                .buttonStyle(.borderedProminent)
                .tint(PL.malachite)
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
            Text(p.gloss).font(PL.wordFont(30)).foregroundStyle(PL.ink).multilineTextAlignment(.center)
            Text("This round plays on polingual.com.").foregroundStyle(PL.inkDim).multilineTextAlignment(.center)
            if let url = URL(string: "https://polingual.com/play/\(l.code)") {
                Link("Open polingual.com", destination: url)
                    .buttonStyle(.borderedProminent)
                    .tint(PL.malachite)
            }
            Spacer(minLength: 0)
        }
        .padding()
    }

    func reveal(_ l: Lobby, _ i: Int, _ remaining: Double) -> some View {
        VStack(spacing: 16) {
            HStack {
                Text("Round \(i + 1) of \(l.rounds)").font(PL.heading.font(scale: 0.75)).foregroundStyle(PL.ink)
                Spacer()
                Text("Next round").font(PL.small.font()).foregroundStyle(PL.inkDim)
                Text("\(Int(remaining.rounded(.up)))s").font(PL.heading.font(scale: 0.75)).monospacedDigit().foregroundStyle(PL.ink)
            }
            if let p = l.prompt(i) {
                if !p.revealOrdered.isEmpty {
                    verdict(p, i)
                    revealWords(p)
                } else {
                    VStack(spacing: 6) {
                        if let lang = p.lang, p.mode != .flag { FlagTile(lang: lang, size: 40) }
                        Text(p.gloss).font(PL.wordFont(30)).foregroundStyle(PL.ink).multilineTextAlignment(.center)
                        if p.mode == .flag, let a = p.answer { FlagTile(lang: a, size: 56) }
                        else if p.mode.choosesText, let a = p.answer { Text(a).font(PL.wordFont(24)).foregroundStyle(PL.malachite) }
                        else if p.mode == .tiles, let right = LobbyTilePicks.answer(p) {
                            let tiles = LobbyTilePicks.tiles(p)
                            ForEach(right.sorted().filter { $0 < tiles.count }, id: \.self) { n in
                                Text(tiles[n].form).font(PL.wordFont(20)).foregroundStyle(PL.malachite)
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
                    .font(PL.heading.font(scale: 0.75)).foregroundStyle(right == true ? PL.malachite : right == false ? PL.vermilion : PL.ink)
                choiceLine(String(localized: "Answer"), p.label(answer))
                if let pick, pick != answer { choiceLine(String(localized: "You picked"), p.label(pick)) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
        }
    }

    func choiceLine(_ key: String, _ label: LobbyChoiceLabel) -> some View {
        HStack(spacing: 6) {
            Text(key).font(PL.label.font()).foregroundStyle(PL.inkDim)
            if let lang = label.lang { FlagTile(lang: lang, size: 18) }
            if let word = label.word { Text(word).font(PL.small.font()).foregroundStyle(PL.ink) }
            if let lang = label.lang { Text(langName(lang)).font(PL.small.font()).foregroundStyle(PL.inkDim) }
        }
    }

    func revealWords(_ p: LobbyPrompt) -> some View {
        let entries = p.revealOrdered
        return VStack(alignment: .leading, spacing: 6) {
            Text(p.mode == .flag ? entries.first(where: \.correct)?.meaning ?? p.gloss : p.gloss)
                .font(PL.wordFont(22)).foregroundStyle(PL.ink).lineLimit(2).minimumScaleFactor(0.6)
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
                        Text(e.word).font(PL.wordFont(18)).foregroundStyle(PL.ink).lineLimit(1).minimumScaleFactor(0.6)
                        if let roman = e.roman, !roman.isEmpty, roman != e.word {
                            Text(roman).font(PL.label.font()).foregroundStyle(PL.inkDim).lineLimit(1)
                        }
                        Text(langName(e.lang)).font(PL.label.font()).foregroundStyle(PL.inkDim).lineLimit(1)
                        Text(e.meaning).font(PL.label.font()).foregroundStyle(PL.ink).lineLimit(2)
                    }
                    Spacer(minLength: 0)
                    if e.correct { Image(systemName: "checkmark.circle.fill").foregroundStyle(PL.malachite) }
                }
                .padding(8)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .background(PL.card, in: .rect(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(e.correct ? PL.malachite : .clear, lineWidth: 2))
                .accessibilityElement(children: .combine)
            }
        }
    }

    func answered(_ l: Lobby) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                ForEach(l.standings) { pl in
                    Label(pl.name, systemImage: pl.answered ? "checkmark.circle.fill" : "circle")
                        .font(PL.label.font())
                        .lineLimit(1)
                        .fixedSize()
                        .foregroundStyle(pl.answered ? PL.malachite : PL.inkDim)
                        .accessibilityValue(pl.answered ? String(localized: "Answered") : String(localized: "Waiting"))
                }
            }
            HStack(spacing: 6) {
                ForEach(l.standings) { pl in
                    Image(systemName: pl.answered ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(pl.answered ? PL.malachite : PL.inkDim)
                        .accessibilityLabel(pl.name)
                        .accessibilityValue(pl.answered ? String(localized: "Answered") : String(localized: "Waiting"))
                }
                Text(verbatim: "\(l.standings.filter(\.answered).count)/\(l.standings.count)")
                    .font(PL.label.font())
                    .foregroundStyle(PL.inkDim)
            }
        }
    }

    func lastRound(_ l: Lobby, _ i: Int) -> some View {
        let results = l.results(for: i)
        return VStack(alignment: .leading, spacing: 4) {
            Text("Last round").font(PL.label.font()).foregroundStyle(PL.inkDim)
            ForEach(l.standings) { pl in
                let r = results.first { $0.userId == pl.userId }
                HStack {
                    Text(pl.name)
                    Spacer()
                    Text(r.map { $0.correct ? "+\($0.points)" : "miss" } ?? "no answer").monospacedDigit()
                        .foregroundStyle(r?.correct == true ? PL.malachite : PL.inkDim)
                }
                .font(PL.small.font())
            }
        }
        .padding(12)
        .background(PL.card, in: .rect(cornerRadius: 12))
    }

    func board(_ l: Lobby) -> some View {
        List {
            Section { LearnUpsell() }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            Section("Final scores") {
                ForEach(Array(l.standings.enumerated()), id: \.element.id) { n, p in
                    HStack {
                        Text("\(n + 1)").font(PL.heading.font(scale: 0.75)).monospacedDigit().frame(width: 28)
                        Text(p.name).font(n == 0 ? PL.heading.font(scale: 0.75) : PL.body.font())
                        if n == 0 { Image(systemName: "trophy.fill").foregroundStyle(PL.vermilion) }
                        Spacer()
                        Text("\(p.score)").font(PL.heading.font(scale: 0.75)).monospacedDigit()
                    }
                    .foregroundStyle(PL.ink)
                }
            }
            if !l.prompts.isEmpty { Section("Words") {
                ForEach(l.prompts) { p in
                    let n = p.round
                    HStack {
                        if let lang = p.lang { FlagTile(lang: lang, size: 22) }
                        Text(p.mode == .flag ? p.gloss : p.answer ?? "").font(PL.heading.font(scale: 0.75))
                        Text(p.mode == .flag ? "" : p.gloss).foregroundStyle(PL.inkDim)
                        Spacer()
                        if let mine = l.results.first(where: { $0.round == n && $0.userId == l.me?.userId }) {
                            Image(systemName: mine.correct ? "checkmark" : "xmark").foregroundStyle(mine.correct ? PL.malachite : PL.vermilion)
                        }
                    }
                }
            } }
            Section("Chat") { chatLog(l) }
        }
        .safeAreaInset(edge: .bottom) { chatBar }
        .onAppear {
            sawFinish = true
            langs.recordLobby(l)
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
