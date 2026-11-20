import Foundation

public enum OneTimeCode {
    public static let lengths = 6...10

    public static func extract(from text: String) -> String? {
        let runs = text.split(whereSeparator: { !$0.isASCII || !$0.isNumber }).map(String.init)
        if let run = runs.first(where: { lengths.contains($0.count) }) { return run }
        let joined = text.filter { $0.isASCII && $0.isNumber }
        let separators = text.filter { !($0.isASCII && $0.isNumber) }
        if lengths.contains(joined.count), separators.allSatisfy({ $0 == " " || $0 == "-" || $0.isNewline }) {
            return joined
        }
        for match in text.matches(of: /[0-9]{2,5}(?:[ -][0-9]{2,5})+/) {
            let groups = match.output.split(whereSeparator: { $0 == " " || $0 == "-" })
            let digits = groups.joined()
            if Set(groups.map(\.count)).count == 1, lengths.contains(digits.count) { return digits }
        }
        return nil
    }
}
