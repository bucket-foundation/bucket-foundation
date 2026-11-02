import Foundation
import Testing
@testable import BucketKit

@Suite struct ReminderConsentTests {
    func defaults() -> UserDefaults {
        let name = "reminder-consent-\(UUID().uuidString)"
        let d = UserDefaults(suiteName: name)!
        d.removePersistentDomain(forName: name)
        return d
    }

    @Test func aMissingKeyAutoEnables() {
        let d = defaults()
        ReminderConsent.heal(d)
        #expect(d.object(forKey: ReminderConsent.enabledKey) == nil)
        #expect(!ReminderConsent.stuckOff(d))
        #expect(ReminderConsent.autoEnables(authorized: true, d))
    }

    @Test func aSavedFalseWithDefaultSettingsStaysOff() {
        let d = defaults()
        d.set(false, forKey: ReminderConsent.enabledKey)
        ReminderConsent.heal(d)
        #expect(d.object(forKey: ReminderConsent.enabledKey) as? Bool == false)
        #expect(ReminderConsent.optedOut(d))
        #expect(ReminderConsent.stuckOff(d))
        #expect(!ReminderConsent.autoEnables(authorized: true, d))
    }

    @Test func turningOnClearsTheStuckCard() {
        let d = defaults()
        d.set(false, forKey: ReminderConsent.enabledKey)
        ReminderConsent.heal(d)
        ReminderConsent.record(on: true, d)
        #expect(!ReminderConsent.stuckOff(d))
        #expect(ReminderConsent.autoEnables(authorized: true, d))
    }

    @Test func aRecordedOffSurvivesTheHeal() {
        let d = defaults()
        d.set(false, forKey: ReminderConsent.enabledKey)
        ReminderConsent.record(on: false, d)
        ReminderConsent.heal(d)
        #expect(!ReminderConsent.autoEnables(authorized: true, d))
    }

    @Test func settingsUsedBeforeTurningOffCountAsAChoice() {
        let custom = defaults()
        custom.set(false, forKey: ReminderConsent.enabledKey)
        custom.set(540, forKey: ReminderConsent.customKey)
        ReminderConsent.heal(custom)
        #expect(ReminderConsent.optedOut(custom))
        let word = defaults()
        word.set(false, forKey: ReminderConsent.enabledKey)
        word.set(false, forKey: ReminderConsent.wordKey)
        ReminderConsent.heal(word)
        #expect(ReminderConsent.optedOut(word))
    }

    @Test func healRunsOnce() {
        let d = defaults()
        ReminderConsent.heal(d)
        d.set(false, forKey: ReminderConsent.enabledKey)
        ReminderConsent.heal(d)
        #expect(d.object(forKey: ReminderConsent.enabledKey) as? Bool == false)
    }

    @Test func turningOnClearsTheOff() {
        let d = defaults()
        ReminderConsent.record(on: false, d)
        ReminderConsent.record(on: true, d)
        #expect(ReminderConsent.autoEnables(authorized: true, d))
        #expect(!ReminderConsent.autoEnables(authorized: false, d))
    }
}
