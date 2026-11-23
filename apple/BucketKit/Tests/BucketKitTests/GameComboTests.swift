import Testing
@testable import BucketKit

@Suite struct GameComboTests {
    @Test func tiersClimbAtThreeFiveAndTen() {
        #expect(ComboTier.at(0) == .none)
        #expect(ComboTier.at(2) == .none)
        #expect(ComboTier.at(3) == .warm)
        #expect(ComboTier.at(5) == .hot)
        #expect(ComboTier.at(9) == .hot)
        #expect(ComboTier.at(10) == .blazing)
        #expect(ComboTier.at(40) == .blazing)
        #expect([ComboTier.none, .warm, .hot, .blazing].map(\.multiplier) == [1, 1, 2, 3])
    }

    @Test func countFlagsTheHitThatClimbsATier() {
        var c = ComboCount()
        var climbs: [Int] = []
        for i in 1...10 {
            c.hit()
            if c.climbed { climbs.append(i) }
        }
        #expect(climbs == [3, 5, 10])
        #expect(c.multiplier == 3)
    }

    @Test func missBreaksTheRunAndKeepsBest() {
        var c = ComboCount()
        c.miss()
        #expect(!c.broke)
        for _ in 0..<4 { c.hit() }
        c.miss()
        #expect(c.broke)
        #expect(c.current == 0)
        #expect(c.best == 4)
        #expect(c.tier == .none)
        c.record(true)
        #expect(!c.broke)
        #expect(c.current == 1)
        #expect(c.best == 4)
    }

    @Test func starsFollowAccuracy() {
        #expect(GameStars.rating(hits: 0, total: 10) == 0)
        #expect(GameStars.rating(hits: 0, total: 0) == 0)
        #expect(GameStars.rating(hits: 1, total: 10) == 1)
        #expect(GameStars.rating(hits: 5, total: 10) == 1)
        #expect(GameStars.rating(hits: 6, total: 10) == 2)
        #expect(GameStars.rating(hits: 8, total: 10) == 2)
        #expect(GameStars.rating(hits: 9, total: 10) == 3)
        #expect(GameStars.rating(hits: 12, total: 10) == 3)
    }

    @Test func starEdgesUseExactCutoffs() {
        #expect(GameStars.rating(hits: 4, total: 10) == 1)
        #expect(GameStars.rating(hits: 4, total: 5) == 2)
        #expect(GameStars.rating(hits: 4, total: 4) == 3)
        #expect(GameStars.rating(hits: 11, total: 10) == 3)
        #expect(GameStars.rating(hits: 11, total: 12) == 3)
        #expect(GameStars.rating(hits: 11, total: 13) == 2)
        #expect(GameStars.rating(hits: 59, total: 100) == 1)
        #expect(GameStars.rating(hits: 60, total: 100) == 2)
        #expect(GameStars.rating(hits: 89, total: 100) == 2)
        #expect(GameStars.rating(hits: 90, total: 100) == 3)
        #expect(GameStars.rating(hits: 3, total: 5) == 2)
        #expect(GameStars.rating(hits: 2, total: 3) == 2)
    }

    @Test func runTracksComboTierAndStars() {
        let prompts = words(10).enumerated().map { GamePrompt(id: $0.offset, mode: .form, word: $0.element, choices: [$0.element.form, "x"], answer: $0.element.form) }
        var run = GameRun(prompts)
        for (i, p) in prompts.enumerated() {
            _ = run.answer(i == 6 || i == 8 ? "x" : p.answer)
            if i == 4 { #expect(run.tier == .hot && run.multiplier == 2) }
            run.advance()
        }
        #expect(run.done)
        #expect(run.combo == 1)
        #expect(run.bestCombo == 6)
        #expect(run.stars == 2)
    }

    @Test func replayedRunHasNoCombo() {
        let prompts = words(4).enumerated().map { GamePrompt(id: $0.offset, mode: .form, word: $0.element, choices: [$0.element.form], answer: $0.element.form) }
        let run = GameRun(prompts, replaying: "1111")
        #expect(run.combo == 0)
        #expect(run.stars == 3)
    }
}

@Suite struct GameCreditTests {
    @Test func creditIsTheLedgerGain() {
        #expect(GameCredit.between(before: 4, after: 9, hits: 5) == GameCredit(earned: 5, capped: false))
        #expect(GameCredit.between(before: 0, after: 0, hits: 0) == GameCredit(earned: 0, capped: false))
    }

    @Test func capShowsWhenHitsEarnNothing() {
        #expect(GameCredit.between(before: 30, after: 30, hits: 6) == GameCredit(earned: 0, capped: true))
        #expect(GameCredit.between(before: 27, after: 30, hits: 6) == GameCredit(earned: 3, capped: true))
        #expect(GameCredit.between(before: 2, after: 2, hits: 6) == GameCredit(earned: 0, capped: false))
    }

    @Test func aRunIsClaimedOnce() {
        var runs = CreditedRuns()
        let c1 = runs.claim("a")
        #expect(c1)
        let c2 = runs.claim("a")
        #expect(!c2)
        var reloaded = CreditedRuns(runs.ids)
        let c3 = reloaded.claim("a")
        #expect(!c3)
        let c4 = reloaded.claim("b")
        #expect(c4)
    }

    @Test func claimsKeepTheNewestTwenty() {
        var runs = CreditedRuns()
        for i in 0..<25 { _ = runs.claim("r\(i)") }
        #expect(runs.ids.count == CreditedRuns.keep)
        #expect(runs.ids.first == "r5")
        let c5 = runs.claim("r0")
        #expect(c5)
        let c6 = runs.claim("r24")
        #expect(!c6)
    }
}
