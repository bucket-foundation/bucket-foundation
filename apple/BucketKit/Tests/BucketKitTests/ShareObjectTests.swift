import Foundation
import Testing
@testable import BucketKit

private let spanish = ShareForm(lang: "es", form: "noche")
private let score = ShareScore(source: "Match", right: 9, total: 12, langs: ["fr", "es"], root: "en", streak: 4)
private let article = ShareMoment(title: "Gravity", source: "Wikipedia", branch: "02", lang: "es", quote: "La gravedad atrae. Y mucho más.")

private func query(_ o: ShareObject) -> [String: String] {
    Dictionary(uniqueKeysWithValues: o.route.items.map { ($0.name, $0.value ?? "") })
}

private let standings = ShareStandings(group: "Rossi family", rows: [
    ShareStanding(rank: 1, name: "Gia", weekly: 160, streak: 12, mastered: 240, langs: ["it", "es"], isMe: true),
    ShareStanding(rank: 2, name: "MR", weekly: 96, streak: 5, mastered: 232, langs: ["fr"], isMe: false),
], members: 4)

@Suite struct ShareObjectTests {
    let every: [ShareObject] = [
        .streak(days: 12, langs: ["fr", "es"], root: "en"),
        .system(name: "Romance", root: "en", targets: ["fr", "es"], streak: 3, learned: 90),
        .language("es", root: "en"),
        .word(id: "night", gloss: "night", forms: [spanish, ShareForm(lang: "fr", form: "nuit")]),
        .tile(form: spanish, gloss: "night", reading: "/ˈno.tʃe/"),
        .flag("es", root: "en"),
        .score(score),
        .content(article),
        .standings(standings),
    ]

