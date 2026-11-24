import Foundation
import Observation

public enum LobbyStatus: String, Codable, Sendable {
    case lobby, playing, done
}

public enum LobbyGame: String, Codable, Sendable, CaseIterable, Identifiable {
    case daily, sameWord = "same-word", flags, live, tiles, duel, spy
    case mini, wordGroups = "word-groups", match, voice, letters, polyword, flagTiles = "flag-tiles"
    case babel, shift, snake, atlas, forehead, ispy, flagDuel = "flag-duel"
    case other
    public var id: String { rawValue }
    public static let hostable: [LobbyGame] = [.daily, .sameWord, .flags, .live, .tiles]
    public static let race: [LobbyGame] = [.mini, .wordGroups, .match, .voice, .letters, .polyword, .flagTiles, .babel, .shift, .snake, .atlas, .forehead, .ispy, .flagDuel]
    public var isRace: Bool { Self.race.contains(self) }

    public init(from decoder: Decoder) throws {
        self = LobbyGame(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .other
    }
}

public enum LobbyPromptMode: String, Codable, Sendable {
    case form, flag, tiles, mixed, meaning, spy, other

    public var choosesText: Bool { self == .form || self == .mixed || self == .meaning }

    public init(from decoder: Decoder) throws {
        self = LobbyPromptMode(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .other
    }
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
    public var reveal: Bool?
}

public struct LobbyPrompt: Codable, Equatable, Sendable, Identifiable {
    public var round: Int
    public var mode: LobbyPromptMode
    public var lang: String?
    public var gloss: String
    public var choices: [String]
    public var answer: String?
    public var reveal: [LobbyRevealEntry]?
    public var id: Int { round }

    public var revealOrdered: [LobbyRevealEntry] {
        let all = reveal ?? []
        return all.filter(\.correct) + all.filter { !$0.correct }
    }

    public func label(_ choice: String) -> LobbyChoiceLabel {
        switch mode {
        case .flag: return LobbyChoiceLabel(word: nil, lang: choice)
        case .meaning, .spy: return LobbyChoiceLabel(word: choice, lang: nil)
        case .mixed:
            let t = LobbyTile(key: choice)
            return LobbyChoiceLabel(word: t.form, lang: t.lang.isEmpty ? nil : t.lang)
        default: return LobbyChoiceLabel(word: choice, lang: lang)
        }
    }
}

public struct LobbyRevealEntry: Codable, Equatable, Sendable {
    public var lang: String
    public var word: String
    public var roman: String?
    public var meaning: String
    public var gloss: String?
    public var correct: Bool
}

public struct LobbyChoiceLabel: Equatable, Sendable {
    public var word: String?
    public var lang: String?
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
    public var revealSeconds: Int?
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
    public var standings: [LobbyPlayer] {
        guard game.isRace else { return players.sorted { ($0.score, $1.name) > ($1.score, $0.name) } }
        let ms = Dictionary(results.map { ($0.userId, $0.ms) }, uniquingKeysWith: { a, _ in a })
        return players.sorted { ($0.score, ms[$1.userId] ?? .max, $1.name) > ($1.score, ms[$0.userId] ?? .max, $0.name) }
    }
    public var revealGap: Double { Double(max(0, revealSeconds ?? 0)) }
    public var slotSeconds: Double { Double(roundSeconds) + revealGap }
    public var playSeconds: Double { Double(rounds * roundSeconds) + Double(max(0, rounds - 1)) * revealGap }

    public func results(for round: Int) -> [LobbyResult] { results.filter { $0.round == round } }
    public func raceRemaining(at now: Date) -> Double {
        guard let start else { return 0 }
        return max(0, playSeconds - now.timeIntervalSince(start))
    }
    public var raceFinishers: Set<String> { Set(results.map(\.userId)) }
    public func prompt(_ round: Int) -> LobbyPrompt? { prompts.first { $0.round == round } }
}

public enum LobbyRules {
    public static let minReady = 2
    public static let cap = 8
    public static let pollSeconds = 1.0
    public static let raceHeader = ["x-polingual-race": "1"]
    public static let raceScoreMax = 100_000

    public static let retryableRefusals: Set<Int> = [408, 425, 429]

    public static func scoreRefusalIsFinal(_ status: Int) -> Bool {
        (400..<500).contains(status) && !retryableRefusals.contains(status)
    }

    public static func raceScore(points: Int?, hits: Int) -> Int {
        min(max(0, points ?? hits * 100), raceScoreMax)
    }
}

public enum LobbyRaceSeed {
    public static func dayKey(_ seed: UInt64) -> String { "race-\(seed)" }
    public static func dayNumber(_ seed: UInt64) -> Int { 1_000_000 + Int(seed % 1_000_000) }
    public static func deal(_ seed: UInt64) -> String { String(1 + seed % 1_000_000_000_000) }
    public static func deckDay(_ seed: UInt64?, now: Date = Date()) -> String { seed.map(dayKey) ?? PlayDecks.deckDay(now) }
}

public enum LobbyRacePool {
    public static let spareTargets = ["es", "fr", "de"]

