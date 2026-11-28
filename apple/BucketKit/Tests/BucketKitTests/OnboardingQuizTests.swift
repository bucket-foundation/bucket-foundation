import Foundation
import Testing
@testable import BucketKit

struct OnboardingQuizTests {
    var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        return c
    }

    func day(_ y: Int, _ m: Int, _ d: Int, hour: Int = 15) -> Date {
        calendar.date(from: DateComponents(year: y, month: m, day: d, hour: hour))!
    }

    @Test func threeMonthPlanCountsDaysFromTodayAtTheAppPace() {
        let plan = PersonalPlan(QuizAnswers(minutes: .fifteen, deadline: .quarter), languages: 3, now: day(2026, 11, 28), calendar: calendar)
        #expect(plan.until == calendar.startOfDay(for: day(2027, 2, 28)))
        #expect(plan.days == 92)
        #expect(plan.wordsPerLanguage == ExpectedLearning.items(newPerDay: Double(Lang.newPerLangPerDay), retention: 0.9, days: 92))
        #expect(plan.wordsPerLanguage == 414)
        #expect(plan.words == 414 * 3)
        #expect(plan.newToday == Lang.newPerLangPerDay * 3)
        #expect(plan.minutes == 15)
        #expect(plan.dated)
    }

    @Test func openDeadlinePlansThreeMonthsUndatedAndUnansweredMinutesStayEmpty() {
        let open = PersonalPlan(QuizAnswers(deadline: .open), languages: 1, now: day(2026, 11, 28), calendar: calendar)
        let none = PersonalPlan(QuizAnswers(), languages: 1, now: day(2026, 11, 28), calendar: calendar)
        #expect(open.deadline == .quarter)
        #expect(!open.dated)
        #expect(open.days == 92)
        #expect(none == open)
        #expect(none.minutes == nil)
        #expect(none.reminderMinute == nil)
    }

    @Test func yearPlanAndPracticeTimeSetTheReminderMinute() {
        let plan = PersonalPlan(QuizAnswers(time: .evening, deadline: .year), languages: 2, now: day(2026, 11, 28, hour: 23), calendar: calendar)
        #expect(plan.days == 365)
        #expect(plan.reminderMinute == 18 * 60)
        #expect(QuizTime.allCases.map(\.minute) == [480, 750, 1080, 1260])
    }

    @Test func noLanguagesPlansNoWords() {
        let plan = PersonalPlan(QuizAnswers(deadline: .month), languages: 0, now: day(2026, 1, 31), calendar: calendar)
        #expect(plan.days == 28)
        #expect(plan.words == 0)
        #expect(plan.newToday == 0)
    }

    @Test func answersRoundTripThroughDefaults() {
        let d = UserDefaults(suiteName: "quiz-\(UUID().uuidString)")!
        #expect(QuizAnswers.load(d) == QuizAnswers())
        let a = QuizAnswers(reason: .family, level: .getBy, minutes: .five, time: .night, deadline: .half)
        a.save(d)
        #expect(QuizAnswers.load(d) == a)
        let raw = String(data: d.data(forKey: QuizAnswers.key)!, encoding: .utf8)!
        #expect(raw.contains("\"get_by\""))
    }
}
