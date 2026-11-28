import Foundation
import Testing
@testable import Polingual

@Test func asksAfterAStrongSessionOrAStreakMilestone() {
    let now = Date(timeIntervalSince1970: 2_000_000_000)
    #expect(Feedback.shouldAsk(streak: 1, graded: 12, correct: 11, now: now, last: 0))
    #expect(!Feedback.shouldAsk(streak: 1, graded: 12, correct: 8, now: now, last: 0))
    #expect(Feedback.shouldAsk(streak: 7, graded: 6, correct: 5, now: now, last: 0))
    #expect(!Feedback.shouldAsk(streak: 7, graded: 2, correct: 2, now: now, last: 0))
    #expect(!Feedback.shouldAsk(streak: 7, graded: 6, correct: 5, now: now, last: now.timeIntervalSince1970 - 10 * 86_400))
    #expect(Feedback.shouldAsk(streak: 30, graded: 8, correct: 7, now: now, last: now.timeIntervalSince1970 - 61 * 86_400))
}

@Test func feedbackMailCarriesTheAppAndVersion() {
    let url = Feedback.mailURL.absoluteString
    #expect(url.hasPrefix("mailto:support@polingual.com"))
    #expect(url.contains("Polingual%20feedback"))
}

@Test func asksAfterTheThirdThreeStarGameInAQuietWindow() {
    let now = Date(timeIntervalSince1970: 2_000_000_000)
    #expect(Feedback.isGameWin(stars: 3))
    #expect(!Feedback.isGameWin(stars: 2))
    #expect(!Feedback.isGameWin(stars: nil))
    #expect(!Feedback.shouldAskAfterGame(wins: 2, now: now, last: 0))
    #expect(Feedback.shouldAskAfterGame(wins: 3, now: now, last: 0))
    #expect(!Feedback.shouldAskAfterGame(wins: 5, now: now, last: now.timeIntervalSince1970 - 30 * 86_400))
    #expect(Feedback.shouldAskAfterGame(wins: 5, now: now, last: now.timeIntervalSince1970 - 61 * 86_400))
}
