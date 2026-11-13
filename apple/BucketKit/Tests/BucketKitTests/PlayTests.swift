import CryptoKit
import Foundation
import Testing
@testable import BucketKit

enum PlayFixtures {
    static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

    static func corpusJSON(_ name: String) -> JSValue { try! JSON.parse(Data(contentsOf: repo.appending(path: "apple/Shared/Corpus/\(name)"))) }

    static let corpus: LangCorpus = buildLangCorpus(core: corpusJSON("lang-core.json"), cognates: corpusJSON("lang-cognates.json"), phrases: corpusJSON("lang-phrases.json"), layers: corpusJSON("lang-layers.json"))

    static let bank: PolywordBank = try! JSONDecoder().decode(PolywordBank.self, from: Data(contentsOf: repo.appending(path: "android/polingual/src/main/assets/play/polyword-bank.json")))

    static let golden: [String: JSValue] = {
        let url = Bundle.module.url(forResource: "web-goldens", withExtension: "json", subdirectory: "Fixtures/play")!
        return Dictionary(uniqueKeysWithValues: try! JSON.parse(Data(contentsOf: url)).object!.entries.map { ($0.0, $0.1) })
    }()

    static func list(_ k: String) -> [String] { golden[k]!.stringArray! }
    static func str(_ k: String) -> String { golden[k]!.string! }

    static let meanings = ["dog", "cat", "sun", "sea", "tree"].map { m in Meaning(id: m, meaning: m, forms: ["es": "\(m)-es", "fr": "\(m)-fr", "de": "\(m)-de"]) }
    static func deal(_ seed: Int32, start: Int = 0) -> Dealer { Dealer(meanings, ["es", "fr", "de"], XorRng(seed), start: start) }
}

struct PlayTests {
    typealias F = PlayFixtures

    @Test func babelDealsMatchTheWeb() {
        var d = F.deal(7)
        #expect(Babel.fresh(&d).map { "\($0.meaning):\($0.lang)" } == F.list("babelFresh7"))
        var p = F.deal(42)
        #expect(Babel.playable(&p).map { "\($0.key):\($0.meaning):\($0.lang)" } == F.list("babelPlayable42"))
        #expect(Babel.meanings(F.corpus.items, langs: ["es", "fr", "it"], level: 3).map(\.id) == F.list("babelMeanings"))
    }

    @Test func shiftBoardMatchesTheWeb() throws {
        let b = try #require(Shift.board(F.corpus.items, date: "2026-11-13"))
        #expect(b.langs == F.list("shiftLangs"))
        #expect(b.columns.map { $0.joined() } == F.list("shiftColumns"))
        #expect(b.targets.map { "\($0.lang):\($0.form):\($0.meaning)" } == F.list("shiftTargets"))
    }

    @Test func flagTilesDeckMatchesTheWeb() {
        let d = FlagTilesRules.deck(F.corpus.items, date: "2026-11-13")
        #expect(d.langs == F.list("flagTilesLangs"))
        #expect(d.tiles.prefix(8).map { "\($0.lang):\($0.form)" } == F.list("flagTilesFirst"))
    }

    @Test func polywordBankMatchesTheWebHash() throws {
        let canon = F.bank.langs.keys.sorted().map { "\($0)=\(F.bank.langs[$0]!.joined(separator: ","))" }.joined(separator: ";")
        let sha = SHA256.hash(data: Data(canon.utf8)).map { String(format: "%02x", $0) }.joined()
        #expect(sha == F.str("polywordBankSha256"))
        #expect(try #require(Polyword.puzzleFor(F.bank, lang: "es", day: 13)).slug == F.str("polywordEs13"))
        #expect(try #require(Polyword.puzzleFor(F.bank, lang: "fr", day: 40)).slug == F.str("polywordFr40"))
    }

    @Test func atlasProjectionRoundTrips() {
        let (x, y) = Atlas.project(lon: 2.4, lat: 48.9)
        let p = Atlas.unproject(x: x, y: y)
        #expect(abs(p.lat - 48.9) < 1e-9 && abs(p.lon - 2.4) < 1e-9)
        let o = Atlas.project(lon: 0, lat: 0)
        #expect(o.x == 360 && o.y == 180)
    }

