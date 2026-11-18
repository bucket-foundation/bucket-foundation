import Foundation

public struct GameShare: Sendable, Equatable {
    public enum Shape: Sendable, Equatable {
        case guesses(rows: [[PolyMark]], solved: Bool, limit: Int)
        case groups(order: [Int], attempts: [Bool], total: Int)
        case marks([Bool])
        case time(seconds: Int, cells: [[Bool]])
        case points(Int, marks: [Bool])
    }

    public static let link = "https://polingual.com/play"
    static let groupSquares = ["🟨", "🟩", "🟦", "🟪"]
    static let groupSize = 4

    public let title: String
    public let day: Int
    public let shape: Shape
    public let streak: Int

    public init(title: String, day: Int, shape: Shape, streak: Int = 0) {
        self.title = title
        self.day = day
        self.shape = shape
        self.streak = streak
    }

    public init(title: String, dayKey: String, shape: Shape, streak: Int = 0) {
        self.init(title: title, day: DailySeed.dayNumber(dayKey) ?? 1, shape: shape, streak: streak)
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
        var lines = ["\(title) #\(day) \(score)"] + grid
        if streak > 0 { lines.append("🔥 \(streak)") }
        lines.append(Self.link)
        return lines.joined(separator: "\n")
    }
}

extension DailySeed {
    public static func dayNumber(_ day: String) -> Int? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3, (1...12).contains(parts[1]), (1...31).contains(parts[2]) else { return nil }
        return Polyword.dayNumber(PolyDate(parts[0], parts[1], parts[2]))
    }
}
