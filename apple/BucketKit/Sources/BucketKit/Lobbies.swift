import Foundation
import Observation

public enum LobbyStatus: String, Codable, Sendable {
    case lobby, playing, done
}

public enum LobbyGame: String, Codable, Sendable, CaseIterable, Identifiable {
    case daily, sameWord = "same-word", flags, live
    public var id: String { rawValue }
}

public enum LobbyPromptMode: String, Codable, Sendable {
    case form, flag
}

public struct LobbyPlayer: Codable, Equatable, Sendable, Identifiable {
    public var userId: String
    public var name: String
    public var ready: Bool
    public var score: Int
    public var isHost: Bool
    public var isMe: Bool
    public var online: Bool
    public var answered: Bool
    public var id: String { userId }
}

public struct LobbyMessage: Codable, Equatable, Sendable, Identifiable {
    public var id: Int
    public var from: String
    public var name: String
    public var body: String
    public var at: String
}

public struct LobbyRound: Codable, Equatable, Sendable {
    public var index: Int
    public var startsAt: String
    public var endsAt: String
}

public struct LobbyPrompt: Codable, Equatable, Sendable, Identifiable {
    public var round: Int
    public var mode: LobbyPromptMode
    public var lang: String?
    public var gloss: String
    public var choices: [String]
    public var answer: String?
    public var id: Int { round }
}

public struct LobbyResult: Codable, Equatable, Sendable {
    public var round: Int
    public var userId: String
    public var correct: Bool
    public var ms: Int
    public var points: Int
}

public struct LobbySummary: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var code: String
    public var name: String
    public var game: LobbyGame
    public var root: String
    public var targets: [String]
    public var status: LobbyStatus
    public var players: Int
    public var host: String
    public var isMember: Bool
}

public struct Lobby: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var code: String
    public var name: String
    public var game: LobbyGame
    public var root: String
    public var targets: [String]
    public var seed: String
    public var status: LobbyStatus
    public var listed: Bool
    public var rounds: Int
    public var roundSeconds: Int
    public var startedAt: String?
    public var version: Int
    public var now: String
    public var isHost: Bool
    public var players: [LobbyPlayer]
    public var messages: [LobbyMessage]
    public var round: LobbyRound?
    public var prompts: [LobbyPrompt]
    public var results: [LobbyResult]

    public var me: LobbyPlayer? { players.first { $0.isMe } }
    public var readyCount: Int { players.filter(\.ready).count }
    public var canStart: Bool { isHost && status == .lobby && readyCount >= LobbyRules.minReady }
    public var seedValue: UInt64 { UInt64(seed) ?? GameSeed.hash(seed) }
    public var start: Date? { startedAt.flatMap(parseInstant) }
    public var standings: [LobbyPlayer] { players.sorted { ($0.score, $1.name) > ($1.score, $0.name) } }

    public func results(for round: Int) -> [LobbyResult] { results.filter { $0.round == round } }
    public func prompt(_ round: Int) -> LobbyPrompt? { prompts.first { $0.round == round } }
}

public enum LobbyRules {
    public static let minReady = 2
    public static let cap = 8
    public static let pollSeconds = 1.0
}

public enum LobbyPhase: Equatable, Sendable {
    case waiting
    case countdown(Double)
    case round(index: Int, remaining: Double)
    case finished
}

public enum LobbyClock {
    public static func phase(_ lobby: Lobby, at now: Date) -> LobbyPhase {
        switch lobby.status {
        case .lobby: return .waiting
        case .done: return .finished
        case .playing:
            guard let start = lobby.start else { return .waiting }
            let elapsed = now.timeIntervalSince(start)
            if elapsed < 0 { return .countdown(-elapsed) }
            let len = Double(lobby.roundSeconds)
            let index = Int(elapsed / len)
            if index >= lobby.rounds { return .finished }
            return .round(index: index, remaining: len * Double(index + 1) - elapsed)
        }
    }
}

public struct GuestTicket: Codable, Equatable, Sendable {
    public var token: String
    public var userId: String
    public var expiresAt: String
}

@MainActor
public final class GuestPass {
    let api: BucketAPI
    let defaults: UserDefaults
    public var nickname: () -> String
    var ticket: GuestTicket?
    static let idKey = "polingual.guestId"
    static let ticketKey = "polingual.guestTicket"

    public init(api: BucketAPI, defaults: UserDefaults = .standard, nickname: @escaping () -> String) {
        self.api = api
        self.defaults = defaults
        self.nickname = nickname
        ticket = defaults.data(forKey: Self.ticketKey).flatMap { try? JSONDecoder().decode(GuestTicket.self, from: $0) }
    }

