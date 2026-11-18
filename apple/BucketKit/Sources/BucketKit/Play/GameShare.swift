import Foundation

public struct GameShare: Sendable, Equatable {
    public enum Shape: Codable, Sendable, Equatable {
        case guesses(rows: [[PolyMark]], solved: Bool, limit: Int)
        case groups(order: [Int], attempts: [Bool], total: Int)
        case marks([Bool])
        case time(seconds: Int, cells: [[Bool]])
        case points(Int, marks: [Bool])
    }

    static let groupSquares = ["🟨", "🟩", "🟦", "🟪"]
    static let groupSize = 4

    public let title: String
    public let day: Int?
    public let shape: Shape
    public let streak: Int
    public let link: String

    public init(title: String, day: Int?, shape: Shape, streak: Int = 0, link: String) {
        self.title = title
        self.day = day
        self.shape = shape
        self.streak = streak
        self.link = link
    }

    public init(title: String, dayKey: String?, shape: Shape, streak: Int = 0, link: String) {
        self.init(title: title, day: dayKey.flatMap(DailySeed.dayNumber), shape: shape, streak: streak, link: link)
    }

    public static func groupOrder(solved: [String], groups: [String]) -> [Int] {
        let found = solved.compactMap { groups.firstIndex(of: $0) }
        return found.count == solved.count ? found : Array(solved.indices)
    }

    public static func clock(_ seconds: Int) -> String {
        let s = max(0, seconds)
        return "\(s / 60):" + (s % 60 < 10 ? "0" : "") + "\(s % 60)"
    }

    var score: String {
        switch shape {
        case .guesses(let rows, let solved, let limit): "\(solved ? String(rows.count) : "X")/\(limit)"
        case .groups(let order, _, let total): "\(order.count)/\(total)"
        case .marks(let marks): "\(marks.filter { $0 }.count)/\(marks.count)"
        case .time(let seconds, _): "⏱ \(Self.clock(seconds))"
        case .points(let points, _): "⭐ \(points)"
        }
    }

    var grid: [String] {
        switch shape {
        case .guesses(let rows, _, _):
            return rows.map { row in row.map { Polyword.square[$0] ?? "⬜" }.joined() }
        case .groups(let order, let attempts, _):
            let solved = order.map { String(repeating: Self.groupSquares[(($0 % Self.groupSquares.count) + Self.groupSquares.count) % Self.groupSquares.count], count: Self.groupSize) }
            guard attempts.filter({ $0 }).count == solved.count else { return solved }
            var next = solved.makeIterator()
            return attempts.map { $0 ? next.next() ?? "" : String(repeating: "⬛", count: Self.groupSize) }
        case .marks(let marks), .points(_, let marks):
            return marks.isEmpty ? [] : [GameBrag.row(marks)]
        case .time(_, let cells):
            return cells.isEmpty ? [] : [GameBrag.grid(cells)]
        }
    }

    public var text: String {
        var lines = [([title] + (day.map { ["#\($0)"] } ?? []) + [score]).joined(separator: " ")] + grid
        if streak > 0 { lines.append("🔥 \(streak)") }
        lines.append(link)
        return lines.joined(separator: "\n")
    }
}

extension DailySeed {
    public static func dayNumber(_ day: String) -> Int? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, (1...12).contains(parts[1]), (1...31).contains(parts[2]) else { return nil }
        let n = Polyword.dayNumber(PolyDate(parts[0], parts[1], parts[2]))
        return n >= 1 ? n : nil
    }
}
