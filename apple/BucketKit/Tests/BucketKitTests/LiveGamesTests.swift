import Foundation
import Testing
@testable import BucketKit

struct LiveGamesTests {
    func room(_ id: String, _ game: LobbyGame, players: Int, status: LobbyStatus = .lobby, member: Bool = false) -> LobbySummary {
        LobbySummary(id: id, code: id.uppercased(), name: id, game: game, root: "en", targets: ["es"], status: status, players: players, host: "h", isMember: member)
    }

    @Test func everyGameMapsToItsLobby() {
        #expect(LiveGames.lobbyGames(forGame: "daily") == [.daily])
        #expect(LiveGames.lobbyGames(forGame: "same") == [.sameWord])
        #expect(LiveGames.lobbyGames(forGame: "wordGroups") == [.wordGroups])
        #expect(LiveGames.lobbyGames(forGame: "flagTiles") == [.flagTiles])
        #expect(LiveGames.lobbyGames(forGame: "duel") == [.flagDuel, .duel])
        #expect(LiveGames.lobbyGames(forGame: "snake") == [.snake])
        #expect(LiveGames.lobbyGames(forGame: "other").isEmpty)
        #expect(LiveGames.lobbyGames(forGame: "nope").isEmpty)
    }

    @Test func hostedPicksOnlyGamesTheServerOffers() {
        #expect(LiveGames.hosted(forGame: "duel", hostable: LobbyGame.hostable) == nil)
        #expect(LiveGames.hosted(forGame: "duel", hostable: LobbyGame.hostable + [.flagDuel]) == .flagDuel)
        #expect(LiveGames.hosted(forGame: "tiles", hostable: LobbyGame.hostable) == .tiles)
    }

    @Test func liveNowListsOpenRoomsFirstByPlayers() {
        let open = [room("a", .tiles, players: 2, status: .playing), room("b", .flags, players: 1), room("c", .daily, players: 4), room("d", .daily, players: 3, status: .done), room("e", .tiles, players: 0)]
        #expect(LiveGames.liveNow(open).map(\.id) == ["c", "b", "a"])
    }

    @Test func joinableRejoinsYourRoomThenTheFullestOpenOne() {
        let open = [room("a", .tiles, players: 2), room("b", .tiles, players: 5), room("c", .tiles, players: LobbyRules.cap), room("d", .tiles, players: 6, status: .playing), room("e", .flags, players: 7)]
        #expect(LiveGames.joinable(open, games: [.tiles])?.id == "b")
        #expect(LiveGames.joinable(open + [room("m", .tiles, players: 1, status: .playing, member: true)], games: [.tiles])?.id == "m")
        #expect(LiveGames.joinable(open, games: [.snake]) == nil)
        #expect(LiveGames.players(open, games: [.tiles]) == 2 + 5 + LobbyRules.cap + 6)
    }

    @Test func lobbyGamesCreditTheMatchingLanguageSets() {
        let es = LangSystem(id: "es", name: "es", root: "en", targets: ["es", "de"], createdAt: 0)
        let fr = LangSystem(id: "fr", name: "fr", root: "en", targets: ["fr"], createdAt: 0)
        let pt = LangSystem(id: "pt", name: "pt", root: "es", targets: ["pt"], createdAt: 0)
        #expect(LiveGames.credited([es, fr, pt], root: "en", targets: ["de", "it"]).map(\.id) == ["es"])
        #expect(LiveGames.credited([es, fr, pt], root: "en", targets: ["ja"]).isEmpty)
    }

    @Test func hitsCountMyCorrectRounds() {
        let r = [LobbyResult(round: 1, userId: "me", correct: true, ms: 1, points: 1), LobbyResult(round: 2, userId: "me", correct: false, ms: 1, points: 0), LobbyResult(round: 1, userId: "x", correct: true, ms: 1, points: 1)]
        #expect(LiveGames.hits(r, me: "me") == 1)
        #expect(LiveGames.hits(r, me: nil) == 0)
        #expect(LiveGames.recordKey(id: "l", startedAt: "t") != LiveGames.recordKey(id: "l", startedAt: "u"))
    }

    func ledger() -> (LobbyCreditLedger, UserDefaults) {
        let d = UserDefaults(suiteName: "lobby-credit-\(UUID().uuidString)")!
        return (LobbyCreditLedger(defaults: d), d)
    }

    @Test func lobbyCreditCountsOnceAcrossRelaunch() {
        let (first, store) = ledger()
        let r = [LobbyResult(round: 1, userId: "me", correct: true, ms: 1, points: 1), LobbyResult(round: 2, userId: "me", correct: true, ms: 1, points: 1)]
        #expect(first.claim(id: "l", startedAt: "t1", results: r, me: "me") == 2)
        #expect(first.claim(id: "l", startedAt: "t1", results: r, me: "me") == nil)
        let relaunched = LobbyCreditLedger(defaults: store)
        #expect(relaunched.claim(id: "l", startedAt: "t1", results: r, me: "me") == nil)
        #expect(relaunched.claim(id: "l", startedAt: "t2", results: r, me: "me") == 2)
    }

    @Test func membersWithNoAnswersEarnNoCredit() {
        let (l, _) = ledger()
        let others = [LobbyResult(round: 1, userId: "x", correct: true, ms: 1, points: 1)]
        #expect(l.claim(id: "l", startedAt: "t", results: others, me: "me") == nil)
        #expect(l.claim(id: "l", startedAt: "t", results: [], me: "me") == nil)
        #expect(l.claim(id: "l", startedAt: "t", results: others, me: nil) == nil)
        #expect(l.keys.isEmpty)
        #expect(l.claim(id: "l", startedAt: "t", results: others + [LobbyResult(round: 1, userId: "me", correct: false, ms: 1, points: 0)], me: "me") == 0)
    }

    @Test func creditLedgerStaysCapped() {
        let (l, _) = ledger()
        let r = [LobbyResult(round: 1, userId: "me", correct: true, ms: 1, points: 1)]
        for i in 0..<(LobbyCreditLedger.cap + 5) { _ = l.claim(id: "l\(i)", startedAt: nil, results: r, me: "me") }
        #expect(l.keys.count == LobbyCreditLedger.cap)
    }

    @Test func raceGamesCreditProgressWithoutTouchingSoloBestOrDaily() {
        let race = LiveGames.result("mini", points: 90, hits: 4, missed: ["a"], pattern: "p", race: true, countsForGroup: true)
        #expect(race == GameResult(game: "mini", points: nil, hits: 4, missed: ["a"], dailyPattern: nil, countsForGroup: true))
        let solo = LiveGames.result("mini", points: 90, hits: 4, missed: [], pattern: "p", race: false, countsForGroup: false)
        #expect(solo.points == 90 && solo.dailyPattern == "p")
    }
}
