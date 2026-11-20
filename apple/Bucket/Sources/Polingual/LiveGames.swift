import BucketKit
import SwiftUI

extension GameKind {
    var lobbyGames: [LobbyGame] { LiveGames.lobbyGames(forGame: rawValue) }

    @MainActor func hostedLobby(_ lobbies: LobbyStore) -> LobbyGame? {
        LiveGames.hosted(forGame: rawValue, hostable: lobbies.hostable)
    }
}

enum LiveStart {
    case play(GameKind, LobbyGame)
    case race(GameKind, LobbyGame)
    case join(LobbySummary)
}

struct PlayLiveLink: View {
    @Environment(LobbyStore.self) private var lobbies
    let kind: GameKind

    var body: some View {
        if LobbyRace.system == nil, let game = kind.hostedLobby(lobbies) {
            let playing = LiveGames.players(lobbies.open, games: kind.lobbyGames)
            NavigationLink { LiveStartScreen(start: .play(kind, game)) } label: {
                Text(playing > 0 ? String(localized: "Play live, \(playing) playing") : String(localized: "Play live"))
                    .lineLimit(1).minimumScaleFactor(0.7)
            }
            .buttonStyle(.pl(.ghost, size: .sm))
            .accessibilityIdentifier("playLive-\(kind.rawValue)")
        }
    }
}

struct LiveResultActions: View {
    @Environment(LobbyStore.self) private var lobbies
    let kind: GameKind

    var body: some View {
        if LobbyRace.system == nil, let game = kind.hostedLobby(lobbies) {
            HStack(spacing: PL.Space.s3) {
                NavigationLink { LiveStartScreen(start: .race(kind, game)) } label: { Text("Race a friend") }
                    .buttonStyle(.pl(.secondary, size: .md))
                    .accessibilityIdentifier("raceFriend")
                NavigationLink { LiveStartScreen(start: .play(kind, game)) } label: { Text("Play live") }
                    .buttonStyle(.pl(.ghost, size: .md))
                    .accessibilityIdentifier("resultPlayLive")
            }
        }
    }
}

struct LiveNowRow: View {
    @Environment(LobbyStore.self) private var lobbies

    var body: some View {
        let rooms = Array(LiveGames.liveNow(lobbies.open).prefix(12))
        VStack(alignment: .leading, spacing: PL.Space.s2) {
            if !rooms.isEmpty {
                Text("Live now").font(PL.heading.font()).foregroundStyle(PL.paper)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: PL.Space.s3) {
                        ForEach(rooms) { room in
                            NavigationLink { LiveStartScreen(start: .join(room)) } label: { LiveRoomChip(room: room) }
                                .buttonStyle(.plain)
                        }
                    }
                }
                .accessibilityIdentifier("liveNow")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task {
            while !Task.isCancelled {
                await lobbies.refresh()
                try? await Task.sleep(for: .seconds(15))
            }
        }
    }
}

struct LiveRoomChip: View {
    let room: LobbySummary

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: -6) { ForEach(room.targets.prefix(3), id: \.self) { FlagTile(lang: $0, size: 22) } }
            Text(room.game.title).font(.headline).foregroundStyle(Palette.ink).lineLimit(1)
            Text(room.status == .playing ? String(localized: "\(room.players) playing, in a game") : String(localized: "\(room.players) of \(LobbyRules.cap) waiting"))
                .font(.footnote).foregroundStyle(Palette.muted).lineLimit(1)
        }
        .padding(12)
        .frame(minWidth: 150, minHeight: 44, alignment: .leading)
        .background(Palette.card, in: .rect(cornerRadius: 16))
    }
}

struct LiveStartScreen: View {
    @Environment(LobbyStore.self) private var lobbies
    @Environment(LangStore.self) private var langs
    @AppStorage("groups.displayName") private var displayName = ""
    let start: LiveStart
    @State private var entered = false
    @State private var working = false
    @State private var problem: String?

    var name: String { String(displayName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40)) }

    var body: some View {
        if entered {
            LobbyRoom()
        } else {
            Form {
                Section("You") {
                    TextField("Name others see", text: $displayName).accessibilityIdentifier("liveName")
                }
                Section {
                    Button(action: go) { Text(goLabel) }
                        .disabled(name.isEmpty || working)
                        .accessibilityIdentifier("liveGo")
                    if working { ProgressView() }
                }
                if let problem { Section { Text(problem).foregroundStyle(D8.vermilion) } }
            }
            .paper()
            .navigationTitle(title)
            .task {
                await langs.load()
                if !name.isEmpty { go() }
            }
        }
    }

    var title: String {
        switch start {
        case .play(let kind, _), .race(let kind, _): kind.title
        case .join(let room): room.game.title
        }
    }

    var goLabel: String {
        switch start {
        case .play: String(localized: "Play live")
        case .race: String(localized: "Start a race and invite")
        case .join: String(localized: "Join")
        }
    }

    func go() {
        guard !working, !name.isEmpty else { return }
        working = true
        problem = nil
        Task {
            defer { working = false }
            do {
                try await enter()
                entered = true
            } catch is NoLanguageSet {
                problem = String(localized: "Start a language set in Learn first.")
            } catch let e as BucketError {
                problem = lobbyProblem(e)
            } catch {
                problem = String(localized: "Something went wrong.")
            }
        }
    }

    func enter() async throws {
        switch start {
        case .join(let room):
            try await lobbies.join(room, displayName: name)
        case .play(let kind, let game):
            await lobbies.refresh()
            if let room = LiveGames.joinable(lobbies.open, games: kind.lobbyGames) {
                try await lobbies.join(room, displayName: name)
            } else {
                try await create(game, listed: true)
            }
        case .race(_, let game):
            try await create(game, listed: false)
        }
    }

    func create(_ game: LobbyGame, listed: Bool) async throws {
        guard let s = langs.systems.first(where: { game.fits($0.targets) }) else {
            throw NoLanguageSet()
        }
        try await lobbies.create(name: String(localized: "\(name)'s lobby"), game: game, root: s.root, targets: s.targets, listed: listed, displayName: name)
    }
}

extension LangStore {
    func recordLobby(_ lobby: Lobby) {
        guard !lobby.game.isRace, LobbyRecords.mark(LiveGames.recordKey(id: lobby.id, startedAt: lobby.startedAt)) else { return }
        let hits = LiveGames.hits(lobby.results, me: lobby.me?.userId)
        let credited = LiveGames.credited(systems, root: lobby.root, targets: lobby.targets)
        GameTally.finished += 1
        for s in credited {
            finishGame(s.id, GameResult(game: "lobby:\(lobby.game.rawValue)", hits: hits, missed: [], countsForGroup: s.id == credited.first?.id))
        }
        Beta.shared.studyEnded("lobby:\(lobby.game.rawValue)", graded: lobby.prompts.count, correct: hits)
    }
}

struct NoLanguageSet: Error {}

@MainActor
enum LobbyRecords {
    static var done: Set<String> = []

    static func mark(_ key: String) -> Bool { done.insert(key).inserted }
}
