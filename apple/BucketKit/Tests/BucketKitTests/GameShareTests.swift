import Testing
@testable import BucketKit

@Suite struct GameShareTests {
    static let link = "https://polingual.com/play"

    @Test func dayNumberCountsFromThePolywordEpoch() {
        #expect(DailySeed.dayNumber("2026-11-1") == 1)
        #expect(DailySeed.dayNumber("2026-11-18") == 18)
        #expect(DailySeed.dayNumber("2026-12-01") == 31)
        #expect(DailySeed.dayNumber("2026-13-01") == nil)
        #expect(DailySeed.dayNumber("today") == nil)
        #expect(DailySeed.dayNumber("2026-11-18") == Polyword.dayNumber(PolyDate(2026, 11, 18)))
    }

    @Test func polywordShowsGuessRowsWithoutLetters() {
        let answer = "perro"
        let guesses = ["carta", "pesos", "perro"]
        let rows = guesses.map { Polyword.score($0, answer) }
        let share = GameShare(title: "Polyword", dayKey: "2026-11-18", shape: .guesses(rows: rows, solved: true, limit: Polyword.maxGuesses), streak: 5)
        #expect(share.text == "Polyword #18 3/6\n⬜⬜🟩⬜⬜\n🟩🟩⬜🟨⬜\n🟩🟩🟩🟩🟩\n🔥 5\n\(Self.link)")
        for word in guesses + [answer] { #expect(!share.text.lowercased().contains(word)) }
    }

    @Test func polywordLossScoresAnX() {
        let rows = Array(repeating: [PolyMark.miss, .miss, .near, .miss, .miss], count: 6)
        let share = GameShare(title: "Polyword", day: 2, shape: .guesses(rows: rows, solved: false, limit: 6))
        #expect(share.text.hasPrefix("Polyword #2 X/6\n⬜⬜🟨⬜⬜\n"))
        #expect(share.text.components(separatedBy: "\n").count == 8)
    }

    @Test func wordGroupsShowsSolveOrderAndMisses() {
        let share = GameShare(title: "Word Groups", day: 18, shape: .groups(order: [2, 0, 3], attempts: [true, false, true, false, true, false, false], total: 4), streak: 2)
        #expect(share.text == "Word Groups #18 3/4\n🟦🟦🟦🟦\n⬛⬛⬛⬛\n🟨🟨🟨🟨\n⬛⬛⬛⬛\n🟪🟪🟪🟪\n⬛⬛⬛⬛\n⬛⬛⬛⬛\n🔥 2\n\(Self.link)")
    }

    @Test func wordGroupsWithoutAttemptHistoryListsSolvedRows() {
        let share = GameShare(title: "Word Groups", day: 3, shape: .groups(order: [1, 0, 2, 3], attempts: [], total: 4))
        #expect(share.text == "Word Groups #3 4/4\n🟩🟩🟩🟩\n🟨🟨🟨🟨\n🟦🟦🟦🟦\n🟪🟪🟪🟪\n\(Self.link)")
    }

    @Test func quizShowsHitsAndMisses() {
        let share = GameShare(title: "Daily Set", day: 18, shape: .marks([true, true, false, true, true, true]), streak: 7)
        #expect(share.text == "Daily Set #18 5/6\n🟩🟩🟥🟩🟩🟩\n🔥 7\n\(Self.link)")
    }

    @Test func miniShowsTimeAndBoardShape() {
        let share = GameShare(title: "Mini", day: 18, shape: .time(seconds: 65, cells: [[true, false], [true, true]]))
        #expect(share.text == "Mini #18 ⏱ 1:05\n🟩⬛️\n🟩🟩\n\(Self.link)")
    }

    @Test func pointsGamesShowScoreWithOptionalMarks() {
        #expect(GameShare(title: "Speed Match", day: 18, shape: .points(1200, marks: [])).text == "Speed Match #18 ⭐ 1200\n\(Self.link)")
        #expect(GameShare(title: "Flag Duel", day: 18, shape: .points(14, marks: [true, false])).text == "Flag Duel #18 ⭐ 14\n🟩🟥\n\(Self.link)")
    }

    @Test func streakLineAppearsOnlyAboveZero() {
        let none = GameShare(title: "Flags", day: 1, shape: .marks([true]))
        #expect(!none.text.contains("🔥"))
        #expect(none.text.hasSuffix(Self.link))
    }

    @Test func clockPadsSeconds() {
        #expect(GameShare.clock(9) == "0:09")
        #expect(GameShare.clock(600) == "10:00")
        #expect(GameShare.clock(-4) == "0:00")
    }
}