    @Test func atlasPointsDecayWithDistance() {
        #expect(Atlas.points(100) == Atlas.max)
        #expect(Atlas.points(150) == Atlas.max)
        #expect(Atlas.points(1950) == Int((5000 * exp(-1.0)).rounded()))
        #expect(Atlas.points(10000) < 50)
    }

    @Test func atlasNearestHomePicksTheClosestCity() throws {
        #expect(try #require(Atlas.nearestHome("fr", LatLon(45.0, -73.0))).home == LatLon(45.5, -73.6))
        #expect((1000.0...1100.0).contains(Atlas.distanceKm(LatLon(48.9, 2.4), LatLon(40.4, -3.7))))
    }

    @Test func atlasRoundsUseDistinctLanguagesFromTheCorpus() {
        let r = Atlas.rounds(F.corpus.items, date: "2026-11-13")
        #expect(r.count == Atlas.rounds + 1)
        #expect(Set(r.map(\.lang)).count == r.count)
        #expect(r == Atlas.rounds(F.corpus.items, date: "2026-11-13"))
    }

    @Test func xorRngMatchesTheWebXorshift() {
        var r = XorRng(7)
        #expect(r.next() == 0.00044065131805837154)
        #expect(r.next() == 0.10952103300951421)
        #expect(r.next() == 0.9038964069914073)
    }

    @Test func babelFreshBoardHasNoMatchAndIsSeeded() {
        var a = F.deal(7), b = F.deal(7)
        let board = Babel.fresh(&a)
        #expect(board.count == Babel.size * Babel.size)
        #expect(Babel.matches(board).isEmpty)
        #expect(board.map(\.meaning) == Babel.fresh(&b).map(\.meaning))
    }

    @Test func babelThreeOfAMeaningClearAcrossLanguagesAndRefill() {
        var d = F.deal(9)
        var rigged = Babel.fresh(&d)
        rigged[0] = Cell(key: 1, meaning: "dog", lang: "es")
        rigged[1] = Cell(key: 2, meaning: "dog", lang: "fr")
        rigged[2] = Cell(key: 3, meaning: "dog", lang: "de")
        #expect(Babel.matches(rigged).isSuperset(of: [0, 2]))
        var r = F.deal(3, start: 1000)
        let out = Babel.resolve(rigged, &r)
        #expect(out.cleared.count >= 3)
        #expect(out.board.count == Babel.size * Babel.size)
        #expect(Babel.matches(out.board).isEmpty)
    }

    @Test func babelOnlyNeighboursSwap() {
        #expect(Babel.adjacent(0, 1))
        #expect(Babel.adjacent(0, Babel.size))
        #expect(!Babel.adjacent(Babel.size - 1, Babel.size))
        #expect(!Babel.adjacent(0, 2))
        var d = F.deal(1)
        let b = Babel.fresh(&d)
        #expect(Babel.swapped(b, 0, 1)[0] == b[1])
    }

    @Test func babelLevelsGetHarder() {
        #expect(Babel.level(5).goal > Babel.level(1).goal)
        #expect(Babel.level(10).moves <= Babel.level(1).moves)
    }

    @Test func babelPlayableBoardsHoldALegalSwap() {
        for seed in Int32(1)..<30 {
            var d = F.deal(seed)
            let b = Babel.playable(&d)
            #expect(Babel.matches(b).isEmpty)
            #expect(Babel.hasMove(b))
        }
        let names = ["dog", "cat", "sun"]
        let dead = (0..<(Babel.size * Babel.size)).map { i in Cell(key: i, meaning: names[(i / Babel.size + i) % 3], lang: "es") }
        #expect(!Babel.hasMove(dead))
    }

