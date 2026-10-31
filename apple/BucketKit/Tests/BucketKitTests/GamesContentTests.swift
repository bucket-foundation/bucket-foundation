import Foundation
import Testing
@testable import BucketKit

func words(_ n: Int) -> [GameWord] {
    (0..<n).map { GameWord(itemId: "i\($0)", lang: "fr", form: "mot\($0)", gloss: "word\($0)", root: "en") }
}

@Suite struct GamesTests {
    @Test func learnedWordsComeFromStartedCardsOnly() throws {
        let corpus = try translateCorpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        let item = try #require(corpus.items.first { isVocab($0) && $0.form("es") != nil && $0.form("en") != nil && $0.form("es") != $0.form("en") })
        let other = try #require(corpus.items.last { isVocab($0) && $0.form("es") != nil && $0.form("en") != nil && $0.form("es") != $0.form("en") })
        var state = gradeCard(EngineState(), "es", item.id, 3, now: 1_800_000_000_000)
        state = queueNew(state, "es", other.id, now: 1_800_000_000_000)
        let learned = GameWords.learned([system], states: ["s": state], corpus: corpus)
        #expect(learned.map(\.itemId) == [item.id])
        #expect(learned.first?.form == item.form("es"))
        #expect(!GameWords.starter([system], corpus: corpus).isEmpty)
    }

    @Test func pickAvoidsRepeatedGlosses() {
        var rng = SeededRandom(seed: 7)
        var ws = words(6)
        ws.append(GameWord(itemId: "dup", lang: "es", form: "palabra0", gloss: "word0", root: "en"))
        let picked = GameWords.pick(ws, count: 10, using: &rng)
        #expect(Set(picked.map(\.gloss)).count == picked.count)
        #expect(picked.count == 6)
    }

    @Test func matchRoundCountsMissesAndFinishes() {
        var rng = SeededRandom(seed: 1)
        var round = MatchRound(words(3), using: &rng)
        #expect(round.pickRight("i0") == .ignored)
        #expect(round.pickLeft("i0") == .picked)
        #expect(round.pickRight("i1") == .missed)
        #expect(round.misses == 1)
        for id in ["i0", "i1", "i2"] {
            _ = round.pickLeft(id)
            #expect(round.pickRight(id) == .matched)
        }
        #expect(round.done)
        #expect(round.pickLeft("i0") == .ignored)
    }

    @Test func memoryBoardPairsFormsWithGlosses() {
        var rng = SeededRandom(seed: 3)
        var board = MemoryBoard(words(3), using: &rng)
        #expect(board.tiles.count == 6)
        let first = board.tiles[0]
        let mate = board.tiles.first { $0.wordId == first.wordId && $0.id != first.id }!
        let stranger = board.tiles.first { $0.wordId != first.wordId }!
        #expect(board.flip(first.id) == .flipped)
        #expect(board.flip(first.id) == .ignored)
        #expect(board.flip(stranger.id) == .missed)
        #expect(board.turns == 1)
        #expect(board.flip(first.id) == .ignored)
        board.hide()
        #expect(board.flip(first.id) == .flipped)
        #expect(board.flip(mate.id) == .matched)
        #expect(board.isFaceUp(first.id) && board.isFaceUp(mate.id))
        for w in Set(board.tiles.map(\.wordId)).subtracting([first.wordId]) {
            let pair = board.tiles.filter { $0.wordId == w }
            board.hide()
            _ = board.flip(pair[0].id)
            #expect(board.flip(pair[1].id) == .matched)
        }
        #expect(board.done)
    }

    @Test func flagRoundOffersTheRightLanguage() {
        var rng = SeededRandom(seed: 9)
        let round = FlagRound(word: words(1)[0], langs: ["fr", "es", "de", "it", "pt"], using: &rng)
        #expect(round.choices.count == 4)
        #expect(round.choices.contains("fr"))
        #expect(Set(round.choices).count == 4)
        #expect(round.isRight("fr") && !round.isRight("es"))
    }
}