    @Test func everyObjectLinksToAKnownSharePage() {
        let paths = every.map(\.route.path)
        #expect(paths == ["/l", "/l", "/l", "/w", "/w", "/l", "/x", "/c", "/l"])
        for o in every { #expect(o.route.url.absoluteString.hasPrefix("https://www.bucket.foundation/s/")) }
    }

    @Test func eachAppSharesItsOwnHost() {
        #expect(ShareRoute.host(for: "polingual") == "www.polingual.com")
        #expect(ShareRoute.host(for: "bucket") == "www.bucket.foundation")
        #expect(ShareRoute.host == ShareRoute.host(for: BucketAPI.appName))
        let route = ShareRoute.langs(["fr"], root: "en")
        #expect(route.url(host: ShareRoute.host(for: "polingual")).absoluteString == "https://www.polingual.com/s/l?l=fr&r=en")
        #expect(route.url(host: ShareRoute.host(for: "bucket")).absoluteString == "https://www.bucket.foundation/s/l?l=fr&r=en")
        #expect(ShareRoute.hosts.isSuperset(of: ["www.polingual.com", "polingual.com", "www.bucket.foundation", "bucket.foundation"]))
    }

    @Test func everyObjectOffersTwoOrThreeDistinctCards() {
        for o in every {
            #expect((2...3).contains(o.styles.count), "\(o.kind)")
            #expect(Set(o.styles).count == o.styles.count)
        }
    }

    @Test func idsSeparateObjectsThatShareALink() {
        let language = ShareObject.language("es", root: "en")
        let flag = ShareObject.flag("es", root: "en")
        #expect(language.route == flag.route)
        #expect(language.id != flag.id)
        #expect(Set(every.map(\.id)).count == every.count)
    }

    @Test func streakCarriesItsDaysAndLanguages() {
        let q = query(.streak(days: 12, langs: ["fr", "es"], root: "en"))
        #expect(q["l"] == "fr.es")
        #expect(q["r"] == "en")
        #expect(q["s"] == "12")
    }

    @Test func aOneDayStreakStaysOutOfTheLink() {
        #expect(query(.streak(days: 1, langs: ["fr"], root: "en"))["s"] == nil)
    }

    @Test func standingsLinkLeavesOutGroupNamesAndInvites() {
        let url = ShareObject.standings(standings).route.url.absoluteString
        for private_ in ["Rossi", "MR", "Gia", "c="] { #expect(!url.contains(private_)) }
        #expect(query(.standings(standings))["l"] == "it.es")
    }

    @Test func standingsWithoutTheViewerFallBackToTheHomeLink() {
        let others = ShareStandings(group: "Club", rows: [], members: 2)
        #expect(ShareObject.standings(others).route.path == "")
    }

    @Test func tileLinksOneFormOnly() {
        let q = query(.tile(form: spanish, gloss: "night", reading: nil))
        #expect(q["f"] == "es:noche")
        #expect(q["g"] == "night")
        #expect(q["id"] == "noche")
    }

    @Test func wordEscapesTheFormSeparator() {
        let q = query(.word(id: "x", gloss: "x", forms: [ShareForm(lang: "fr", form: "a|b")]))
        #expect(q["f"] == "fr:a/b")
    }

    @Test func wordKeepsSixForms() {
        let forms = (0..<9).map { ShareForm(lang: "l\($0)", form: "f") }
        #expect(query(.word(id: "x", gloss: "x", forms: forms))["f"]?.split(separator: "|").count == 6)
    }

    @Test func scoreCarriesRightTotalAndLanguages() {
        let q = query(.score(score))
        #expect(q["t"] == "Match")
        #expect(q["p"] == "9")
        #expect(q["m"] == "12")
        #expect(q["l"] == "fr.es")
        #expect(q["s"] == "4")
    }

    @Test func scoreWithoutLanguagesLeavesThemOut() {
        #expect(query(.score(ShareScore(source: "Physics", right: 5, total: 5)))["l"] == nil)
    }

    @Test func scorePercentRoundsAndSurvivesZero() {
        #expect(score.percent == 75)
        #expect(ShareScore(source: "s", right: 2, total: 3).percent == 67)
        #expect(ShareScore(source: "s", right: 0, total: 0).percent == 0)
    }

    @Test func momentKeepsItsTimestampAndLeadsWithTheMomentCard() {
        var m = article
        m.seconds = 667
        let o = ShareObject.content(m)
        #expect(query(o)["at"] == "667")
        #expect(o.styles == [.moment, .quote, .cover])
    }

    @Test func contentWithoutATimestampHasNoMomentCard() {
        let o = ShareObject.content(article)
        #expect(query(o)["at"] == nil)
        #expect(o.styles == [.quote, .cover])
    }

    @Test func lessonMomentUsesTheAtomLink() {
        let o = ShareObject.content(ShareMoment(title: "Newton", source: "Physics", branch: "02", quote: "F equals ma.", deck: "02-physics", atom: "f-ma"))
        #expect(o.route.path == "/a")
        #expect(query(o)["d"] == "02-physics")
        #expect(query(o)["id"] == "f-ma")
    }

    @Test func momentCarriesItsCatalogTopic() {
        var m = article
        m.topic = "Gravity"
        #expect(query(.content(m))["id"] == "Gravity")
    }

    @Test func momentDropsANegativeTimestamp() {
        #expect(ShareMoment(title: "t", source: "s", branch: "01", seconds: -4).seconds == nil)
    }

    @Test(arguments: [(0, "0:00"), (9, "0:09"), (667, "11:07"), (3725, "1:02:05")])
    func clockReadsLikeAPlayer(seconds: Int, text: String) {
        #expect(ShareMoment.timecode(seconds) == text)
    }

    @Test func quoteTakesTheFirstSentence() {
        #expect(article.quote == "La gravedad atrae.")
    }

    @Test func quoteDropsMarkupAndExtraSpace() {
        #expect(ShareMoment.excerpt("  The **force** is  $F=ma$. Next.") == "The force is F=ma.")
    }

    @Test func quoteOfNothingIsNil() {
        #expect(ShareMoment.excerpt(" \n ") == nil)
    }

    @Test func quoteIsCapped() {
        let long = String(repeating: "a", count: 400)
        #expect(ShareMoment.excerpt(long)?.count == 200)
    }

    @Test func longFieldsAreClipped() {
        let long = String(repeating: "a", count: 300)
        let o = ShareObject.content(ShareMoment(title: long, source: long, branch: "01", quote: long))
        #expect(o.route.url.absoluteString.count < 400)
    }
}

@Test func masteredSharesListTheirWordsFirst() {
    let words = [MasteredWord(form: "noche", meaning: "night"), MasteredWord(form: "agua", meaning: "water")]
    #expect(ShareObject.mastered(lang: "es", count: 2, root: "en", words: words).styles == [.list, .number, .banner])
    #expect(ShareObject.mastered(lang: "es", count: 2, root: "en").styles == [.number, .banner])
    #expect(ShareObject.mastered(lang: "es", count: 2, root: "en", words: words).route == ShareObject.mastered(lang: "es", count: 2, root: "en").route)
}

@Test func masteredWordsMatchTheMasteredCount() throws {
    let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
    let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
    let items = Array(corpus.items.filter { isVocab($0) && usable($0, "en", "es") }.prefix(12))
    let day = 86_400_000.0
    var now = 1_800_000_000_000.0
    var state = EngineState()
    for round in 0..<8 {
        for (k, i) in items.enumerated() where k < 6 || round == 0 { state = gradeCard(state, "es", i.id, 4, now: now) }
        now += day * Double(1 << round)
    }
    let words = masteredWords(system, corpus, state, lang: "es")
    let progress = try #require(langProgress(system, corpus, state, now: now).first)
    #expect(!words.isEmpty)
    #expect(words.count == progress.mastered)
    let forms = Set(items.compactMap { $0.form("es") })
    #expect(words.allSatisfy { forms.contains($0.form) && !$0.meaning.isEmpty })
}

@Test func masteredNumberCardNamesFewWords() {
    let one = [MasteredWord(form: "九", meaning: "nine")]
    #expect(MasteredWord.named(one, count: 1) == "九 · nine")
    #expect(MasteredWord.named([MasteredWord(form: "uno", meaning: "")], count: 1) == "uno")
    #expect(MasteredWord.named([], count: 1) == nil)
    let four = ["a", "b", "c", "d"].map { MasteredWord(form: $0, meaning: $0) }
    #expect(MasteredWord.named(four, count: 4) == nil)
    #expect(MasteredWord.named(Array(four.prefix(2)), count: 9) == nil)
}
