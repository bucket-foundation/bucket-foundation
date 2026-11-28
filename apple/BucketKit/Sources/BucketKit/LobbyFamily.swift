import Foundation

public enum FamilyNight {
    public struct Step: Equatable, Sendable {
        public var game: LobbyGame
        public var label: String
    }

    public static let steps: [Step] = [
        Step(game: .daily, label: "Warm Up"),
        Step(game: .tiles, label: "Picture Race"),
        Step(game: .sameWord, label: "Final"),
    ]
    public static let games = steps.map(\.game)
    public static let breakSeconds = 150.0
    public static let atlasClips = 5
    public static let atlasSlotSeconds = 12.0
    public static let foreheadSeconds = 90.0
    public static let foreheadCardSeconds = 15.0
    public static let stealPoints = 100
}

public struct NightRound: Equatable, Sendable {
    public var index: Int
    public var label: String
    public var final: Bool
    public var total: Int
}

public enum FamilyInterlude: Equatable, Sendable {
    case voiceAtlas(clip: Int, endsAt: Date)
    case familyTeach
    case forehead(card: Int, endsAt: Date)
    case ourTrivia
}

public extension Lobby {
    var nightRound: NightRound? {
        let list = playlist ?? []
        guard setup != .mix, list == FamilyNight.games, let index = list.firstIndex(of: game) else { return nil }
        return NightRound(index: index, label: FamilyNight.steps[index].label, final: index == FamilyNight.steps.count - 1, total: FamilyNight.steps.count)
    }

    var breakSeconds: Double {
        if let night = nightRound, !night.final { return FamilyNight.breakSeconds }
        return LobbyRules.nextGameSeconds
    }

    var gameEnd: Date? { start?.addingTimeInterval(playSeconds) }

    var nextGameAt: Date? {
        guard status == .done, !isClosed else { return nil }
        return nextStart ?? gameEnd?.addingTimeInterval(breakSeconds)
    }

    func nextGameRemaining(at now: Date) -> Int? {
        nextGameAt.map { max(0, Int($0.timeIntervalSince(now).rounded(.up))) }
    }

    func interlude(at now: Date) -> FamilyInterlude? {
        guard status == .done, !isClosed, let end = gameEnd, let night = nightRound, !night.final else { return nil }
        let since = now.timeIntervalSince(end)
        guard since >= 0 else { return nil }
        if night.index == 0 {
            let clip = Int(since / FamilyNight.atlasSlotSeconds)
            guard clip < FamilyNight.atlasClips else { return .familyTeach }
            return .voiceAtlas(clip: clip, endsAt: end.addingTimeInterval(Double(clip + 1) * FamilyNight.atlasSlotSeconds))
        }
        if since >= FamilyNight.foreheadSeconds { return .ourTrivia }
        let card = Int(since / FamilyNight.foreheadCardSeconds)
        return .forehead(card: card, endsAt: end.addingTimeInterval(Double(card + 1) * FamilyNight.foreheadCardSeconds))
    }

    func bonusQuestion(_ round: Int) -> Bool {
        status == .playing && nightRound?.final == true && round == rounds - 1
    }

    func foreheadHolder(_ card: Int) -> LobbyPlayer? {
        let humans = players.filter { !$0.isBot }.sorted { $0.userId < $1.userId }
        return humans.isEmpty ? nil : humans[card % humans.count]
    }

    var canAnswerTrivia: Bool { seated && !isHost }

    func bonusTally(_ round: Int) -> BonusTally? { bonusVotes?.first { $0.round == round } }

    var foreheadSeed: String { seed + String((startedAt ?? "").filter(\.isNumber).suffix(6)) }
}

public enum SeatBand: String, Codable, Sendable, CaseIterable, Identifiable {
    case under13, teen, adult
    public var id: String { rawValue }