    @Test func flagTilesRunScoresStopsOnMissAndContinuesOnce() {
        var s = FlagTilesRules.step(RunState(), .start)
        s = FlagTilesRules.step(s, .tap(lane: 2, answer: 2))
        #expect(s.phase == .running && s.index == 1 && s.score == 1)
        s = FlagTilesRules.step(s, .tap(lane: 0, answer: 3))
        #expect(s.phase == .missed && s.missed == 1 && s.picked == 0)
        s = FlagTilesRules.step(s, .continue)
        #expect(s.phase == .running && s.index == 2 && s.continued)
        s = FlagTilesRules.step(s, .timeout)
        #expect(s.phase == .missed)
        #expect(FlagTilesRules.step(s, .continue).phase == .missed)
        #expect(FlagTilesRules.step(s, .end).phase == .over)
    }

    @Test func flagTilesFallSpeedsUpEveryTenWordsToAFloor() {
        #expect(FlagTilesRules.fallMs(0) == 3400)
        #expect(FlagTilesRules.fallMs(9) == 3400)
        #expect(FlagTilesRules.fallMs(10) == 2992)
        #expect(FlagTilesRules.fallMs(500) == 1100)
    }

    @Test func webRandomMatchesTheWebSequence() {
        var r = WebRandom("12345")
        #expect(r.next() == 7.204309649955221e-7)
        #expect(r.next() == 0.6095996695066922)
        #expect(r.next() == 0.6334233905286124)
        #expect(WebRandom.unit("abc") == 0.08375681564211845)
        #expect(WebRandom.seedOf("flag-tiles:2026-11-13") == "863983924936705")
    }

    @Test func ghostsAreFiveSortedAndStablePerDay() {
        let g = FlagTilesRules.ghosts(date: "2026-11-13")
        #expect(g.count == 5)
        #expect(g == FlagTilesRules.ghosts(date: "2026-11-13"))
        #expect(g.map(\.score) == g.map(\.score).sorted(by: >))
        #expect(Atlas.ghosts(date: "2026-11-13").count == 5)
        #expect(Bots.all[9].userId == "00000000-b07b-4000-8000-00000000000a")
        #expect(Bots.countryFlag("es") == "🇪🇸")
    }

    @Test func lanesPickTheLowestLiveTile() {
        let s = Lanes.schedule(count: 5, round: 0, rounds: 10, roundSeconds: 9)
        #expect(s.map(\.lane) == [0, 3, 2, 1, 0])
        #expect(s[0].fallMs == 5580 && s[4].spawnMs == 2420)
        #expect(Lanes.target(choices: 5, schedule: s, lane: 0, elapsedMs: 3000, tapped: []) == 0)
        #expect(Lanes.target(choices: 5, schedule: s, lane: 0, elapsedMs: 3000, tapped: [0]) == 4)
        #expect(Lanes.target(choices: 5, schedule: s, lane: 1, elapsedMs: 100, tapped: []) == nil)
        #expect(Lanes.keys["arrowup"] == 2)
    }

    @Test func worldDrawsLandFromTopology() {
        let topo = World.Topology(transform: .init(scale: (1, 1), translate: (0, 0)), arcs: [[[0, 0], [10, 0], [0, 10], [-10, -10]]], objects: ["land": [.polygon([[0]])]])
        #expect(World.landPath(topo) == "M360.0 180.0L380.0 180.0L380.0 160.0L360.0 180.0Z")
        let u = World.unproject(x: 360, y: 180)
        #expect(u.lat == 0 && u.lon == 0)
    }

    @Test func foreheadTiltFloorScoresCeilingPassesUprightWaits() {
        #expect(TiltRules.classify(-8) == .score)
        #expect(TiltRules.classify(8) == .pass)
        #expect(TiltRules.classify(1) == nil)
        #expect(TiltRules.classify(nil) == nil)
        #expect(TiltRules.settled(2))
        #expect(!TiltRules.settled(5))
        #expect(!TiltRules.settled(nil))
    }

    @Test func foreheadDeckHasUniqueMeaningsInTheChosenLanguages() {
        let d = ForeheadDeck.deck(F.corpus.items, langs: ["es", "fr"], seed: "42")
        #expect(d.count == ForeheadDeck.cards)
        #expect(d.allSatisfy { ["es", "fr"].contains($0.lang) && $0.form != $0.meaning && $0.form.utf16.count <= 24 })
        #expect(Set(d.map { $0.meaning.lowercased() }).count == d.count)
        #expect(d == ForeheadDeck.deck(F.corpus.items, langs: ["es", "fr"], seed: "42"))
    }

