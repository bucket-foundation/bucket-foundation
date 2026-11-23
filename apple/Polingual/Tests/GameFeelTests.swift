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