    public init(from decoder: Decoder) throws {
        self = SeatBand(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .under13
    }

    public var keepsData: Bool { self != .under13 }
    public var label: String {
        switch self {
        case .under13: "Under 13"
        case .teen: "13 to 17"
        case .adult: "18 and over"
        }
    }
}

public struct SpokenLang: Codable, Equatable, Sendable, Identifiable {
    public var lang: String
    public var level: Int
    public var reads: Bool?
    public var id: String { lang }

    public init(lang: String, level: Int, reads: Bool? = nil) {
        self.lang = lang
        self.level = level
        self.reads = reads
    }
}

public struct FamilyCard: Codable, Equatable, Sendable {
    public static let maxSpeak = 6
    public static let maxLearn = 3
    public static let levels: [(level: Int, face: String, label: String)] = [(1, "🙂", "A few words"), (2, "😀", "I get by"), (3, "😎", "Fluent"), (4, "🏠", "Home language")]

    public var band: SeatBand
    public var nickname: String
    public var speaks: [SpokenLang]
    public var learn: [String]
    public var surprise: Bool

    public init(band: SeatBand = .adult, nickname: String = "", speaks: [SpokenLang] = [], learn: [String] = [], surprise: Bool = false) {
        self.band = band
        self.nickname = nickname
        self.speaks = speaks
        self.learn = learn
        self.surprise = surprise
    }

    public var ready: Bool { nickname.count >= 2 && !speaks.isEmpty && (surprise || !learn.isEmpty) }

    public func speaks(_ lang: String) -> Bool { speaks.contains { $0.lang == lang } }

    public mutating func toggleSpeak(_ lang: String) {
        if speaks(lang) {
            speaks.removeAll { $0.lang == lang }
            return
        }
        guard speaks.count < Self.maxSpeak else { return }
        speaks.append(SpokenLang(lang: lang, level: 2))
        learn.removeAll { $0 == lang }
    }

    public mutating func setLevel(_ lang: String, _ level: Int) {
        guard (1...4).contains(level), let i = speaks.firstIndex(where: { $0.lang == lang }) else { return }
        speaks[i] = SpokenLang(lang: lang, level: level, reads: level == 4 ? (speaks[i].reads ?? true) : nil)
    }

    public mutating func toggleLearn(_ lang: String) {
        if learn.contains(lang) {
            learn.removeAll { $0 == lang }
            return
        }
        guard learn.count < Self.maxLearn, !speaks(lang) else { return }
        learn.append(lang)
        surprise = false
    }

    public mutating func setSurprise(_ on: Bool) {
        surprise = on
        if on { learn = [] }
    }

    var cardField: Field {
        .object([
            "band": .text(band.rawValue),
            "speaks": .items(speaks.map { s in
                var o: [String: Field] = ["lang": .text(s.lang), "level": .number(s.level)]
                if let r = s.reads { o["reads"] = .flag(r) }
                return .object(o)
            }),
            "learn": .list(learn),
            "surprise": .flag(surprise),
        ])
    }

    public func recordRefusal(lang: String) -> String? {
        guard band == .adult else { return "not_adult" }
        return speaks.contains { $0.lang == lang && $0.level == 4 } ? nil : "not_home_language"
    }

    public var homeLanguages: [String] { band == .adult ? speaks.filter { $0.level == 4 }.map(\.lang) : [] }

    func body(lobbyId: String) -> [String: Field] {
        band.keepsData ? ["lobbyId": .text(lobbyId), "card": cardField] : ["lobbyId": .text(lobbyId), "band": .text(band.rawValue)]
    }
}

public struct SeatCard: Codable, Equatable, Sendable {
    public struct Card: Codable, Equatable, Sendable {
        public var speaks: [SpokenLang]
        public var learn: [String]
        public var surprise: Bool?
    }
    public var userId: String
    public var card: Card
}

public struct SeatCards: Decodable, Equatable, Sendable {
    public var cards: [SeatCard]
    public var share: Bool
}

public enum TeachStatus: String, Codable, Sendable {
    case asked, approved, ready, open, done, skipped, reported, other

