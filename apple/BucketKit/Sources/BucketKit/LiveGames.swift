import Foundation

public enum LiveGames {
    public static func lobbyGames(forGame kind: String) -> [LobbyGame] {
        switch kind {
        case "daily": [.daily]
        case "same": [.sameWord]
        case "flags": [.flags]
        case "tiles": [.tiles]
        case "duel": [.flagDuel, .duel]
        case "ispy": [.ispy, .spy]
        default: LobbyGame.race.filter { $0.rawValue.replacingOccurrences(of: "-", with: "").lowercased() == kind.lowercased() }
        }
    }

    public static func hosted(forGame kind: String, hostable: [LobbyGame]) -> LobbyGame? {
        lobbyGames(forGame: kind).first { hostable.contains($0) }
    }

    public static func liveNow(_ open: [LobbySummary]) -> [LobbySummary] {
        open.filter { $0.status != .done && $0.players > 0 }
            .sorted { ($0.status == .lobby ? 0 : 1, -$0.players, $0.name) < ($1.status == .lobby ? 0 : 1, -$1.players, $1.name) }
    }

    public static func joinable(_ open: [LobbySummary], games: [LobbyGame]) -> LobbySummary? {
        if let mine = open.first(where: { $0.isMember && games.contains($0.game) && $0.status != .done }) { return mine }
        return open.filter { games.contains($0.game) && $0.status == .lobby && $0.players < LobbyRules.cap }
            .max { $0.players < $1.players }
    }

    public static func players(_ open: [LobbySummary], games: [LobbyGame]) -> Int {
        open.filter { games.contains($0.game) && $0.status != .done }.reduce(0) { $0 + $1.players }
    }

    public static func credited(_ systems: [LangSystem], root: String, targets: [String]) -> [LangSystem] {
        systems.filter { $0.root == root && !Set($0.targets).isDisjoint(with: targets) }
    }

    public static func hits(_ results: [LobbyResult], me: String?) -> Int {
        guard let me else { return 0 }
        return results.filter { $0.userId == me && $0.correct }.count
    }

    public static func recordKey(id: String, startedAt: String?) -> String { "\(id)#\(startedAt ?? "")" }
}
