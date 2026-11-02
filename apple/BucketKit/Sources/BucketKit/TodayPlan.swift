import Foundation

public enum TodayItemKind: String, Codable, Sendable {
    case system, deck, game, content
}

public struct TodayItem: Codable, Hashable, Identifiable, Sendable {
    public let kind: TodayItemKind
    public let ref: String
    public let title: String

    public init(kind: TodayItemKind, ref: String, title: String) {
        self.kind = kind
        self.ref = ref
        self.title = title
    }

    public var id: String { "\(kind.rawValue):\(ref)" }
}

public struct DoneMark: Codable, Equatable, Sendable {
    public var on: Bool
    public var at: Double

    public init(on: Bool, at: Double) {
        self.on = on
        self.at = at
    }
}

public struct TodayPlan: Codable, Equatable, Sendable {
    public var items: [TodayItem] = []
    public var customized = false
    public var updatedAt: Double = 0
    public var doneDay: String?
    public var doneAt: Double = 0
    public var done: [String] = []
    public var marks: [String: DoneMark]?

    public init() {}

    public static func defaults(systems: [TodayItem], decks: [TodayItem], starter: [TodayItem]) -> [TodayItem] {
        let own = systems + decks
        return own.isEmpty ? starter : own
    }

    public mutating func adopt(_ defaults: [TodayItem]) {
        guard !customized else { return }
        items = defaults
    }

    public func contains(_ id: String) -> Bool { items.contains { $0.id == id } }

    public mutating func add(_ item: TodayItem, now: Double) {
        guard !contains(item.id) else { return }
        items.append(item)
        touch(now)
    }

    public mutating func remove(_ id: String, now: Double) {
        items.removeAll { $0.id == id }
        if done.contains(id) { marks = (marks ?? [:]).merging([id: DoneMark(on: false, at: now)]) { _, new in new } }
        done.removeAll { $0 == id }
        touch(now)
    }

    public mutating func order(_ ids: [String], now: Double) {
        let byId = Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        var seen = Set<String>()
        let listed = ids.compactMap { id -> TodayItem? in seen.insert(id).inserted ? byId[id] : nil }
        items = listed + items.filter { !seen.contains($0.id) }
        touch(now)
    }

    public mutating func move(_ id: String, toTop: Bool, now: Double) {
        guard let item = items.first(where: { $0.id == id }) else { return }
        items.removeAll { $0.id == id }
        if toTop { items.insert(item, at: 0) } else { items.append(item) }
        touch(now)
    }

    public func doneToday(_ day: String) -> [String] { doneDay == day ? done : [] }

    public func isDone(_ id: String, day: String) -> Bool { doneToday(day).contains(id) }

    public mutating func setDone(_ id: String, _ on: Bool, day: String, now: Double) {
        var today = doneToday(day)
        var stamped = doneDay == day ? marks ?? [:] : [:]
        today.removeAll { $0 == id }
        if on { today.append(id) }
        stamped[id] = DoneMark(on: on, at: now)
        done = today
        marks = stamped
        doneDay = day
        doneAt = now
    }

    public static func merge(_ a: TodayPlan, _ b: TodayPlan) -> TodayPlan {
        var out = b.updatedAt > a.updatedAt ? b : a
        if a.doneDay == b.doneDay {
            out.doneDay = a.doneDay
            out.doneAt = max(a.doneAt, b.doneAt)
            let order = a.done + b.done.filter { !a.done.contains($0) }
            let ids = Set(order).union((a.marks ?? [:]).keys).union((b.marks ?? [:]).keys)
            var winners: [String: DoneMark] = [:]
            for id in ids { winners[id] = latest(a.mark(id), b.mark(id)) }
            out.done = order.filter { winners[$0]?.on == true }
            out.marks = winners.isEmpty ? nil : winners
        } else {
            let newest = b.doneAt > a.doneAt ? b : a
            out.doneDay = newest.doneDay
            out.doneAt = newest.doneAt
            out.done = newest.done
            out.marks = newest.marks
        }
        return out
    }

    func mark(_ id: String) -> DoneMark? {
        marks?[id] ?? (done.contains(id) ? DoneMark(on: true, at: doneAt) : nil)
    }

    static func latest(_ a: DoneMark?, _ b: DoneMark?) -> DoneMark? {
        guard let a, let b else { return a ?? b }
        if a.at != b.at { return a.at > b.at ? a : b }
        return a.on ? a : b
    }

    public var js: JSValue {
        guard let data = try? JSONEncoder().encode(self), let v = try? JSON.parse(data) else { return .object(JSObject()) }
        return v
    }

    public init?(js: JSValue?) {
        guard let js, let plan = try? JSONDecoder().decode(TodayPlan.self, from: JSON.data(js)) else { return nil }
        self = plan
    }

    private mutating func touch(_ now: Double) {
        customized = true
        updatedAt = now
    }
}

public enum TodayStatus: Equatable, Sendable {
    case empty
    case start
    case keep(streak: Int, left: TimeLeft)
    case atRisk(streak: Int, left: TimeLeft)
    case secured(streak: Int, itemsLeft: Int)
    case done(streak: Int)

    public static let riskHour = 20

    public static func evaluate(streak: Int, studiedToday: Bool, items: Int, itemsLeft: Int, now: Date, calendar cal: Calendar = .current) -> TodayStatus {
        if studiedToday { return itemsLeft > 0 ? .secured(streak: streak, itemsLeft: itemsLeft) : .done(streak: streak) }
        if streak == 0 { return items == 0 ? .empty : .start }
        let left = TimeLeft(until: cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) ?? now, from: now)
        return cal.component(.hour, from: now) >= riskHour ? .atRisk(streak: streak, left: left) : .keep(streak: streak, left: left)
    }
}

public struct TimeLeft: Equatable, Sendable {
    public let hours: Int
    public let minutes: Int

    public init(until end: Date, from now: Date) {
        let total = max(0, Int(ceil(end.timeIntervalSince(now) / 60)))
        hours = total / 60
        minutes = total % 60
    }
}
