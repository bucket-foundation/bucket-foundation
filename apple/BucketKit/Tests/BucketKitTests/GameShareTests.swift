import Testing
@testable import BucketKit

@Suite struct GameShareTests {
    static let link = "https://polingual.com/play"

    @Test func dayNumberCountsFromThePolywordEpoch() {
        #expect(DailySeed.dayNumber("2026-11-1") == 1)
        #expect(DailySeed.dayNumber("2026-11-18") == 18)
        #expect(DailySeed.dayNumber("2026-12-01") == 31)
        #expect(DailySeed.dayNumber("2026-11-18") == Polyword.dayNumber(PolyDate(2026, 11, 18)))
    }

    @Test func dayNumberCrossesTheYearBoundary() {
        #expect(DailySeed.dayNumber("2026-12-31") == 61)
        #expect(DailySeed.dayNumber("2027-1-1") == 62)
        #expect(DailySeed.dayNumber("2028-03-01") == 487)
    }

    @Test func dayNumberRejectsBadKeysAndDaysBeforeTheEpoch() {
        #expect(DailySeed.dayNumber("2026-13-01") == nil)
        #expect(DailySeed.dayNumber("today") == nil)
        #expect(DailySeed.dayNumber("") == nil)
        #expect(DailySeed.dayNumber("2026-10-31") == nil)
    }

    @Test func unparseableDayKeyOmitsTheNumber() {
        let share = GameShare(title: "Polingual Mini", dayKey: "soon", shape: .marks([true]), link: Self.link)
        #expect(share.day == nil)
        #expect(share.text == "Polingual Mini 1/1\n🟩\n\(Self.link)")
        #expect(!share.text.contains("#"))
    }

    @Test func nonDailyGamesCarryNoNumber() {
        let share = GameShare(title: "Polingual Word Snake", dayKey: nil, shape: .points(12, marks: []), streak: 3, link: Self.link)
        #expect(share.text == "Polingual Word Snake ⭐ 12\n🔥 3\n\(Self.link)")
    }

    @Test func eachAppSharesItsOwnNameAndLink() {
        let bucket = GameShare(title: "Bucket Daily Set", day: 18, shape: .marks([true, false]), link: "https://bucket.foundation")
        #expect(bucket.text == "Bucket Daily Set #18 1/2\n🟩🟥\nhttps://bucket.foundation")
        #expect(!bucket.text.contains("polingual"))
    }