    public var guestId: String {
        if let id = defaults.string(forKey: Self.idKey) { return id }
        let id = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        defaults.set(id, forKey: Self.idKey)
        return id
    }

    public var userId: String? { ticket?.userId }

    public func token(now: Date = Date()) async -> String? {
        let nick = nickname().trimmingCharacters(in: .whitespacesAndNewlines)
        if let t = ticket, let exp = parseInstant(t.expiresAt), exp.timeIntervalSince(now) > 3600 { return t.token }
        guard !nick.isEmpty, let fresh = try? await api.guestTicket(nickname: String(nick.prefix(40)), guestId: guestId) else { return nil }
        ticket = fresh
        defaults.set(try? JSONEncoder().encode(fresh), forKey: Self.ticketKey)
        return fresh.token
    }

    public func merge(into userToken: String) async {
        guard let t = ticket else { return }
        if (try? await api.mergeGuest(token: userToken, guestToken: t.token)) != nil {
            ticket = nil
            defaults.removeObject(forKey: Self.ticketKey)
        }
    }
}

struct LobbyReply: Decodable { let lobby: Lobby }
struct MergeReply: Decodable { let merged: Int }
struct AnswerReply: Decodable {
    let correct: Bool
    let lobby: Lobby
}
struct LobbiesReply: Decodable { let lobbies: [LobbySummary] }
struct LobbyPoll: Decodable {
    let changed: Bool
    let lobby: Lobby?
    let now: String?
}

extension BucketAPI {
    public func guestTicket(nickname: String, guestId: String) async throws -> GuestTicket {
        try await groupCall("api/academy/lobbies/guest", token: nil, body: ["nickname": .text(nickname), "guestId": .text(guestId)])
    }

    public func mergeGuest(token: String, guestToken: String) async throws -> Int {
        let r: MergeReply = try await groupCall("api/academy/lobbies/guest/merge", token: token, body: ["guestToken": .text(guestToken)])
        return r.merged
    }

    public func lobbies(token: String) async throws -> [LobbySummary] {
        let r: LobbiesReply = try await groupCall("api/academy/lobbies", token: token)
        return r.lobbies
    }

    public func createLobby(token: String, name: String, game: LobbyGame = .daily, root: String, targets: [String], rounds: Int, roundSeconds: Int, listed: Bool, displayName: String) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies", token: token, body: [
            "name": .text(name), "game": .text(game.rawValue), "root": .text(root), "targets": .list(targets), "rounds": .number(rounds),
            "roundSeconds": .number(roundSeconds), "listed": .flag(listed), "displayName": .text(displayName),
        ])
        return r.lobby
    }

    public func joinLobby(token: String, code: String? = nil, lobbyId: String? = nil, displayName: String) async throws -> Lobby {
        var body: [String: Field] = ["displayName": .text(displayName)]
        if let code { body["code"] = .text(code) }
        if let lobbyId { body["lobbyId"] = .text(lobbyId) }
        let r: LobbyReply = try await groupCall("api/academy/lobbies/join", token: token, body: body)
        return r.lobby
    }

    public func leaveLobby(token: String, lobbyId: String) async throws {
        let _: Ignored = try await groupCall("api/academy/lobbies/leave", token: token, body: ["lobbyId": .text(lobbyId)])
    }

    public func setReady(token: String, lobbyId: String, ready: Bool) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies/ready", token: token, body: ["lobbyId": .text(lobbyId), "ready": .flag(ready)])
        return r.lobby
    }

    public func startLobby(token: String, lobbyId: String) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies/start", token: token, body: ["lobbyId": .text(lobbyId)])
        return r.lobby
    }

    public func chat(token: String, lobbyId: String, body text: String) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies/chat", token: token, body: ["lobbyId": .text(lobbyId), "body": .text(text)])
        return r.lobby
    }

    public func answer(token: String, lobbyId: String, round: Int, choice: String) async throws -> (correct: Bool, lobby: Lobby) {
        let r: AnswerReply = try await groupCall("api/academy/lobbies/answer", token: token, body: [
            "lobbyId": .text(lobbyId), "round": .number(round), "choice": .text(choice),
        ])
        return (r.correct, r.lobby)
    }

    func lobbyState(token: String, lobbyId: String, since: Int?) async throws -> LobbyPoll {
        var q = ["lobbyId": lobbyId]
        if let since { q["since"] = String(since) }
        return try await groupCall("api/academy/lobbies/state", query: q, token: token)
    }
}

@MainActor
@Observable
public final class LobbyStore {
    public var open: [LobbySummary] = []
    public private(set) var current: Lobby?
    public private(set) var picks: [Int: String] = [:]
    public private(set) var marks: [Int: Bool] = [:]
    public private(set) var busy = false
    public private(set) var error: BucketError?
    public private(set) var offset: TimeInterval = 0