    public static func system(id: String, root: String, targets: [String]) -> LangSystem {
        var seen: Set<String> = [root]
        let own = targets.filter { seen.insert($0).inserted }
        return LangSystem(id: "race-\(id)", name: "", root: root, targets: own.isEmpty ? spareTargets.filter { $0 != root } : own, createdAt: 0)
    }

    public static func words(_ system: LangSystem, corpus: LangCorpus) -> [GameWord] {
        GameWords.starter([system], corpus: corpus)
    }
}

public extension Lobby {
    var raceSystem: LangSystem { LobbyRacePool.system(id: id, root: root, targets: targets) }
}

public struct RaceRandom: RandomNumberGenerator, Sendable {
    var seeded: SeededRandom?
    var system = SystemRandomNumberGenerator()

    public init(seed: UInt64?) { seeded = seed.map(SeededRandom.init(seed:)) }

    public mutating func next() -> UInt64 { seeded?.next() ?? system.next() }
}

@MainActor
public final class LobbyRaceGate {
    public final class Hold {
        public init() {}
    }

    private weak var hold: Hold?

    public init() {}

    public var isOpen: Bool { hold != nil }

    public func open(_ hold: Hold) { self.hold = hold }
}

public enum LobbyPhase: Equatable, Sendable {
    case waiting
    case countdown(Double)
    case round(index: Int, remaining: Double)
    case reveal(index: Int, remaining: Double)
    case finished

    public var playing: Bool {
        switch self {
        case .round, .reveal: true
        default: false
        }
    }
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
            if elapsed >= lobby.playSeconds || lobby.slotSeconds <= 0 { return .finished }
            let len = Double(lobby.roundSeconds)
            let index = Int(elapsed / lobby.slotSeconds)
            if index >= lobby.rounds { return .finished }
            let into = elapsed - Double(index) * lobby.slotSeconds
            if into >= len { return .reveal(index: index, remaining: lobby.slotSeconds - into) }
            return .round(index: index, remaining: len - into)
        }
    }
}

public struct LobbyTile: Equatable, Sendable {
    public var lang: String
    public var form: String

    public init(key: String) {
        if let i = key.firstIndex(of: ":") {
            lang = String(key[..<i])
            form = String(key[key.index(after: i)...])
        } else {
            lang = ""
            form = key
        }
    }
}

public enum LobbyTilePicks {
    public static let submitAt = 0.9

    public static func tiles(_ prompt: LobbyPrompt) -> [LobbyTile] { prompt.choices.map(LobbyTile.init(key:)) }

    public static func choice(_ tapped: Set<Int>) -> String {
        tapped.isEmpty ? "-" : tapped.sorted().map(String.init).joined(separator: ",")
    }

    public static func answer(_ prompt: LobbyPrompt) -> Set<Int>? {
        guard let a = prompt.answer else { return nil }
        if a.isEmpty || a == "-" { return [] }
        return Set(a.split(separator: ",").compactMap { Int($0) })
    }

    public static func submitDue(remaining: Double, roundSeconds: Int) -> Bool {
        remaining <= Double(roundSeconds) * (1 - submitAt)
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
struct LobbiesReply: Decodable {
    let lobbies: [LobbySummary]
    let race: [LobbyGame]?
}
struct ScoreReply: Decodable {
    let score: Int
    let lobby: Lobby
}
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
        try await lobbyList(token: token).lobbies
    }

    func lobbyList(token: String) async throws -> LobbiesReply {
        try await groupCall("api/academy/lobbies", token: token, headers: LobbyRules.raceHeader)
    }

    public func raceScore(token: String, lobbyId: String, score: Int) async throws -> Lobby {
        let r: ScoreReply = try await groupCall("api/academy/lobbies/score", token: token, body: ["lobbyId": .text(lobbyId), "score": .number(score)])
        return r.lobby
    }

