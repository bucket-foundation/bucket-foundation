import Foundation
import Testing
@testable import BucketKit

@Suite struct ReminderPlanTests {
    var cal: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        return c
    }

    func at(_ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 10, day: day, hour: hour, minute: minute))!
    }

    @Test func firesTodayWhenNotYetStudiedAndStillAhead() {
        let d = ReminderPlan.fireDates(now: at(21, 9), minute: 19 * 60, lastStudy: at(20, 19), calendar: cal)
        #expect(d.first == at(21, 19))
    }

    @Test func skipsTodayAfterStudying() {
        let d = ReminderPlan.fireDates(now: at(21, 9), minute: 19 * 60, lastStudy: at(21, 8), calendar: cal)
        #expect(d.first == at(22, 19))
    }

    @Test func atMostOnePerDay() {
        let d = ReminderPlan.fireDates(now: at(21, 9), minute: 19 * 60, lastStudy: at(21, 8), calendar: cal)
        #expect(Set(d.map { cal.startOfDay(for: $0) }).count == d.count)
    }

    @Test func goesQuietAWeekAfterTheLastSession() {
        let d = ReminderPlan.fireDates(now: at(21, 9), minute: 19 * 60, lastStudy: at(16, 19), calendar: cal)
        #expect(d.allSatisfy { $0 < at(23, 0) })
        #expect(d.count == 2)
    }

    @Test func medianStudyTime() {
        #expect(ReminderPlan.median([20 * 60, 7 * 60, 19 * 60], fallback: 0) == 19 * 60)
        #expect(ReminderPlan.median([], fallback: 1140) == 1140)
    }

    @Test func messagesNameARealItem() {
        #expect(ReminderPlan.message(ReviewForecast(count: 1, example: "Entropy", streak: 0)) == "Entropy is due. One quick review keeps it.")
        #expect(ReminderPlan.message(ReviewForecast(count: 12, example: "Entropy", streak: 4)) == "Entropy and 11 more are due. A few minutes keeps them in long-term memory. Your streak is 4 days.")
        #expect(ReminderPlan.message(ReviewForecast(count: 0, example: nil, streak: 5)) == "New words are ready. Five minutes today keeps the habit. Your streak is 5 days.")
        #expect(ReminderPlan.message(ReviewForecast(count: 3, example: nil, streak: 1)) == "3 reviews are due. A few minutes keeps them in long-term memory. Your streak is 1 day.")
    }

    @Test func forecastCountsDueByTheFireTimeAndNamesTheEarliest() {
        let fire = at(22, 19)
        let ms = { (d: Date) in d.timeIntervalSince1970 * 1000 }
        let due: [(due: Double, label: String?)] = [(ms(at(22, 8)), "Entropy"), (ms(at(21, 8)), "Boltzmann"), (ms(at(23, 8)), "Later"), (ms(at(20, 8)), nil)]
        let f = ReminderPlan.forecast(due: due, at: fire, streak: 3)
        #expect(f.count == 3)
        #expect(f.example == "Boltzmann")
        #expect(f.streak == 3)
    }

    @Test func forecastWithNothingDueIsEmpty() {
        let f = ReminderPlan.forecast(due: [(at(25, 8).timeIntervalSince1970 * 1000, "Later")], at: at(22, 19), streak: 0)
        #expect(f.count == 0 && f.example == nil)
    }

    @Test func keepsTheLocalHourAcrossTheClockChange() {
        let d = ReminderPlan.fireDates(now: at(30, 9), minute: 19 * 60, lastStudy: at(30, 8), calendar: cal)
        #expect(d.count >= 3)
        #expect(d.allSatisfy { cal.component(.hour, from: $0) == 19 && cal.component(.minute, from: $0) == 0 })
    }
}