@Suite struct ContentTests {
    @Test func everyBranchHasTopicsAndTheFilterWorks() {
        for b in ContentCatalog.branches { #expect(ContentCatalog.topics(in: b.id).count == 4) }
        #expect(ContentCatalog.topics(in: nil).count == 28)
    }

    @Test func radioNamesAndBranchTags() {
        #expect(ContentCatalog.radioName("fr") == "french")
        #expect(ContentCatalog.radioName("zh") == "chinese")
        #expect(ContentCatalog.radioName("grc") == nil)
        #expect(ContentCatalog.branch(forTags: "News,Talk") == "00")
        #expect(ContentCatalog.branch(forTags: "philosophy,talk") == "07")
        #expect(ContentCatalog.branch(forTags: "pop,hits") == "00")
        #expect(ContentCatalog.branch(forTags: "Science") == "02")
    }

    static let stationsBody = try! JSONSerialization.data(withJSONObject: [
        ["stationuuid": "a", "name": " France Culture ", "url_resolved": "https://x/a.mp3", "country": "France", "countrycode": "FR", "tags": "culture,philosophy", "favicon": "", "votes": 900],
        ["stationuuid": "b", "name": "France Culture", "url_resolved": "https://x/b.mp3", "country": "France", "countrycode": "FR", "tags": "", "favicon": "", "votes": 50],
        ["stationuuid": "c", "name": "Broken", "url_resolved": "", "country": "Belgium", "countrycode": "BE", "tags": "", "favicon": "", "votes": 50],
        ["stationuuid": "d", "name": "Plain", "url_resolved": "http://x/d.mp3", "country": "Belgium", "countrycode": "BE", "tags": "", "favicon": "", "votes": 50],
        ["stationuuid": "e", "name": "Quiet", "url_resolved": "https://x/e.mp3", "country": "Belgium", "countrycode": "BE", "tags": "", "favicon": "", "votes": 2],
    ])

    @Test func stationsKeepHttpsVotedAndDistinct() async throws {
        let defaults = try #require(UserDefaults(suiteName: "content-tests-a"))
        defaults.removePersistentDomain(forName: "content-tests-a")
        let seen = LockedBox<[URLRequest]>([])
        let api = ContentAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            if r.url?.host() == "all.api.radio-browser.info" { return (200, try! JSONSerialization.data(withJSONObject: [["name": "nl1.api.radio-browser.info"]])) }
            return (200, Self.stationsBody)
        }, defaults: defaults)
        let s = try await api.stations("fr")
        #expect(s.map(\.name) == ["France Culture"])
        #expect(s.first?.branch == "07")
        let search = try #require(seen.value.last)
        #expect(search.url?.host() == "nl1.api.radio-browser.info")
        #expect(search.url?.query?.contains("language=french") == true)
        #expect(search.url?.query?.contains("is_https=true") == true)
        #expect(search.value(forHTTPHeaderField: "user-agent")?.hasPrefix("Bucket/") == true)
        #expect(defaults.string(forKey: ContentAPI.serverKey) == "nl1.api.radio-browser.info")
    }

    @Test func stationsFallBackWhenAServerFails() async throws {
        let defaults = try #require(UserDefaults(suiteName: "content-tests-b"))
        defaults.removePersistentDomain(forName: "content-tests-b")
        defaults.set("dead.api.radio-browser.info", forKey: ContentAPI.serverKey)
        let api = ContentAPI(transport: StubTransport { r in
            switch r.url?.host() {
            case "all.api.radio-browser.info", "dead.api.radio-browser.info": (503, Data())
            default: (200, Self.stationsBody)
            }
        }, defaults: defaults)
        #expect(try await api.stations("fr").count == 1)
        #expect(defaults.string(forKey: ContentAPI.serverKey) == ContentAPI.fallbackHosts[0])
    }

    @Test func titlesFollowLangLinks() async throws {
        let api = ContentAPI(transport: StubTransport { _ in
            (200, json(["query": ["pages": [["title": "Gravity", "langlinks": [["lang": "fr", "title": "Gravitation"], ["lang": "de", "title": "Gravitation"]]]]]]))
        })
        let t = try await api.titles("Gravity")
        #expect(t == ["en": "Gravity", "fr": "Gravitation", "de": "Gravitation"])
    }

    @Test func summaryUsesTheLanguageWiki() async throws {
        let seen = LockedBox<URLRequest?>(nil)
        let api = ContentAPI(transport: StubTransport { r in
            seen.mutate { $0 = r }
            return (200, json(["title": "Nombre premier", "extract": "Un nombre premier est un entier naturel."]))
        })
        let s = try await api.summary("fr", title: "Nombre premier")
        #expect(s.extract.hasPrefix("Un nombre"))
        #expect(seen.value?.url?.absoluteString == "https://fr.wikipedia.org/api/rest_v1/page/summary/Nombre_premier")
    }

    @Test func wordTapsRoundTrip() throws {
        let ws = WordTaps.words("L'eau, c'est la vie. 42")
        #expect(ws.map(\.word).contains("vie"))
        #expect(!ws.map(\.word).contains("42"))
        let url = try #require(WordTaps.link(lang: "fr", word: "vie"))
        #expect(WordTaps.parse(url)! == ("fr", "vie"))
        #expect(WordTaps.parse(URL(string: "https://x")!) == nil)
    }

    @Test func everyWordInTheTextCarriesItsOwnLink() {
        for (text, lang, want) in [
            ("L'eau, c'est la vie. 42", "fr", ["L'eau", "c'est", "la", "vie"]),
            ("😀 hola, señor", "es", ["hola", "señor"]),
            ("قال الولد", "ar", ["قال", "الولد"]),
        ] {
            let out = WordTaps.attributed(text, lang: lang)
            let linked = out.runs.filter { $0.link != nil }
            #expect(linked.map { String(out[$0.range].characters) } == want)
            #expect(linked.compactMap { $0.link.flatMap(WordTaps.parse)?.word } == want)
            #expect(linked.allSatisfy { $0.link.flatMap(WordTaps.parse)?.lang == lang })
            #expect(String(out.characters) == text)
        }
    }

    @Test func aTileLinksOnlyASingleWord() throws {
        let url = try #require(WordTaps.tileLink("casa", lang: "es"))
        #expect(WordTaps.parse(url)! == ("es", "casa"))
        #expect(WordTaps.tileLink("buenos días", lang: "es") == nil)
        #expect(WordTaps.tileLink("42", lang: "es") == nil)
    }

    @Test func aWordTappedInItsOwnFactsStaysPut() {
        let casa = WordDetail(word: "casa", lang: "es", gloss: "house", reading: nil)
        #expect(!casa.leadsTo("casa", lang: "es"))
        #expect(!casa.leadsTo("Casa", lang: "es"))
        #expect(casa.leadsTo("blanca", lang: "es"))
        #expect(casa.leadsTo("casa", lang: "pt"))
    }

    @Test func theCardHoldsTheMeaningUntilTheAnswer() {
        let known = WordDetail(word: "casa", lang: "es", gloss: "house", reading: nil)
        let unknown = WordDetail(word: "zzz", lang: "es", gloss: nil, reading: nil)
        #expect(known.cardLine(reveal: false) == .afterAnswer)
        #expect(known.cardLine(reveal: true) == .meaning("house"))
        #expect(unknown.cardLine(reveal: false) == .noEntry)
        #expect(unknown.cardLine(reveal: true) == .noEntry)
    }

    @Test func youtubeSearchLink() {
        #expect(ContentCatalog.youtube("Gravitation physique").absoluteString == "https://www.youtube.com/results?search_query=Gravitation%20physique")
    }
}
