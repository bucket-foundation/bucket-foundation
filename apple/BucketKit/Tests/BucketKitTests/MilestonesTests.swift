import Foundation
import Testing
@testable import BucketKit

@Suite struct MilestonesTests {
    @Test func earnsEveryThresholdCrossed() {
        let ids = Milestones.earned(mastered: ["es": 6], streak: 7).map(\.id)
        #expect(ids == ["streak:3", "streak:7", "mastered:es:1", "mastered:es:5"])
    }

    @Test func nextIsTheBiggestUnseen() {
        let earned = Milestones.earned(mastered: ["es": 12, "de": 1], streak: 3)
        #expect(Milestones.next(earned, seen: [])?.id == "mastered:es:10")
        #expect(Milestones.next(earned, seen: Set(earned.map(\.id))) == nil)
    }

    @Test func noMasteryNoMoment() {
        #expect(Milestones.next(Milestones.earned(mastered: ["es": 0], streak: 1), seen: []) == nil)
    }

    func corpus() throws -> LangCorpus {
        buildLangCorpus(core: PlayFixtures.corpusJSON("lang-core.json"), cognates: PlayFixtures.corpusJSON("lang-cognates.json"),
                        phrases: PlayFixtures.corpusJSON("lang-phrases.json"), layers: PlayFixtures.corpusJSON("lang-layers.json"))
    }

    func master(_ state: EngineState, _ lang: String, _ ids: [String]) -> EngineState {
        var out = state
        var now = 1_800_000_000_000.0
        for round in 0..<8 {
            for id in ids { out = gradeCard(out, lang, id, 4, now: now) }
            now += 86_400_000.0 * Double(1 << round)
        }
        return out
    }

    @Test func everySkillItemIsInTheCorpus() throws {
        let corpus = try corpus()
        let ids = Set(corpus.items.map(\.id))
        for skill in Skill.allCases {
            #expect(skill.items.allSatisfy(ids.contains), "\(skill)")
            #expect(Milestones.words(skill, lang: "es", root: "en", corpus).count == skill.items.count)
        }
        #expect(ids.contains(Milestones.helloItem))
    }

    @Test func aSkillNeedsEveryItemMastered() throws {
        let corpus = try corpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es", "de"], createdAt: 0)
        let nine = master(EngineState(), "es", Array(Skill.count.items.dropLast()))
        #expect(Milestones.feats(system, corpus, nine) == Feats())
        let seen = gradeCard(nine, "es", "ten", 3, now: 1_800_000_000_000.0)
        #expect(Milestones.feats(system, corpus, seen) == Feats())
        let ten = master(nine, "es", ["ten"])
        #expect(Milestones.feats(system, corpus, ten) == Feats(skills: ["es": [.count]]))
    }

    @Test func introducingYourselfAlsoCountsAsHello() throws {
        let corpus = try corpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es", "de"], createdAt: 0)
        var state = master(EngineState(), "es", Skill.introduce.items)
        state = master(state, "de", [Milestones.helloItem])
        #expect(Milestones.feats(system, corpus, state) == Feats(skills: ["es": [.introduce]], hello: ["es", "de"]))
    }

    @Test func aLanguageWithoutTheWordsEarnsNoSkill() throws {
        let corpus = try corpus()
        let system = LangSystem(id: "s", name: "la", root: "en", targets: ["la"], createdAt: 0)
        let state = master(EngineState(), "la", Skill.order.items + [Milestones.helloItem])
        #expect(Milestones.feats(system, corpus, state) == Feats())
    }

    @Test func featsBecomeMilestones() {
        var feats = Feats(skills: ["es": [.order, .count]], hello: ["es", "de"])
        feats.merge(Feats(skills: ["es": [.introduce], "de": [.count]], hello: ["fr"]))
        let ids = Milestones.earned(mastered: [:], streak: 0, feats: feats).map(\.id)
        #expect(ids == ["skill:count:de", "skill:count:es", "skill:introduce:es", "skill:order:es", "hello:2", "hello:3"])
        let earned = Milestones.earned(mastered: ["es": 5], streak: 3, feats: feats)
        #expect(Milestones.next(earned, seen: [])?.id == "skill:count:de")
        #expect(Milestones.next(earned, seen: ["skill:count:de"])?.id == "skill:count:es")
        #expect(Milestones.next(earned, seen: ["skill:count:es", "skill:count:de"])?.id == "skill:introduce:es")
    }

    @Test func eachFamilyGetsItsOwnMoment() throws {
        let earned = Milestones.earned(mastered: ["es": 5], streak: 30, feats: Feats(skills: ["es": [.introduce, .count]], hello: ["es", "de"]))
        var seen: Set<String> = []
        var shown: [String] = []
        while let next = Milestones.next(earned, seen: seen) {
            shown.append(next.id)
            seen.formUnion(Milestones.settled(next, earned))
        }
        #expect(shown == ["skill:count:es", "hello:2", "mastered:es:5", "streak:30"])
        #expect(seen == Set(earned.map(\.id)))
    }

    @Test func anUpgradeShowsOneSkillAndOneHello() {
        let before = Milestones.earned(mastered: ["es": 50, "de": 10], streak: 14)
        var seen = Set(before.map(\.id))
        let earned = Milestones.earned(mastered: ["es": 50, "de": 10], streak: 14, feats: Feats(skills: ["es": [.count, .order], "de": [.count]], hello: ["es", "de", "fr"]))
        var shown: [String] = []
        while let next = Milestones.next(earned, seen: seen) {
            shown.append(next.id)
            seen.formUnion(Milestones.settled(next, earned))
        }
        #expect(shown == ["skill:count:de", "hello:3"])
    }

    @Test func aPlacedCardEarnsNothingUntilStudied() throws {
        let corpus = try corpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        var state = EngineState()
        var card = Card(state: "new")
        card.stability = 400
        state.cards[cardId("es", Milestones.helloItem)] = card
        #expect(Milestones.feats(system, corpus, state) == Feats())
    }

    @Test func helloNamesTheLanguagesInOrder() throws {
        let earned = Milestones.earned(mastered: [:], streak: 0, feats: Feats(hello: ["sv", "de", "es"]))
        #expect(earned.map(\.kind) == [.hello(langs: ["de", "es"]), .hello(langs: ["de", "es", "sv"])])
        let forms = Milestones.hello(langs: ["de", "es", "xx"], try corpus())
        #expect(forms == [ShareForm(lang: "de", form: "hallo"), ShareForm(lang: "es", form: "hola")])
    }

    @Test func skillSharesStayDistinct() {
        let a = ShareObject.skill(.count, lang: "es", root: "en", words: [])
        let b = ShareObject.skill(.order, lang: "es", root: "en", words: [])
        #expect(a.id != b.id)
        #expect(a.route == ShareObject.language("es", root: "en").route)
        #expect(a.styles == [.banner])
        #expect(ShareObject.skill(.count, lang: "es", root: "en", words: [MasteredWord(form: "uno", meaning: "one")]).styles == [.list, .banner])
    }
}
