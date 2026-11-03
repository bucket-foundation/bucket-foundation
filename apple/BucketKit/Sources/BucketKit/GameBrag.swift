import Foundation

public enum GameBrag {
    public static func row(_ results: [Bool]) -> String {
        results.map { $0 ? "🟩" : "🟥" }.joined()
    }

    public static func grid(_ cells: [[Bool]]) -> String {
        cells.map { row in row.map { $0 ? "🟩" : "⬛️" }.joined() }.joined(separator: "\n")
    }

    public static func miniCells(_ puzzle: MiniPuzzle) -> [[Bool]] {
        let answers = puzzle.answers
        return (0..<puzzle.rows).map { r in (0..<puzzle.cols).map { c in answers[MiniCell(row: r, col: c)] != nil } }
    }

    public static func text(title: String, day: String, score: String, results: [Bool]? = nil, cells: [[Bool]]? = nil, link: String) -> String {
        var lines = ["\(title) \(day)", score]
        if let results, !results.isEmpty { lines.append(row(results)) }
        if let cells { lines.append(grid(cells)) }
        lines.append(link)
        return lines.joined(separator: "\n")
    }
}