    public func createLobby(token: String, name: String, game: LobbyGame = .daily, root: String, targets: [String], rounds: Int, roundSeconds: Int, listed: Bool, displayName: String) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies", token: token, body: [
            "name": .text(name), "game": .text(game.rawValue), "root": .text(root), "targets": .list(targets), "rounds": .number(rounds),
            "roundSeconds": .number(roundSeconds), "listed": .flag(listed), "displayName": .text(displayName),
        ], headers: LobbyRules.raceHeader)
        return r.lobby
    }

    public func joinLobby(token: String, code: String? = nil, lobbyId: String? = nil, displayName: String) async throws -> Lobby {
        var body: [String: Field] = ["displayName": .text(displayName)]
        if let code { body["code"] = .text(code) }
        if let lobbyId { body["lobbyId"] = .text(lobbyId) }
        let r: LobbyReply = try await groupCall("api/academy/lobbies/join", token: token, body: body, headers: LobbyRules.raceHeader)
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
    public private(set) var staged = false
    public private(set) var raceGames: [LobbyGame] = []
    public private(set) var raceScore: Int?
    public private(set) var raceScoreSent = false

    public var hostable: [LobbyGame] { LobbyGame.hostable + raceGames.filter(\.isRace) }

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
            let list = try await api.lobbyList(token: t)
            open = list.lobbies
            raceGames = list.race ?? []
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
        if staged {
            staged = false
            picks = [:]
            marks = [:]
            return
        }
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

    @discardableResult
    public func postScore(_ score: Int) async -> Bool {
        guard let lobby = current, lobby.game.isRace, lobby.status == .playing, raceScore == nil else { return false }
        raceScore = score
        raceScoreSent = false
        return await sendScore()
    }

    @discardableResult
    func sendScore() async -> Bool {
        guard !staged, let lobby = current, lobby.game.isRace, lobby.status == .playing, let score = raceScore, !raceScoreSent, let t = await anyToken() else { return false }
        do {
            let fresh = try await api.raceScore(token: t, lobbyId: lobby.id, score: score)
            raceScoreSent = true
            if fresh.id == current?.id { apply(fresh) }
            return true
        } catch {
            if let e = error as? BucketError, case .server(let status, _) = e, LobbyRules.scoreRefusalIsFinal(status) { raceScoreSent = true }
            return false
        }
    }

    public func poll() async {
        guard !staged, let lobby = current, let t = await anyToken() else { return }
        await sendScore()
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

    #if DEBUG
    public func stage(players: Int, mode: LobbyPromptMode = .form, race: LobbyGame? = nil) {
        staged = true
        picks = [:]
        marks = [:]
        clearRaceScore()
        current = Lobby.staged(players: players, mode: mode, race: race, now: now)
    }
    #endif

    func enter(_ lobby: Lobby) -> Lobby {
        picks = [:]
        marks = [:]
        clearRaceScore()
        current = nil
        apply(lobby)
        return lobby
    }

    func apply(_ lobby: Lobby) {
        if let s = parseInstant(lobby.now) { sync(s) }
        if lobby.status == .lobby { clearRaceScore() }
        current = lobby
    }

    func clearRaceScore() {
        raceScore = nil
        raceScoreSent = false
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

#if DEBUG
extension Lobby {
    static let stagedNames = ["Alexandria", "Maximilian", "Bernadette", "Christopher", "Evangeline", "Sebastian", "Wilhelmina", "Bartholomew"]

    static func staged(players: Int, mode: LobbyPromptMode, race: LobbyGame? = nil, now: Date) -> Lobby {
        let count = min(max(players, 1), LobbyRules.cap)
        let stamp = ISO8601DateFormatter()
        let seconds = 600
        let people = (0..<count).map { n in
            LobbyPlayer(userId: "staged-\(n)", name: stagedNames[n], ready: true, score: (count - n) * 120, isHost: n == 0, isMe: n == 0, online: true, answered: n % 2 == 1)
        }
        let tiles = ["es:agua", "fr:eau", "it:acqua", "pt:água", "de:Wasser", "nl:water", "es:fuego", "fr:feu", "it:fuoco", "pt:fogo", "de:Feuer", "nl:vuur"]
        let words = ["mariposa", "mantequilla", "marinero", "mariscos"]
        let prompts = (0..<2).map { r in
            mode == .tiles
                ? LobbyPrompt(round: r, mode: .tiles, lang: nil, gloss: "water", choices: tiles, answer: r == 0 ? "0,1,2,3,4,5" : nil, reveal: nil)
                : LobbyPrompt(round: r, mode: mode, lang: "es", gloss: "the butterfly", choices: words, answer: r == 0 ? words[0] : nil, reveal: nil)
        }
        let results = people.enumerated().filter { $0.offset != count - 1 }.map { n, p in
            LobbyResult(round: 0, userId: p.userId, correct: n % 3 != 2, ms: 1200 + n * 400, points: n % 3 != 2 ? 120 - n * 10 : 0)
        }
        let start = now.addingTimeInterval(-Double(seconds) - 5)
        return Lobby(
            id: "staged", code: "STAGED", name: "Staged lobby", game: race.flatMap { $0.isRace ? $0 : nil } ?? (mode == .tiles ? .tiles : .daily), root: "en", targets: ["es", "fr", "it", "pt", "de", "nl"],
            seed: "staged", status: .playing, listed: false, rounds: 8, roundSeconds: seconds, revealSeconds: 0, startedAt: stamp.string(from: start),
            version: 1, now: stamp.string(from: now), isHost: true, players: people, messages: [],
            round: LobbyRound(index: 1, startsAt: stamp.string(from: now.addingTimeInterval(-5)), endsAt: stamp.string(from: now.addingTimeInterval(Double(seconds) - 5)), reveal: false),
            prompts: prompts, results: results
        )
    }
}
#endif