    @Test func iSpyUnitMatchesTheWebHash() {
        #expect(ISpy.unit("at:1:0:bot-ama") == 0.021897681057453156)
        #expect(ISpy.unit("ok:1:0:bot-ama") == 0.8468830871861428)
    }

    @Test func iSpyPointsRewardSpeedAndStreakWithACap() {
        #expect(ISpy.points(correct: false, ms: 0, roundSeconds: 12, streak: 3) == 0)
        #expect(ISpy.points(correct: true, ms: 0, roundSeconds: 12, streak: 0) == 200)
        #expect(ISpy.points(correct: true, ms: 12_000, roundSeconds: 12, streak: 0) == 100)
        #expect(ISpy.points(correct: true, ms: 6_000, roundSeconds: 12, streak: 9) == 150 + 4 * 25)
        let (t, p) = ISpy.award(SpyTally(), correct: true, ms: 0, roundSeconds: 12)
        #expect(t == SpyTally(score: 200, streak: 1) && p == 200)
        #expect(ISpy.award(t, correct: false, ms: 0, roundSeconds: 12).0.streak == 0)
    }

    @Test func iSpyBotTurnsLandInsideTheirWindow() {
        let turns = ISpy.botTurns(seed: "1", round: 0, roundSeconds: 12)
        #expect(turns.count == 3)
        for (t, b) in zip(turns, ISpy.bots) { #expect(t.atMs >= Int((12000 * b.from).rounded()) && t.atMs <= Int((12000 * b.to).rounded())) }
        #expect(turns[0].atMs == Int((12000 * (0.2 + 0.35 * 0.021897681057453156)).rounded()))
        #expect(turns[0].correct)
    }

    @Test func iSpyScenesLayTwentyObjectsAndRoundsUseThem() {
        for s in ISpy.scenes { #expect(s.objects.count == 20) }
        let r = ISpy.rounds(F.corpus.items, seed: "42", root: "en", targets: ["zh", "ru", "hi", "es"], rounds: ISpy.rounds)
        #expect(r.count >= 4)
        #expect(r.allSatisfy { $0.choices.contains($0.answer) && $0.lang != "en" })
        #expect(r == ISpy.rounds(F.corpus.items, seed: "42", root: "en", targets: ["zh", "ru", "hi", "es"], rounds: ISpy.rounds))
    }

    @Test func polywordFoldStripsAccents() {
        #expect(Polyword.fold("Árbol") == "arbol")
        #expect(Polyword.fold("niño") == "nino")
        #expect(Polyword.fold("Größe") == "große")
        #expect(!Polyword.playable("Größe"))
        #expect(Polyword.playable("perro"))
        #expect(!Polyword.playable("sol"))
    }

    @Test func polywordEveryTargetHasAMonthOfPlayableWords() {
        for lang in F.bank.targets {
            let list = F.bank.langs[lang]!
            #expect(list.count >= 30)
            for slug in list { #expect(Polyword.playable(F.bank.words[slug]!.forms[lang]!.word)) }
            #expect(Set(list.map { Polyword.fold(F.bank.words[$0]!.forms[lang]!.word) }).count == list.count)
        }
    }

    @Test func polywordDayNumbersCountFromNovemberFirst() {
        #expect(Polyword.dayNumber(PolyDate(2026, 11, 1)) == 1)
        #expect(Polyword.dayNumber(PolyDate(2026, 11, 13)) == 13)
        #expect(Polyword.dayNumber(PolyDate(2027, 1, 1)) == 62)
        #expect(Polyword.dateOfDay(13) == PolyDate(2026, 11, 13))
        #expect(Polyword.dateOfDay(62) == PolyDate(2027, 1, 1))
    }

    @Test func polywordPuzzleIsStablePerDay() throws {
        let a = try #require(Polyword.puzzleFor(F.bank, lang: "es", day: 13))
        #expect(a == Polyword.puzzleFor(F.bank, lang: "es", day: 13))
        #expect(a.slug != Polyword.puzzleFor(F.bank, lang: "es", day: 14)?.slug)
        #expect(Polyword.fold(a.word) == a.answer)
        #expect((3...5).contains(a.hints.count))
        #expect(a.hints[0].lang == "en")
        #expect(!a.hints.contains { $0.lang == "es" })
        #expect(Polyword.puzzleFor(F.bank, lang: "es", day: 0) == nil)
        #expect(Polyword.puzzleFor(F.bank, lang: "xx", day: 3) == nil)
        #expect(Polyword.puzzleFor(F.bank, lang: "en", day: 5)?.hints[0].lang == "es")
    }

    @Test func polywordScoreFollowsWordleRules() {
        #expect(Polyword.score("perro", "perro") == [.hit, .hit, .hit, .hit, .hit])
        #expect(Polyword.score("opera", "perro") == [.near, .near, .near, .hit, .miss])
        #expect(Polyword.score("rrxxx", "perro") == [.near, .near, .miss, .miss, .miss])
        #expect(Polyword.score("errrr", "perro") == [.near, .miss, .hit, .hit, .miss])
        #expect(Polyword.score("aabbb", "xaxxx") == [.miss, .hit, .miss, .miss, .miss])
    }

    @Test func polywordKeyMarksKeepTheBest() {
        let k = Polyword.keyMarks(["opera", "perro"], "perro")
        #expect(k["p"] == .hit)
        #expect(k["a"] == .miss)
        #expect(Polyword.keyMarks(["rrxxx"], "perro")["r"] == .near)
    }

    @Test func polywordGuessesFoldAndReject() {
        #expect(Polyword.checkGuess("Árbol", answer: "arbol", previous: []) == .ok("arbol"))
        #expect(Polyword.checkGuess("arb", answer: "arbol", previous: []) == .bad("short"))
        #expect(Polyword.checkGuess("ab1ol", answer: "arbol", previous: []) == .bad("letters"))
        #expect(Polyword.checkGuess("arbol", answer: "arbol", previous: ["arbol"]) == .bad("repeat"))
    }

    @Test func polywordEachMissOpensOneHint() {
        let hints = [Hint(lang: "en", word: "dog"), Hint(lang: "fr", word: "chien"), Hint(lang: "de", word: "Hund")]
        #expect(Polyword.revealedHints(hints, answer: "perro", guesses: []).isEmpty)
        #expect(Polyword.revealedHints(hints, answer: "perro", guesses: ["gatos"]).count == 1)
        #expect(Polyword.revealedHints(hints, answer: "perro", guesses: ["gatos", "lunes"]).count == 2)
        #expect(Polyword.revealedHints(hints, answer: "perro", guesses: ["gatos", "perro"]).count == 3)
        #expect(Polyword.finished(["a", "b", "c", "d", "e", "f"], "perro"))
    }

    @Test func polywordShareCardTagsMissesWithHintFlags() {
        let flags = ["es": "🇪🇸", "en": "🇬🇧", "fr": "🇫🇷"]
        let hints = [Hint(lang: "en", word: "dog"), Hint(lang: "fr", word: "chien")]
        let text = Polyword.shareText(lang: "es", day: 13, answer: "perro", hints: hints, guesses: ["gatos", "pesar", "perro"], url: "https://www.polingual.com/play/polyword") { flags[$0]! }
        #expect(text.components(separatedBy: "\n")[0] == "Polyword 🇪🇸 #13 3/6")
        #expect(text.contains("⬜⬜⬜🟨⬜ 🇬🇧\n🟩🟩⬜⬜🟨 🇫🇷\n🟩🟩🟩🟩🟩\n"))
        let lost = Polyword.shareText(lang: "es", day: 13, answer: "perro", hints: hints, guesses: Array(repeating: "aaaaa", count: 6), url: "u") { flags[$0]! }
        #expect(lost.components(separatedBy: "\n")[0] == "Polyword 🇪🇸 #13 X/6")
    }

    @Test func polywordStreaksCountDailyWinsAndSkipArchive() {
        let win = PolyGame(guesses: ["x"], done: true, won: true)
        let loss = PolyGame(guesses: Array(repeating: "a", count: 6), done: true, won: false)
        var archived = win
        archived.archive = true
        var g: [Int: PolyGame] = [8: win, 9: win, 11: win, 12: win, 10: loss, 3: archived]
        #expect(Polyword.stats(g, today: 13) == PolyStats(played: 5, won: 4, streak: 2, best: 2, dist: [4, 0, 0, 0, 0, 0]))
        g[13] = win
        #expect(Polyword.stats(g, today: 13).streak == 3)
        var h = g
        h[14] = loss
        #expect(Polyword.stats(h, today: 14).streak == 0)
        #expect(Polyword.stats(g, today: 15).streak == 0)
    }

    @Test func revealRulesMatchEachGame() {
        #expect(!RevealRules.polyword(["gatos"], "perro"))
        #expect(RevealRules.polyword(["gatos", "perro"], "perro"))
        #expect(RevealRules.polyword(Array(repeating: "gatos", count: 6), "perro"))
        #expect(!RevealRules.flagTiles(RunState(phase: .running, index: 3)))
        #expect(RevealRules.flagTiles(RunState(phase: .missed, missed: 3)))
        #expect(RevealRules.flagTiles(RunState(phase: .over)))
        #expect(!RevealRules.babel(cleared: 6, goal: 15, movesLeft: 4))
        #expect(RevealRules.babel(cleared: 15, goal: 15, movesLeft: 4))
        #expect(RevealRules.babel(cleared: 3, goal: 15, movesLeft: 0))
        let t = [ShiftTarget(lang: "it", form: "nero", meaning: "black"), ShiftTarget(lang: "it", form: "pane", meaning: "bread")]
        #expect(!RevealRules.shift(found: ["nero"], targets: t))
        #expect(RevealRules.shift(found: ["pane", "nero", "zero"], targets: t))
        #expect(!RevealRules.snake(alive: true, secondsLeft: 30))
        #expect(RevealRules.snake(alive: false, secondsLeft: 30))
        #expect(RevealRules.snake(alive: true, secondsLeft: 0))
        #expect(!RevealRules.atlas(guessed: false))
        #expect(RevealRules.atlas(guessed: true))
        #expect(!RevealRules.forehead(cardsLeft: 20, secondsLeft: 12))
        #expect(RevealRules.forehead(cardsLeft: 0, secondsLeft: 12))
        #expect(RevealRules.forehead(cardsLeft: 20, secondsLeft: 0))
        #expect(!RevealRules.iSpy(tapped: false, elapsedMs: 5_000))
        #expect(RevealRules.iSpy(tapped: true, elapsedMs: 5_000))
        #expect(RevealRules.iSpy(tapped: false, elapsedMs: 12_000))
        #expect(!RevealRules.sameWord(revealPhase: false))
        #expect(RevealRules.sameWord(revealPhase: true))
    }

    @Test func shiftCenterRowReadsOneLetterPerColumnAndWraps() {
        let cols = [["c", "g"], ["a", "o"], ["s", "t"], ["a", "o"]]
        #expect(Shift.centerWord(cols, [0, 0, 0, 0]) == "casa")
        #expect(Shift.centerWord(cols, Shift.rotate([0, 0, 0, 0], column: 0, by: 1)) == "gasa")
        #expect(Shift.centerWord(cols, [-1, 1, 1, 1]) == "goto")
    }

    @Test func shiftHintsRevealFromTheStart() {
        #expect(Shift.hintFor("gato", revealed: 0) == "_ _ _ _")
        #expect(Shift.hintFor("gato", revealed: 2) == "g a _ _")
    }

    @Test func shiftCleanKeepsLowercaseLettersOfTheLength() {
        #expect(Shift.clean("Gato", 4) == "gato")
        #expect(Shift.clean("niño", 4) == "niño")
        #expect(Shift.clean("gatos", 4) == nil)
        #expect(Shift.clean("ga-o", 4) == nil)
        #expect(Shift.spellable("gato", [["g"], ["a"], ["t"], ["o"]]))
        #expect(!Shift.spellable("gata", [["g"], ["a"], ["t"], ["o"]]))
    }

    @Test func shiftTodaysBoardHoldsSixSpellableTargets() throws {
        let b = try #require(Shift.board(F.corpus.items, date: "2026-11-14"))
        #expect(b.targets.count == 6)
        #expect(b.targets.allSatisfy { Shift.spellable($0.form, b.columns) })
        #expect(b.targets.allSatisfy { b.valid[$0.form]?.contains($0.lang) == true })
    }

    static let snakeDeck = SnakeDeck(lang: "es", good: [SnakeWord(form: "perro", lang: "es", meaning: "dog")], decoys: [SnakeWord(form: "chien", lang: "fr", meaning: "dog")])

    @Test func snakesMoveTurnCappedAndKeepLength() {
        let s = Snakes.make(id: "me", name: "You", bot: false, skill: 1, at: Pt(500, 500), angle: 0, color: 0)
        let moved = Snakes.advance(s, target: .pi / 2, dt: 0.1)
        #expect(moved.body[0].x > 500)
        #expect(moved.angle > 0 && moved.angle < .pi / 2)
        var t = s
        for _ in 0..<50 { t = Snakes.advance(t, target: 0, dt: 0.05) }
        #expect(t.body.count <= Snakes.startLen)
    }

    @Test func snakeGoodWordsGrowDecoysShrinkAndFieldRefills() {
        let me = Snakes.make(id: "me", name: "You", bot: false, skill: 1, at: Pt(100, 100), angle: 0, color: 0)
        let arena = Arena(snakes: [me], words: [FieldWord(id: 1, x: 100, y: 100, form: "perro", lang: "es", meaning: "dog", good: true)], nextWord: 2)
        let a = Snakes.eat(arena, deck: Self.snakeDeck) { 0.5 }
        #expect(a.snakes[0].length == Snakes.startLen + Snakes.grow)
        #expect(a.eaten.count == 1)
        #expect(a.words.count == Snakes.wordsOnField)
        var decoy = arena
        decoy.words = [FieldWord(id: 1, x: 100, y: 100, form: "chien", lang: "fr", meaning: "dog", good: false)]
        let b = Snakes.eat(decoy, deck: Self.snakeDeck) { 0.5 }
        #expect(b.snakes[0].length == max(Snakes.minLen, Snakes.startLen - Snakes.shrink))
        #expect(b.bad.count == 1)
    }

    @Test func theSmallerOfTwoTouchingSnakesDies() {
        var big = Snakes.make(id: "big", name: "Big", bot: true, skill: 1, at: Pt(300, 300), angle: 0, color: 0)
        big.length = 20
        var small = Snakes.make(id: "me", name: "You", bot: false, skill: 1, at: Pt(291, 300), angle: .pi, color: 0)
        #expect(Snakes.collide(Arena(snakes: [big, small], words: [], nextWord: 0)).died == ["me"])
        big.length = 4
        small.length = 30
        #expect(Snakes.collide(Arena(snakes: [big, small], words: [], nextWord: 0)).died == ["big"])
    }

    @Test func snakeHeadOnContactCounts() {
        var a = Snakes.make(id: "a", name: "A", bot: true, skill: 1, at: Pt(300, 300), angle: 0, color: 0)
        a.length = 20
        let b = Snakes.make(id: "me", name: "You", bot: false, skill: 1, at: Pt(305, 300), angle: .pi, color: 0)
        #expect(Snakes.collide(Arena(snakes: [a, b], words: [], nextWord: 0)).died.contains("me"))
    }

    @Test func snakeDeckFromTheCorpusSplitsGoodWordsFromDecoys() {
        let d = Snakes.deck(F.corpus.items, lang: "es", others: ["fr", "it", "pt", "de", "nl"], seed: "12345")
        #expect(d.good.count >= 40)
        #expect(d.good.allSatisfy { $0.lang == "es" })
        #expect(!d.decoys.contains { $0.lang == "es" })
        #expect(!d.decoys.contains { dc in d.good.contains { $0.form.lowercased() == dc.form.lowercased() } })
    }

    @Test func webGamesListEveryReadyRoute() {
        #expect(Set(WebGame.allCases.map(\.route)) == WebGames.ready)
    }
}