    public init(from decoder: Decoder) throws {
        self = TeachStatus(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .other
    }
}

public struct TeachView: Codable, Equatable, Sendable {
    public var round: Int
    public var speakerId: String
    public var status: TeachStatus
    public var lang: String?
    public var choices: [String]
    public var answer: Int?
    public var clip: String?
    public var myGuess: Int?
    public var guessed: Int
    public var teacherAward: Bool?
}

public enum TeachAction: String, Sendable {
    case ask, approve, record, play, guess, reveal, skip, report
}

public struct TriviaQuestion: Codable, Equatable, Sendable {
    public var prompt: String
    public var choices: [String]
    public var answer: Int

    public init(prompt: String = "", choices: [String] = ["", ""], answer: Int = 0) {
        self.prompt = prompt
        self.choices = choices
        self.answer = answer
    }

    public var valid: Bool {
        let c = choices.map { $0.trimmingCharacters(in: .whitespaces) }
        return !prompt.trimmingCharacters(in: .whitespaces).isEmpty && (2...4).contains(c.count) && !c.contains("") && Set(c.map { $0.lowercased() }).count == c.count && c.indices.contains(answer)
    }

    var field: Field { .object(["prompt": .text(prompt), "choices": .list(choices), "answer": .number(answer)]) }
}

public struct TriviaView: Codable, Equatable, Sendable {
    public var count: Int
    public var current: Int
    public var open: Bool
    public var prompt: String?
    public var choices: [String]
    public var answer: Int?
    public var myPick: Int?
    public var picked: Int
    public var questions: [TriviaQuestion]?
    public var scores: [String: Int]
}

public enum TriviaAction: String, Sendable {
    case save, open, answer, reveal
}

public struct LeagueBoard: Codable, Equatable, Sendable {
    public struct Row: Codable, Equatable, Sendable {
        public var rank: Int
        public var name: String
        public var points: Int
        public var me: Bool
    }
    public var week: String
    public var tier: Int
    public var tierName: String
    public var board: [Row]

    public func nearMe(span: Int = 2) -> [Row] {
        guard let i = board.firstIndex(where: \.me) else { return Array(board.prefix(5)) }
        return Array(board[max(0, i - span)...min(board.count - 1, i + span)])
    }

    public static func eligible(_ band: SeatBand?, signedIn: Bool) -> Bool { signedIn && (band == .teen || band == .adult) }
}

public struct AtlasClip: Codable, Equatable, Sendable {
    public var clip: Int
    public var form: String
    public var licence: ClipLicence?
    public var lang: String?
    public var meaning: String?
}

public struct ForeheadWord: Codable, Equatable, Sendable {
    public var lang: String
    public var form: String
    public var meaning: String
}

public enum BonusRefusal: Equatable, Sendable {
    case alreadyAnswered, closed, retry, other

    public init(_ e: BucketError) {
        switch e {
        case .server(409, "already_answered"): self = .alreadyAnswered
        case .server(409, "wrong_round"), .server(404, _): self = .closed
        case .server(503, _), .server(0, _), .server(408, _), .server(429, _): self = .retry
        default: self = .other
        }
    }
}

public struct AtlasBonus: Decodable, Equatable, Sendable {
    public var points: Int
    public var km: Int
}

public enum LobbyReaction {
    public static let all = ["👏", "😂", "😮", "❤️", "🔥", "🎉", "🤔", "👀"]
}

struct TeachReply: Decodable { let teach: TeachView? }
struct TriviaReply: Decodable { let trivia: TriviaView? }
struct AtlasReply: Decodable { let rounds: [AtlasClip] }
struct ForeheadReply: Decodable { let cards: [ForeheadWord] }
struct LeagueAdd: Decodable { let added: Int }

extension BucketAPI {
    func lobbyAct(_ route: String, token: String, lobbyId: String, extra: [String: Field] = [:]) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies/\(route)", token: token, body: extra.merging(["lobbyId": .text(lobbyId)]) { a, _ in a }, headers: LobbyRules.clientHeaders)
        return r.lobby
    }