    let api: BucketAPI
    let token: @MainActor () async -> String?
    let clock: @MainActor () -> Date
    public let guest: GuestPass?

    public init(api: BucketAPI, token: @escaping @MainActor () async -> String?, guest: GuestPass? = nil, clock: @escaping @MainActor () -> Date = { Date() }) {
        self.api = api
        self.token = token
        self.guest = guest
        self.clock = clock
    }

    func anyToken() async -> String? {
        if let t = await token() { return t }
        return await guest?.token()
    }

    public func mergeGuest() async {
        guard let guest, let t = await token() else { return }
        await guest.merge(into: t)
    }

    public var now: Date { clock().addingTimeInterval(offset) }

    public var phase: LobbyPhase { current.map { LobbyClock.phase($0, at: now) } ?? .waiting }

    public func refresh() async {
        guard let t = await anyToken() else { return }
        do {
            open = try await api.lobbies(token: t)
            error = nil
        } catch {
            self.error = error as? BucketError ?? .server(0, nil)
        }
    }

    @discardableResult
    public func create(name: String, game: LobbyGame = .daily, root: String, targets: [String], rounds: Int = 8, roundSeconds: Int = 10, listed: Bool = true, displayName: String) async throws(BucketError) -> Lobby {
        enter(try await run { try await self.api.createLobby(token: $0, name: name, game: game, root: root, targets: targets, rounds: rounds, roundSeconds: roundSeconds, listed: listed, displayName: displayName) })
    }

    @discardableResult
    public func join(code: String, displayName: String) async throws(BucketError) -> Lobby {
        enter(try await run { try await self.api.joinLobby(token: $0, code: code, displayName: displayName) })
    }

    @discardableResult
    public func join(_ summary: LobbySummary, displayName: String) async throws(BucketError) -> Lobby {
        enter(try await run { try await self.api.joinLobby(token: $0, lobbyId: summary.id, displayName: displayName) })
    }

    public func leave() async {
        guard let id = current?.id else { return }
        current = nil
        picks = [:]
        marks = [:]
        open.removeAll { $0.id == id }
        if let t = await anyToken() { try? await api.leaveLobby(token: t, lobbyId: id) }
    }

    public func setReady(_ ready: Bool) async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.setReady(token: $0, lobbyId: id, ready: ready) })
    }

    public func start() async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.startLobby(token: $0, lobbyId: id) })
    }

    public func send(_ text: String) async throws(BucketError) {
        let body = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let id = current?.id, !body.isEmpty else { return }
        apply(try await run { try await self.api.chat(token: $0, lobbyId: id, body: String(body.prefix(200))) })
    }

    @discardableResult
    public func pick(_ choice: String, round: Int) async -> Bool? {
        guard let id = current?.id, picks[round] == nil, let t = await anyToken() else { return nil }
        picks[round] = choice
        let r: (correct: Bool, lobby: Lobby)
        do {
            r = try await api.answer(token: t, lobbyId: id, round: round, choice: choice)
        } catch {
            if (error as? BucketError) != .server(409, "already_answered") { picks[round] = nil }
            return nil
        }
        marks[round] = r.correct
        apply(r.lobby)
        return r.correct
    }

    public func poll() async {
        guard let lobby = current, let t = await anyToken() else { return }
        do {
            let r = try await api.lobbyState(token: t, lobbyId: lobby.id, since: lobby.version)
            if let s = r.now.flatMap(parseInstant) { sync(s) }
            if r.changed, let fresh = r.lobby, fresh.id == current?.id { apply(fresh) }
            error = nil
        } catch let e as BucketError {
            if e == .groupNotFound { current = nil }
            error = e
        } catch {
            self.error = .server(0, nil)
        }
    }

    public func follow() async {
        while !Task.isCancelled, current != nil {
            await poll()
            try? await Task.sleep(for: .seconds(LobbyRules.pollSeconds))
        }
    }

    func enter(_ lobby: Lobby) -> Lobby {
        picks = [:]
        marks = [:]
        current = nil
        apply(lobby)
        return lobby
    }

    func apply(_ lobby: Lobby) {
        if let s = parseInstant(lobby.now) { sync(s) }
        current = lobby
    }

    func sync(_ server: Date) {
        offset = server.timeIntervalSince(clock())
    }

    func run<T>(_ work: @escaping (String) async throws -> T) async throws(BucketError) -> T {
        busy = true
        defer { busy = false }
        guard let t = await anyToken() else { throw .revoked }
        do { return try await work(t) } catch {
            let e = error as? BucketError ?? .server(0, nil)
            self.error = e
            throw e
        }
    }
}
