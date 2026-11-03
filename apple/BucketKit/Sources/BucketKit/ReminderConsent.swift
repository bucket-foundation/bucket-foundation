import Foundation

public enum ReminderConsent {
    public static let enabledKey = "reminders.enabled"
    public static let customKey = "reminders.customMinute"
    public static let wordKey = "reminders.wordOfDay"
    public static let optedOutKey = "reminders.optedOut"
    public static let healedKey = "reminders.healedOff"
    public static let stuckKey = "reminders.stuckOff"

    public static func heal(_ defaults: UserDefaults) {
        guard !defaults.bool(forKey: healedKey) else { return }
        defaults.set(true, forKey: healedKey)
        guard defaults.object(forKey: enabledKey) as? Bool == false else { return }
        defaults.set(true, forKey: optedOutKey)
        defaults.set(true, forKey: stuckKey)
    }

    public static func record(on: Bool, _ defaults: UserDefaults) {
        defaults.removeObject(forKey: stuckKey)
        if on { defaults.removeObject(forKey: optedOutKey) } else { defaults.set(true, forKey: optedOutKey) }
    }

    public static func optedOut(_ defaults: UserDefaults) -> Bool { defaults.bool(forKey: optedOutKey) }

    public static func stuckOff(_ defaults: UserDefaults) -> Bool { defaults.bool(forKey: stuckKey) }

    public static func autoEnables(authorized: Bool, _ defaults: UserDefaults) -> Bool {
        authorized && !optedOut(defaults)
    }
}