    public func nextGame(token: String, lobbyId: String) async throws -> Lobby { try await lobbyAct("next", token: token, lobbyId: lobbyId) }
    public func endLobby(token: String, lobbyId: String) async throws -> Lobby { try await lobbyAct("end", token: token, lobbyId: lobbyId) }
    public func fillBots(token: String, lobbyId: String) async throws -> Lobby { try await lobbyAct("bots", token: token, lobbyId: lobbyId) }

    public func lobbySettings(token: String, lobbyId: String, setup: LobbySetup, game: LobbyGame? = nil, games: [LobbyGame] = [], targets: [String]? = nil) async throws -> Lobby {
        var body: [String: Field] = ["setup": .text(setup.rawValue)]
        if let game { body["game"] = .text(game.rawValue) }
        if setup == .sequence { body["games"] = .list(games.map(\.rawValue)) }
        if let targets { body["targets"] = .list(targets) }
        return try await lobbyAct("settings", token: token, lobbyId: lobbyId, extra: body)
    }

    public func guestsWatch(token: String, lobbyId: String, on: Bool) async throws -> Lobby {
        try await lobbyAct("settings", token: token, lobbyId: lobbyId, extra: ["guestsWatch": .flag(on)])
    }

    public func watchLobby(token: String, code: String, displayName: String) async throws -> Lobby {
        let r: LobbyReply = try await groupCall("api/academy/lobbies/join", token: token, body: ["code": .text(code), "displayName": .text(displayName), "audience": .flag(true)], headers: LobbyRules.clientHeaders)
        return r.lobby
    }

    public func react(token: String, lobbyId: String, emoji: String) async throws {
        let _: Ignored = try await groupCall("api/academy/lobbies/react", token: token, body: ["lobbyId": .text(lobbyId), "emoji": .text(emoji)])
    }

    public func bonusVote(token: String, lobbyId: String, round: Int, choice: String) async throws {
        let _: Ignored = try await groupCall("api/academy/lobbies/react", token: token, body: ["lobbyId": .text(lobbyId), "round": .number(round), "choice": .text(choice)])
    }

    public func atlasGuess(token: String, lobbyId: String, clip: Int, lat: Double, lon: Double) async throws -> AtlasBonus {
        try await groupCall("api/academy/lobbies/bonus", token: token, body: ["kind": .text("atlas"), "lobbyId": .text(lobbyId), "clip": .number(clip), "lat": .decimal(lat), "lon": .decimal(lon)])
    }

    public func foreheadMark(token: String, lobbyId: String, card: Int, got: Bool) async throws {
        let _: Ignored = try await groupCall("api/academy/lobbies/bonus", token: token, body: ["kind": .text("forehead"), "lobbyId": .text(lobbyId), "card": .number(card), "got": .flag(got)])
    }

    public func atlasClips(token: String, lobbyId: String) async throws -> [AtlasClip] {
        let r: AtlasReply = try await groupCall("api/academy/lobbies/atlas", query: ["lobbyId": lobbyId], token: token, headers: LobbyRules.clientHeaders)
        return r.rounds
    }

    public func foreheadDeck(langs: [String], seed: String, root: String) async throws -> [ForeheadWord] {
        let r: ForeheadReply = try await groupCall("api/academy/forehead", query: ["langs": langs.joined(separator: ","), "seed": seed, "root": root], token: nil)
        return r.cards
    }

    public func sendCard(token: String, lobbyId: String, card: FamilyCard) async throws {
        let _: Ignored = try await groupCall("api/academy/lobby-cards", token: token, body: card.body(lobbyId: lobbyId))
    }

    public func seatCards(token: String, lobbyId: String) async throws -> SeatCards {
        try await groupCall("api/academy/lobby-cards", query: ["lobby": lobbyId], token: token)
    }

    public func teach(token: String, lobbyId: String) async throws -> TeachView? {
        let r: TeachReply = try await groupCall("api/academy/lobby-teach", query: ["lobby": lobbyId], token: token)
        return r.teach
    }

