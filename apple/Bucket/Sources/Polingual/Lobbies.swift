import BucketKit
import SwiftUI

extension LobbyGame {
    var title: String {
        switch self {
        case .daily: String(localized: "Daily Set")
        case .sameWord: String(localized: "Same Word")
        case .flags: String(localized: "Flags")
        case .live: String(localized: "Live Mix")
        }
    }

    func fits(_ targets: [String]) -> Bool { self != .sameWord || targets.count >= 2 }
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
                    ForEach(LobbyGame.allCases) { Text($0.title).tag($0) }
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
        .onAppear { LobbyAds.shared.start() }
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
        switch phase {
        case .waiting: waiting(l)
        case .countdown(let s):
            VStack(spacing: 12) {
                Text("Get ready").font(D8.word(26)).foregroundStyle(Palette.ink)
                Text("\(Int(s.rounded(.up)))").font(.system(size: 96, weight: .heavy, design: .rounded)).foregroundStyle(D8.vermilion)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .round(let i, let remaining): round(l, i, remaining)
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
                    Text("\(l.game.title), \(l.rounds) rounds, \(l.roundSeconds) seconds each").font(.footnote).foregroundStyle(Palette.muted)
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
        if let p = l.prompt(i) {
            let picked = lobbies.picks[i]
            VStack(spacing: 16) {
                HStack {
                    Text("Round \(i + 1) of \(l.rounds)").font(.headline).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("\(Int(remaining.rounded(.up)))s").font(.headline.monospacedDigit()).foregroundStyle(remaining < 3 ? D8.vermilion : Palette.ink)
                }
                ProgressView(value: max(0, remaining), total: Double(l.roundSeconds)).tint(D8.malachite)
                VStack(spacing: 6) {
                    if let lang = p.lang, p.mode == .form { FlagTile(lang: lang, size: 40) }
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
                HStack(spacing: 8) {
                    ForEach(l.standings) { pl in
                        Label(pl.name, systemImage: pl.answered ? "checkmark.circle.fill" : "circle")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(pl.answered ? D8.malachite : Palette.muted)
                    }
                }
                if i > 0 { lastRound(l, i - 1) }
                Spacer(minLength: 0)
            }
            .padding()
        } else {
            GameWaiting(message: String(localized: "Loading the words for this lobby."))
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
            Section("Words") {
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
            }
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
