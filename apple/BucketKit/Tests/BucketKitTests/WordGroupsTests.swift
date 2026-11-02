import Foundation
import Testing
@testable import BucketKit

@Suite struct WordGroupsTests {
    static let themes = ["animal", "food", "color", "body", "nature"]

    static func word(_ lang: String, _ theme: Int, _ n: Int) -> GameWord {
        GameWord(itemId: "\(themes[theme])\(n)", lang: lang, form: "\(lang)\(themes[theme])\(n)", gloss: "\(themes[theme]) \(n)", root: "en")
    }

    static func pool(_ langs: [String], themes count: Int = 5, each: Int = 6) -> [GameWord] {
        langs.flatMap { l in (0..<count).flatMap { t in (0..<each).map { word(l, t, $0) } } }
    }

    static func theme(_ w: GameWord) -> String? { themes.first { w.itemId.hasPrefix($0) } }

    func daily(_ words: [GameWord], day: String = "2026-11-02", targets: [String]) -> WordGroupsPuzzle? {
        WordGroupsPuzzle.daily(words, day: day, root: "en", targets: targets, theme: Self.theme)
    }

    @Test func sameDayGivesTheSameBoardWhateverTheInputOrder() throws {
        let words = Self.pool(["es", "fr"])
        let a = try #require(daily(words, targets: ["es", "fr"]))
        #expect(a == daily(words.reversed(), targets: ["fr", "es"]))
        let days = (1...20).compactMap { daily(words, day: "d\($0)", targets: ["es", "fr"])?.tiles.map(\.id) }
        #expect(Set(days).count > 1)
    }

    @Test func aBoardIsSixteenUniqueTilesInFourGroups() throws {
        for d in 1...60 {
            let p = try #require(daily(Self.pool(["es", "fr", "de", "ru"]), day: "day\(d)", targets: ["es", "fr", "de", "ru"]))
            #expect(p.groups.count == 4 && p.groups.allSatisfy { $0.words.count == 4 })
            #expect(p.tiles.count == 16)
            #expect(Set(p.tiles.map(\.id)) == Set(p.groups.flatMap(\.words).map(\.id)))
            #expect(Set(p.tiles.map(\.form)).count == 16)
            #expect(p.groups.allSatisfy { Set($0.words.map(\.itemId)).count == 4 })
            #expect(Set(p.groups.map(\.link)).count == 4)
        }
    }

    @Test func oneLanguageGroupsByTheme() throws {
        let p = try #require(daily(Self.pool(["es"]), targets: ["es"]))
        for g in p.groups {
            let name = Set(g.words.compactMap(Self.theme))
            #expect(name.count == 1)
            let linked = g.link == .theme(name.first!) || g.link == .languageTheme("es", name.first!)
            #expect(linked)
        }
    }

    @Test func manyLanguagesWithoutThemesGroupByLanguage() throws {
        let langs = ["es", "fr", "de", "ru"]
        let p = try #require(WordGroupsPuzzle.daily(Self.pool(langs), day: "d", root: "en", targets: langs, theme: { _ in nil }))
        for g in p.groups {
            guard case .language(let l) = g.link else {
                Issue.record("expected a language group")
                continue
            }
            #expect(g.words.allSatisfy { $0.lang == l })
        }
    }

    @Test func twoLanguagesWithFewThemesSplitByLanguageAndTheme() throws {
        let words = Self.pool(["es", "fr"], themes: 2)
        for d in 1...10 {
            let p = try #require(daily(words, day: "d\(d)", targets: ["es", "fr"]))
            #expect(Set(p.groups.map(\.link)).count == 4)
        }
    }

    @Test func tooFewWordsHideTheGame() {
        #expect(daily(Array(Self.pool(["es"]).prefix(15)), targets: ["es"]) == nil)
        #expect(daily(Self.pool(["es"], themes: 3), targets: ["es"]) == nil)
        #expect(daily(Self.pool(["es"], each: 3), targets: ["es"]) == nil)
        #expect(daily(Self.pool(["es"]), targets: ["de"]) == nil)
        #expect(daily([], targets: []) == nil)
    }

    @Test func unknownCategoriesAreNotThemes() {
        let p = WordGroupsPuzzle.daily(Self.pool(["es"]), day: "d", root: "en", targets: ["es"], theme: { _ in "phrase" })
        #expect(p == nil)
    }

    @Test func longFormsAndPhrasesStayOffTheBoard() throws {
        var words = Self.pool(["es"])
        words.append(GameWord(itemId: "animal90", lang: "es", form: "buenos dias", gloss: "good day", root: "en"))
        words.append(GameWord(itemId: "animal91", lang: "es", form: "hipopotamosaurio", gloss: "big", root: "en"))
        for d in 1...30 {
            let p = try #require(daily(words, day: "d\(d)", targets: ["es"]))
            #expect(!p.tiles.contains { $0.itemId == "animal90" || $0.itemId == "animal91" })
        }
    }

