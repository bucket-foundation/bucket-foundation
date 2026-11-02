import Foundation

public enum ReminderConsent {
    public static let enabledKey = "reminders.enabled"
    public static let customKey = "reminders.customMinute"
    public static let wordKey = "reminders.wordOfDay"
    public static let optedOutKey = "reminders.optedOut"
    public static let healedKey = "reminders.healedOff"

    public static func heal(_ defaults: UserDefaults) {
        guard !defaults.bool(forKey: healedKey) else { return }
        defaults.set(true, forKey: healedKey)
        guard defaults.object(forKey: enabledKey) as? Bool == false else { return }
        let chose = defaults.object(forKey: customKey) != nil || defaults.object(forKey: wordKey) as? Bool == false
        if chose { defaults.set(true, forKey: optedOutKey) }
        defaults.removeObject(forKey: enabledKey)
    }

    public static func record(on: Bool, _ defaults: UserDefaults) {
        if on { defaults.removeObject(forKey: optedOutKey) } else { defaults.set(true, forKey: optedOutKey) }
    }

    public static func optedOut(_ defaults: UserDefaults) -> Bool { defaults.bool(forKey: optedOutKey) }

    public static func autoEnables(authorized: Bool, _ defaults: UserDefaults) -> Bool {
        authorized && !optedOut(defaults)
    }
}
