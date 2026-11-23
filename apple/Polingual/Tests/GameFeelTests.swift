import Foundation
import BucketKit
import Testing
@testable import Polingual

@MainActor
struct GameFeelTests {
    func quiet() -> (GameFeel, () -> [Bool]) {
        let feel = GameFeel()
        var heard: [Bool] = []
        feel.sound = { right, _ in heard.append(right) }
        return (feel, { heard })
    }

    @Test func rightAndWrongCountSeparately() {
        let (feel, heard) = quiet()
        var streak = ComboCount()
        streak.hit()
        feel.right(streak)
        streak.miss()
        feel.wrong(streak)
        #expect(feel.rights == 1)
        #expect(feel.wrongs == 1)
        #expect(heard() == [true, false])
    }

    @Test func climbingATierCountsOnceAndScalesTheGain() {
        let (feel, _) = quiet()
        var streak = ComboCount()
        for _ in 0..<5 {
            streak.hit()
            feel.right(streak, points: 2)
        }
        #expect(feel.climbs == 2)
        #expect(feel.gain == 4)
        streak.hit()
        feel.right(streak, points: 2)
        #expect(feel.climbs == 2)
    }

    @Test func recordKeepsTheStreakAcrossAnswers() {
        let (feel, heard) = quiet()
        for _ in 0..<3 { feel.record(true) }
        #expect(feel.streak.current == 3)
        #expect(feel.streak.tier == .warm)
        #expect(feel.rights == 3)
        feel.record(false)
        #expect(feel.streak.current == 0)
        #expect(feel.streak.best == 3)
        #expect(feel.wrongs == 1)
        #expect(heard() == [true, true, true, false])
    }

    @Test func recordScalesTheGainByTier() {
        let (feel, _) = quiet()
        for _ in 0..<5 { feel.record(true, points: 3) }
        #expect(feel.gain == 6)
        #expect(feel.climbs == 2)
    }

    @Test func resetStartsANewStreakAndKeepsTheCounters() {
        let (feel, _) = quiet()
        for _ in 0..<4 { feel.record(true) }
        feel.reset()
        #expect(feel.streak == ComboCount())
        #expect(feel.rights == 4)
        feel.record(true)
        #expect(feel.streak.current == 1)
    }

    @Test func demoStreakOnlyFromTheLaunchFlag() {
        #expect(GameFeel.demoStreak(arguments: []) == ComboCount())
        #expect(GameFeel.demoStreak(arguments: ["-demoCombo", "5"]).current == 5)
        #expect(GameFeel.demoStreak(arguments: ["-demoCombo"]) == ComboCount())
    }

    @Test func reduceMotionFollowsTheSystemAndTheTestFlag() {
        #expect(GameMotion.reduced(system: true, arguments: []))
        #expect(!GameMotion.reduced(system: false, arguments: []))
        #expect(GameMotion.reduced(system: false, arguments: ["-reduceMotion"]))
    }

    @Test func tierChordDiffersFromTheRightTone() {
        #expect(GameSound.chordData(.hot) != GameSound.data(right: true, combo: 5))
        #expect(GameSound.chordData(.hot) != GameSound.chordData(.blazing))
    }
}

@MainActor
struct GameStatusBarTests {
    @Test func lightWhileAnyGameIsOnScreen() {
        #expect(!GameStatusBar.light)
        GameStatusBar.enter()
        GameStatusBar.enter()
        GameStatusBar.leave()
        #expect(GameStatusBar.light)
        GameStatusBar.leave()
        GameStatusBar.leave()
        #expect(!GameStatusBar.light)
    }
}

@MainActor
struct GameResultsTests {
    @Test func capReplacesZeroXP() {
        #expect(CreditLine.text(GameCredit(earned: 0, capped: true), shown: 0) == "Daily cap reached")
        #expect(CreditLine.text(GameCredit(earned: 0, capped: false), shown: 0) == "+0 XP")
        #expect(CreditLine.text(GameCredit(earned: 4, capped: true), shown: 4) == "+4 XP")
    }

    @Test func aRunCreditsOnceAcrossARelaunch() throws {
        let name = "credited-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        #expect(CreditedRunStore(defaults: defaults).claim("run-1"))
        #expect(!CreditedRunStore(defaults: defaults).claim("run-1"))
        #expect(CreditedRunStore(defaults: defaults).claim("run-2"))
    }

    @Test func claimedRunsPersistNewestTwenty() throws {
        let name = "credited-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        let store = CreditedRunStore(defaults: defaults)
        for i in 0..<25 { _ = store.claim("run-\(i)") }
        let saved = defaults.stringArray(forKey: CreditedRunStore.key)
        #expect(saved?.count == CreditedRuns.keep)
        #expect(saved?.first == "run-5")
        #expect(saved?.last == "run-24")
        #expect(!CreditedRunStore(defaults: defaults).claim("run-24"))
        #expect(CreditedRunStore(defaults: defaults).claim("run-0"))
    }
}

@MainActor
struct SaveNudgeTests {
    @Test func onlyGuestsGetTheNudge() throws {
        let name = "nudge-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        SaveNudge.gameEnded(signedIn: true, defaults: defaults)
        #expect(!defaults.bool(forKey: SaveNudge.key))
        SaveNudge.gameEnded(signedIn: false, defaults: defaults)
        #expect(defaults.bool(forKey: SaveNudge.key))
    }
}

struct MiniLayoutTests {
    @Test func cellsShrinkToFitAShortScreen() {
        let tall = MiniLayout(room: 780, width: 370, rows: 6, cols: 6, keys: 19)
        let short = MiniLayout(room: 560, width: 343, rows: 6, cols: 6, keys: 19)
        #expect(tall.columns == 6)
        #expect(short.columns == 7)
        #expect(short.cell < tall.cell)
        #expect(short.cell >= MiniLayout.minCell)
        #expect(tall.cell <= MiniLayout.maxCell)
    }

    @Test func widthStillCapsTheCell() {
        #expect(MiniLayout(room: 2000, width: 200, rows: 4, cols: 5, keys: 19).cell == (200.0 - 16) / 5)
    }
}
