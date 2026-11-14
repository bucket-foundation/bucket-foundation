import Testing
@testable import BucketKit

@Test func expectedItemsFollowDefaults() {
    #expect(ExpectedLearning.items(newPerDay: 4, retention: 0.9, days: 10) == 36)
    #expect(ExpectedLearning.items(newPerDay: 4, retention: 0.9, days: 30) == 108)
    #expect(ExpectedLearning.items(newPerDay: 4, retention: 0.9, days: 100) == 360)
}

@Test func expectedItemsGuardBadInput() {
    #expect(ExpectedLearning.items(newPerDay: 4, retention: 0.9, days: 0) == 0)
    #expect(ExpectedLearning.items(newPerDay: -2, retention: 0.9, days: 10) == 0)
    #expect(ExpectedLearning.items(newPerDay: .nan, retention: 0.9, days: 10) == 0)
    #expect(ExpectedLearning.items(newPerDay: 4, retention: 1.5, days: 10) == 40)
}

@Test func expectedWordsCountEveryTargetLanguage() {
    let e = ExpectedLearning(streak: 10, languages: [.init(newPerDay: 4, retention: 0.9, languages: 3), .init(newPerDay: 2, retention: 0.9, languages: 1)], decks: [.init(newPerDay: 5, retention: 0.8, languages: 1)])
    #expect(e.words == 36 * 3 + 18)
    #expect(e.concepts == 40)
    #expect(!e.isEmpty)
    #expect(ExpectedLearning(streak: 0, languages: [.init(newPerDay: 4, retention: 0.9, languages: 2)], decks: []).isEmpty)
}

@Test func expectedTrackReadsEngineSettings() {
    var state = EngineState()
    state.newPerDay = 6
    state.requestRetention = 0.85
    #expect(ExpectedLearning.Track(state, languages: 2) == .init(newPerDay: 6, retention: 0.85, languages: 2))
}