    public func teachAct(token: String, lobbyId: String, action: TeachAction, speakerId: String? = nil, lang: String? = nil, clip: String? = nil, choices: [String]? = nil, answer: Int? = nil, guess: Int? = nil) async throws {
        var extra: [String: Field] = [:]
        if let speakerId { extra["speakerId"] = .text(speakerId) }
        if let lang { extra["lang"] = .text(lang) }
        if let clip { extra["clip"] = .text(clip) }
        if let choices { extra["choices"] = .list(choices) }
        if let answer { extra["answer"] = .number(answer) }
        if let guess { extra["guess"] = .number(guess) }
        let _: Ignored = try await groupCall("api/academy/lobby-teach", token: token, body: extra.merging(["lobbyId": .text(lobbyId), "action": .text(action.rawValue)]) { a, _ in a })
    }

    public func trivia(token: String, lobbyId: String) async throws -> TriviaView? {
        let r: TriviaReply = try await groupCall("api/academy/lobby-trivia", query: ["lobby": lobbyId], token: token)
        return r.trivia
    }

    public func triviaAct(token: String, lobbyId: String, action: TriviaAction, index: Int? = nil, pick: Int? = nil, questions: [TriviaQuestion]? = nil) async throws {
        var body: [String: Field] = ["lobbyId": .text(lobbyId), "action": .text(action.rawValue)]
        if let index { body["index"] = .number(index) }
        if let pick { body["pick"] = .number(pick) }
        if let questions { body["questions"] = .items(questions.map(\.field)) }
        let _: Ignored = try await groupCall("api/academy/lobby-trivia", token: token, body: body)
    }

    public func league(token: String) async throws -> LeagueBoard {
        try await groupCall("api/academy/league", token: token)
    }

    public func claimLeague(token: String, lobbyId: String) async throws -> Int {
        let r: LeagueAdd = try await groupCall("api/academy/league", token: token, body: ["lobbyId": .text(lobbyId)])
        return r.added
    }
}

public extension LobbyStore {
    func nextGame() async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.nextGame(token: $0, lobbyId: id) })
    }

    func closeLobby() async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.endLobby(token: $0, lobbyId: id) })
    }

    func fillBots() async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.fillBots(token: $0, lobbyId: id) })
    }

    func settings(setup: LobbySetup, game: LobbyGame? = nil, games: [LobbyGame] = []) async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.lobbySettings(token: $0, lobbyId: id, setup: setup, game: game, games: games) })
    }

    func familyNight() async throws(BucketError) {
        try await settings(setup: .sequence, games: FamilyNight.games)
    }

    func guestsWatch(_ on: Bool) async throws(BucketError) {
        guard let id = current?.id else { return }
        apply(try await run { try await self.api.guestsWatch(token: $0, lobbyId: id, on: on) })
    }

    @discardableResult
    func watch(code: String, displayName: String) async throws(BucketError) -> Lobby {
        enter(try await run { try await self.api.watchLobby(token: $0, code: code, displayName: displayName) })
    }

    func vote(_ choice: String, round: Int) async throws(BucketError) {
        guard let id = current?.id else { return }
        try await run { try await self.api.bonusVote(token: $0, lobbyId: id, round: round, choice: choice) }
    }

    func react(_ emoji: String) async {
        guard let id = current?.id, let t = await anyToken() else { return }
        try? await api.react(token: t, lobbyId: id, emoji: emoji)
    }

    func sendCard(_ card: FamilyCard) async throws(BucketError) {
        guard let id = current?.id else { return }
        try await run { try await self.api.sendCard(token: $0, lobbyId: id, card: card) }
    }

    func foreheadDeck(_ lobby: Lobby) async -> [ForeheadWord] {
        (try? await api.foreheadDeck(langs: lobby.targets, seed: lobby.foreheadSeed, root: lobby.root)) ?? []
    }

    func withToken<T>(_ work: @escaping (BucketAPI, String) async throws -> T) async throws(BucketError) -> T {
        try await run { try await work(self.api, $0) }
    }
}
