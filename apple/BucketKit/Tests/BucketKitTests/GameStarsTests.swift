import Testing
@testable import BucketKit

@Test func starsRewardCleanRounds() {
    #expect(GameStars.match(misses: 0) == 3)
    #expect(GameStars.match(misses: 2) == 2)
    #expect(GameStars.match(misses: 5) == 1)
    #expect(GameStars.memory(turns: 8, pairs: 6) == 3)
    #expect(GameStars.memory(turns: 12, pairs: 6) == 2)
    #expect(GameStars.memory(turns: 13, pairs: 6) == 1)
    #expect(GameStars.flags(score: 9, of: 10) == 3)
    #expect(GameStars.flags(score: 7, of: 10) == 2)
    #expect(GameStars.flags(score: 3, of: 10) == 1)
    #expect(GameStars.isBest(3, previous: nil, lowerWins: true))
    #expect(GameStars.isBest(2, previous: 4, lowerWins: true))
    #expect(!GameStars.isBest(4, previous: 4, lowerWins: true))
    #expect(GameStars.isBest(8, previous: 7, lowerWins: false))
}

@Test func missedWordsReplayAsReviewsForCardedWordsOnly() {
    var list = GameReplay.adding(["fr:a", "es:b"], to: [])
    list = GameReplay.adding(["fr:a"], to: list)
    #expect(list == ["es:b", "fr:a"])
    #expect(GameReplay.adding((0..<20).map { "fr:\($0)" }, to: list).count == GameReplay.cap)
    let system = LangSystem(id: "s", name: "s", root: "en", targets: ["fr", "es"], createdAt: 0)
    let entries = GameReplay.entries(["fr:a", "es:b", "de:c"], in: system) { lang, _ in lang == "fr" }
    #expect(entries == [QueueEntry(itemId: "a", lang: "fr", stage: .review)])
}
