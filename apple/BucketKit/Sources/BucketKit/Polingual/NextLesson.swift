import Foundation

public enum NextLesson {
    public static let otherSetLimit = 2

    public static func otherSets(after current: String, systems: [LangSystem], lastStudyDay: (String) -> String?, limit: Int = otherSetLimit) -> [LangSystem] {
        let others = systems.enumerated().filter { $0.element.id != current }
        let ordered = others.sorted { a, b in
            let da = lastStudyDay(a.element.id) ?? ""
            let db = lastStudyDay(b.element.id) ?? ""
            return da == db ? a.offset < b.offset : da < db
        }
        return ordered.prefix(max(0, limit)).map(\.element)
    }
}
