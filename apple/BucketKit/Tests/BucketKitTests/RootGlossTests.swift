import Foundation
import Testing
@testable import BucketKit

struct RootGlossTests {
    static func generated() throws -> (LangCorpus, [ExerciseKind: [(Exercise, LangItem)]]) {
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        let sys = try createSystem("en", ["es", "fr", "ru"], [], now: 1)
        var byKind: [ExerciseKind: [(Exercise, LangItem)]] = [:]
        let items = corpus.items.filter { $0.form("en") != nil }.prefix(60)
        for item in items {
            for lang in sys.targets where item.form(lang) != nil {
                for reps in [0, 1, 3, 6] {
                    var card = Card()
                    card.reps = reps
                    for seed in 0..<12 {
                        var rng = Rng(seed: UInt32(seed))
                        let ex = exerciseFor(corpus, sys, item, lang, card, &rng, speech: true, afterIntro: reps > 0)
                        byKind[ex.kind, default: []].append((ex, item))
                    }
                }
            }
            var rng = Rng(seed: 5)
            if let m = matchExercise(corpus, sys, item, &rng) { byKind[m.kind, default: []].append((m, item)) }
        }
        return (corpus, byKind)
    }

    @Test(arguments: [ExerciseKind.intro, .choose, .reverse, .listen, .translate, .typeHeard, .speak, .cloze, .cognate, .match, .sentence, .wordbank, .gender, .conjugate, .falseFriend, .spellHeard])
    func everyWordCardShowsTheRootTranslation(_ kind: ExerciseKind) throws {
        let (corpus, byKind) = try Self.generated()
        guard let made = byKind[kind] else { return }
        for (ex, item) in made {
            let gloss = RootGloss.text(ex, corpus)
            #expect(gloss != nil, "\(kind.rawValue) \(item.id)")
            if ex.kind != .sentence, ex.meaning == nil { #expect(gloss == item.form("en"), "\(kind.rawValue) \(item.id)") }
        }
    }

    @Test func coverageReportsWhichKindsTheEngineProduced() throws {
        let (_, byKind) = try Self.generated()
        #expect(byKind.keys.count >= 6)
    }
}
