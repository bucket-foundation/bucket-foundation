import Foundation

public enum NumberParse: Equatable, Sendable {
    case ok(Double)
    case ambiguous(mark: Character, grouped: Double, decimal: Double, whole: String, other: String)
    case invalid
}

public struct DecimalHint: Equatable, Sendable {
    public let whole: String
    public let other: String
}

public enum LocaleNumber {
    static let commaDecimal: Set<String> = ["es-es", "es-ar", "es-cl", "es-co"]

    public static func isEnglish(_ locale: String?) -> Bool {
        guard let l = locale?.lowercased(), !l.isEmpty else { return true }
        return l == "en" || l.hasPrefix("en-") || l.hasPrefix("en_")
    }

    static func tag(_ locale: String?) -> String? {
        locale?.replacingOccurrences(of: "_", with: "-").lowercased()
    }

    static func whole(_ s: String, _ pattern: String, caseless: Bool = false) -> Bool {
        s.range(of: "^(?:\(pattern))$", options: caseless ? [.regularExpression, .caseInsensitive] : .regularExpression) != nil
    }

    static func number(_ s: String) -> Double? {
        var t = s
        if t.hasPrefix(".") { t = "0" + t }
        if t.hasSuffix(".") { t += "0" }
        if let e = t.firstIndex(where: { $0 == "e" || $0 == "E" }), t[t.startIndex..<e].hasSuffix(".") { t.insert("0", at: e) }
        return Double(t)
    }

    public static func parseEnglish(_ v: String) -> Double {
        var t = v.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: "")
        t = t.components(separatedBy: .whitespaces).joined()
        if let r = t.range(of: "[×xX]10\\^?", options: .regularExpression) { t.replaceSubrange(r, with: "e") }
        if t.hasSuffix("%") { t.removeLast() }
        guard whole(t, "[-+]?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][-+]?[0-9]+)?") else { return .nan }
        return number(t) ?? .nan
    }

    enum Mantissa {
        case ok(String)
        case ambiguous(mark: Character, grouped: String, decimal: String, whole: String, other: String)
        case invalid
    }

    static func grouped(_ head: String, _ groups: [String]) -> Bool {
        whole(head, "[0-9]{1,3}") && groups.allSatisfy { whole($0, "[0-9]{3}") }
    }

    static func digits(_ s: String) -> Bool { whole(s, "[0-9]*") }

    static func mantissa(_ body: String, scientific: Bool) -> Mantissa {
        let dot = body.lastIndex(of: ".")
        let comma = body.lastIndex(of: ",")
        if let dot, let comma {
            let (sep, cut): (Character, String.Index) = dot > comma ? (",", dot) : (".", comma)
            let int = String(body[..<cut])
            let frac = String(body[body.index(after: cut)...])
            let parts = int.split(separator: sep, omittingEmptySubsequences: false).map(String.init)
            guard digits(frac), grouped(parts[0], Array(parts.dropFirst())) else { return .invalid }
            return .ok(parts.joined() + "." + frac)
        }
        guard let mark: Character = dot != nil ? "." : comma != nil ? "," : nil else {
            return whole(body, "[0-9]+") ? .ok(body) : .invalid
        }
        let parts = body.split(separator: mark, omittingEmptySubsequences: false).map(String.init)
        if parts.count > 2 {
            return grouped(parts[0], Array(parts.dropFirst())) ? .ok(parts.joined()) : .invalid
        }
        let int = parts[0]
        let frac = parts[1]
        guard digits(int), digits(frac), !(int + frac).isEmpty else { return .invalid }
        let decimal = (int.isEmpty ? "0" : int) + "." + (frac.isEmpty ? "0" : frac)
        if !scientific, frac.count == 3, whole(int, "[1-9][0-9]{0,2}") {
            let other = mark == "," ? "." : ","
            return .ambiguous(mark: mark, grouped: int + frac, decimal: decimal, whole: int + frac, other: int + other + frac)
        }
        return .ok(decimal)
    }

    static func single(_ s: String) -> NumberParse {
        guard let re = try? NSRegularExpression(pattern: "^([+-]?)([0-9.,]+)(e[+-]?[0-9]+)?$", options: .caseInsensitive),
              let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return .invalid }
        func group(_ i: Int) -> String? { Range(m.range(at: i), in: s).map { String(s[$0]) } }
        let sign = group(1) == "-" ? "-" : ""
        let exp = group(3)
        let scaled = { (v: String) -> Double? in number(sign + v + (exp ?? "")) }
        switch mantissa(group(2) ?? "", scientific: exp != nil) {
        case .ok(let v): return scaled(v).map(NumberParse.ok) ?? .invalid
        case .ambiguous(let mark, let g, let d, let w, let o):
            guard let gv = scaled(g), let dv = scaled(d) else { return .invalid }
            return .ambiguous(mark: mark, grouped: gv, decimal: dv, whole: w, other: o)
        case .invalid: return .invalid
        }
    }

    public static func parse(_ input: String) -> NumberParse {
        var s = input.trimmingCharacters(in: .whitespacesAndNewlines)
        s = s.replacingOccurrences(of: "[\u{2212}\u{2013}\u{2014}]", with: "-", options: .regularExpression)
        s = s.replacingOccurrences(of: "[\\s\u{00a0}\u{202f}]+", with: "", options: .regularExpression)
        if let r = s.range(of: "[×x·]10\\^?", options: [.regularExpression, .caseInsensitive]) { s.replaceSubrange(r, with: "e") }
        if s.hasSuffix("%") { s.removeLast() }
        guard !s.isEmpty else { return .invalid }
        let slash = s.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        if slash.count == 1 { return single(s) }
        guard slash.count == 2 else { return .invalid }
        let a = single(slash[0])
        let b = single(slash[1])
        func pick(_ r: NumberParse, grouped: Bool) -> Double {
            switch r {
            case .ok(let v): v
            case .ambiguous(_, let g, let d, _, _): grouped ? g : d
            case .invalid: .nan
            }
        }
        if a == .invalid || b == .invalid { return .invalid }
        if pick(b, grouped: true) == 0 || pick(b, grouped: false) == 0 { return .invalid }
        let amb: NumberParse? = if case .ambiguous = a { a } else if case .ambiguous = b { b } else { nil }
        if case .ambiguous(let mark, _, _, let w, let o) = amb {
            return .ambiguous(mark: mark, grouped: pick(a, grouped: true) / pick(b, grouped: true),
                              decimal: pick(a, grouped: false) / pick(b, grouped: false), whole: w, other: o)
        }
        return .ok(pick(a, grouped: true) / pick(b, grouped: true))
    }

    public static func resolve(_ p: NumberParse, locale: String?) -> Double? {
        switch p {
        case .ok(let v): return v
        case .ambiguous(let mark, let g, let d, _, _):
            guard let t = tag(locale), commaDecimal.contains(t) else { return nil }
            return mark == "," ? d : g
        case .invalid: return nil
        }
    }

    public static func value(_ v: String, locale: String?) -> Double? {
        if isEnglish(locale) {
            let x = parseEnglish(v)
            return x.isNaN ? nil : x
        }
        return resolve(parse(v), locale: locale)
    }
}
