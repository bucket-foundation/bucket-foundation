import Foundation

public enum SetSort: String, CaseIterable, Sendable {
    case recent
    case masteryHigh
    case masteryLow
    case name
}

public let maxSetNameLength = 60

public struct SetRecency: Sendable, Comparable {
    public let day: Int
    public let review: Double
    public let edited: Double

    public static func < (a: SetRecency, b: SetRecency) -> Bool {
        (a.day, a.review, a.edited) < (b.day, b.review, b.edited)
    }
}

public func setRecency(_ system: LangSystem, _ state: EngineState) -> SetRecency {
    let targets = Set(system.targets)
    var latest = 0.0
    for key in state.cards.keys where targets.contains(parseCardId(key).lang) {
        if let t = state.cards[key]?.lastReview, t > latest { latest = t }
    }
    return SetRecency(day: dayNumber(state.lastStudyDay), review: latest, edited: system.updatedAt ?? system.createdAt)
}

func dayNumber(_ key: String?) -> Int {
    let parts = (key ?? "").split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return 0 }
    return parts[0] * 10_000 + parts[1] * 100 + parts[2]
}

public func setMastery(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double) -> Double {
    let per = langProgress(system, corpus, state, now: now)
    let total = per.reduce(0) { $0 + $1.total }
    guard total > 0 else { return 0 }
    return Double(per.reduce(0) { $0 + $1.mastered }) / Double(total)
}

public func sortSystems(_ systems: [LangSystem], by sort: SetSort, recent: [String: SetRecency], mastery: [String: Double], title: (LangSystem) -> String) -> [LangSystem] {
    let none = SetRecency(day: 0, review: 0, edited: 0)
    let byRecent: (LangSystem, LangSystem) -> Bool = { (recent[$0.id] ?? none) > (recent[$1.id] ?? none) }
    switch sort {
    case .recent:
        return systems.stableSorted(byRecent)
    case .masteryHigh, .masteryLow:
        let high = sort == .masteryHigh
        return systems.stableSorted { a, b in
            let ma = mastery[a.id] ?? 0
            let mb = mastery[b.id] ?? 0
            if ma != mb { return high ? ma > mb : ma < mb }
            return byRecent(a, b)
        }
    case .name:
        return systems.stableSorted { a, b in
            let order = title(a).localizedStandardCompare(title(b))
            if order != .orderedSame { return order == .orderedAscending }
            return byRecent(a, b)
        }
    }
}

public func renameSystem(_ system: LangSystem, _ name: String, now: Double) -> LangSystem {
    let trimmed = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maxSetNameLength))
    var s = system
    s.name = trimmed.isEmpty ? systemName(system.root, system.targets) : trimmed
    s.updatedAt = now
    return s
}

public func hasCustomName(_ system: LangSystem) -> Bool { system.name != systemName(system.root, system.targets) }
