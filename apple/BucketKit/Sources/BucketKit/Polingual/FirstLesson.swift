import Foundation

public enum FirstLesson {
    public static let key = "polingual.firstLessonDone"
    public static let finished = Notification.Name("polingual.firstLessonFinished")

    public static func counts(graded: Int) -> Bool { graded > 0 }

    public static func paywallAfter(open: Bool, done: Bool) -> Bool { done && !open }

    @discardableResult
    public static func mark(graded: Int, defaults: UserDefaults = .standard, center: NotificationCenter = .default) -> Bool {
        guard counts(graded: graded) else { return false }
        defaults.set(true, forKey: key)
        center.post(name: finished, object: nil)
        return true
    }

    public static func done(_ defaults: UserDefaults = .standard) -> Bool { defaults.bool(forKey: key) }
}