    @Test func aFormSharedByTwoLanguagesNeverJoinsALanguageGroup() throws {
        let langs = ["de", "nl", "es", "fr"]
        let shared = (0..<3).map { GameWord(itemId: "acht\($0)", lang: "de", form: "acht\($0)", gloss: "eight \($0)", root: "en") }
        let words = Self.pool(langs, each: 4) + shared
        for d in 1...30 {
            let p = try #require(WordGroupsPuzzle.daily(words, day: "d\(d)", root: "en", targets: langs, theme: { _ in nil }, sameForm: { w, l in w.itemId.hasPrefix("acht") && l == "nl" }))
            #expect(!p.tiles.contains { $0.itemId.hasPrefix("acht") })
        }
    }

    func round(_ langs: [String] = ["es", "fr"]) throws -> WordGroupsRound {
        WordGroupsRound(try #require(daily(Self.pool(langs), targets: langs)))
    }

    func pickFour(_ r: inout WordGroupsRound, _ words: [GameWord]) {
        r.clear()
        for w in words { r.toggle(w.id) }
    }

    func wrongGuesses(_ p: WordGroupsPuzzle) -> [[GameWord]] {
        let g = p.groups
        return [
            [g[0].words[0], g[0].words[1], g[1].words[0], g[1].words[1]],
            [g[0].words[0], g[0].words[2], g[1].words[0], g[1].words[2]],
            [g[0].words[0], g[0].words[3], g[1].words[0], g[1].words[3]],
            [g[2].words[0], g[2].words[1], g[3].words[0], g[3].words[1]],
        ]
    }

    @Test func solvingEveryGroupWins() throws {
        var r = try round()
        for g in r.puzzle.groups {
            pickFour(&r, g.words)
            let out = r.submit()
            #expect(out == .solved(g))
        }
        #expect(r.won && r.finished && r.tiles.isEmpty)
        #expect(r.results == [true, true, true, true] && r.mistakes == 0)
    }

    @Test func fourMistakesEndTheGame() throws {
        var r = try round()
        for guess in wrongGuesses(r.puzzle) {
            #expect(!r.finished)
            pickFour(&r, guess)
            let out = r.submit()
            #expect(out == .miss)
        }
        #expect(r.finished && !r.won && r.mistakesLeft == 0)
        #expect(r.unsolved.count == 4 && r.pattern == "0000")
        r.toggle(r.tiles[0].id)
        #expect(r.selected.count <= 4 && !r.canSubmit)
    }

    @Test func threeOfFourIsOneAway() throws {
        var r = try round()
        let g = r.puzzle.groups
        pickFour(&r, Array(g[0].words.prefix(3)) + [g[1].words[0]])
        let out = r.submit()
        #expect(out == .oneAway)
        #expect(r.mistakes == 1 && r.selected.count == 4)
    }

    @Test func repeatingAGuessCostsNothing() throws {
        var r = try round()
        let guess = wrongGuesses(r.puzzle)[0]
        pickFour(&r, guess)
        _ = r.submit()
        let out = r.submit()
        #expect(out == .repeated)
        #expect(r.mistakes == 1)
    }

    @Test func selectionStopsAtFourAndNeedsFourToSubmit() throws {
        var r = try round()
        for t in r.tiles.prefix(5) { r.toggle(t.id) }
        #expect(r.selected.count == 4 && r.canSubmit)
        r.toggle(r.tiles[0].id)
        #expect(r.selected.count == 3 && !r.canSubmit)
        let out = r.submit()
        #expect(out == .ignored)
    }

    @Test func savedProgressResumesAndKeepsTheMistakes() throws {
        var r = try round()
        let g = r.puzzle.groups[0]
        let guess = wrongGuesses(r.puzzle)[3]
        pickFour(&r, guess)
        _ = r.submit()
        pickFour(&r, g.words)
        _ = r.submit()
        let saved = try JSONDecoder().decode(WordGroupsSave.self, from: JSONEncoder().encode(r.save))
        var back = WordGroupsRound(r.puzzle, resuming: saved)
        #expect(back.solved == [g] && back.mistakes == 1 && back.tiles.count == 12)
        pickFour(&back, guess)
        let out = back.submit()
        #expect(out == .repeated)
    }

    @Test func aSaveFromAnotherBoardStartsFresh() throws {
        let r = try round()
        let back = WordGroupsRound(r.puzzle, resuming: WordGroupsSave(pattern: "01", solved: ["other"]))
        #expect(back.results.isEmpty && back.tiles.count == 16)
    }

    @Test func theResultRowReadsLikeWordle() {
        let text = GameBrag.text(title: "Bucket Word Groups", day: "11/2", score: "4 of 4", results: [true, false, true, true, true], link: "bucket.foundation")
        #expect(text.contains("🟩🟥🟩🟩🟩"))
    }
}