    @Test func polywordShowsGuessRowsWithoutLetters() {
        let answer = "perro"
        let guesses = ["carta", "pesos", "perro"]
        let rows = guesses.map { Polyword.score($0, answer) }
        let share = GameShare(title: "Polingual Polyword", dayKey: "2026-11-18", shape: .guesses(rows: rows, solved: true, limit: Polyword.maxGuesses), streak: 5, link: Self.link)
        #expect(share.text == "Polingual Polyword #18 3/6\n⬜⬜🟩⬜⬜\n🟩🟩⬜🟨⬜\n🟩🟩🟩🟩🟩\n🔥 5\n\(Self.link)")
        for word in guesses + [answer] { #expect(!share.text.lowercased().contains(word)) }
    }

    @Test func polywordLossScoresAnX() {
        let rows = Array(repeating: [PolyMark.miss, .miss, .near, .miss, .miss], count: 6)
        let share = GameShare(title: "Polyword", day: 2, shape: .guesses(rows: rows, solved: false, limit: 6), link: Self.link)
        #expect(share.text.hasPrefix("Polyword #2 X/6\n⬜⬜🟨⬜⬜\n"))
        #expect(share.text.components(separatedBy: "\n").count == 8)
    }

    @Test func wordGroupsShowsSolveOrderAndMisses() {
        let share = GameShare(title: "Word Groups", day: 18, shape: .groups(order: [2, 0, 3], attempts: [true, false, true, false, true, false, false], total: 4), streak: 2, link: Self.link)
        #expect(share.text == "Word Groups #18 3/4\n🟦🟦🟦🟦\n⬛⬛⬛⬛\n🟨🟨🟨🟨\n⬛⬛⬛⬛\n🟪🟪🟪🟪\n⬛⬛⬛⬛\n⬛⬛⬛⬛\n🔥 2\n\(Self.link)")
    }

    @Test func wordGroupsWithoutAttemptHistoryListsSolvedRows() {
        let share = GameShare(title: "Word Groups", day: 3, shape: .groups(order: [1, 0, 2, 3], attempts: [], total: 4), link: Self.link)
        #expect(share.text == "Word Groups #3 4/4\n🟩🟩🟩🟩\n🟨🟨🟨🟨\n🟦🟦🟦🟦\n🟪🟪🟪🟪\n\(Self.link)")
    }

    @Test func groupOrderMapsSolvedIdsToBoardPositions() {
        #expect(GameShare.groupOrder(solved: ["c", "a"], groups: ["a", "b", "c", "d"]) == [2, 0])
        #expect(GameShare.groupOrder(solved: [], groups: ["a", "b"]) == [])
    }

    @Test func groupOrderFallsBackToSolveSequenceWithoutTheBoard() {
        #expect(GameShare.groupOrder(solved: ["c", "a", "d"], groups: []) == [0, 1, 2])
        #expect(GameShare.groupOrder(solved: ["c", "x"], groups: ["a", "b", "c", "d"]) == [0, 1])
    }

    @Test func quizShowsHitsAndMisses() {
        let share = GameShare(title: "Daily Set", day: 18, shape: .marks([true, true, false, true, true, true]), streak: 7, link: Self.link)
        #expect(share.text == "Daily Set #18 5/6\n🟩🟩🟥🟩🟩🟩\n🔥 7\n\(Self.link)")
    }

    @Test func shiftMarksEachTargetWithoutNamingIt() {
        let targets = ["perro", "chien", "gato", "chat"]
        let found: Set<String> = ["perro", "chat"]
        let share = GameShare(title: "Shift", day: 18, shape: .marks(targets.map { found.contains($0) }), link: Self.link)
        #expect(share.text == "Shift #18 2/4\n🟩🟥🟥🟩\n\(Self.link)")
        for word in targets { #expect(!share.text.contains(word)) }
    }

    @Test func atlasShowsPointsAndARoundRow() {
        let scores = [5000, 1200, 2600, 0, 4100]
        let share = GameShare(title: "Voice Atlas", day: 18, shape: .points(scores.reduce(0, +), marks: scores.map { $0 > Atlas.max / 2 }), link: Self.link)
        let row = scores.map { $0 > Atlas.max / 2 ? "🟩" : "🟥" }.joined()
        #expect(share.text == "Voice Atlas #18 ⭐ 12900\n\(row)\n\(Self.link)")
    }

    @Test func miniShowsTimeAndBoardShape() {
        let share = GameShare(title: "Mini", day: 18, shape: .time(seconds: 65, cells: [[true, false], [true, true]]), link: Self.link)
        #expect(share.text == "Mini #18 ⏱ 1:05\n\(GameBrag.grid([[true, false], [true, true]]))\n\(Self.link)")
    }

    @Test func pointsGamesShowScoreWithOptionalMarks() {
        #expect(GameShare(title: "Speed Match", day: nil, shape: .points(1200, marks: []), link: Self.link).text == "Speed Match ⭐ 1200\n\(Self.link)")
        #expect(GameShare(title: "Flag Duel", day: nil, shape: .points(14, marks: [true, false]), link: Self.link).text == "Flag Duel ⭐ 14\n🟩🟥\n\(Self.link)")
    }

    @Test func streakLineAppearsOnlyAboveZero() {
        let none = GameShare(title: "Flags", day: nil, shape: .marks([true]), link: Self.link)
        #expect(!none.text.contains("🔥"))
        #expect(none.text.hasSuffix(Self.link))
    }

    @Test func clockPadsSeconds() {
        #expect(GameShare.clock(9) == "0:09")
        #expect(GameShare.clock(600) == "10:00")
        #expect(GameShare.clock(-4) == "0:00")
    }
}
