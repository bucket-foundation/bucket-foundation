import Foundation
import Testing
@testable import BucketKit

@Suite struct TeXCorpusTests {
    struct Live: Decodable {
        let math: [String]
        let prose: [String]
    }

    static let functionWords: Set<String> = ["sin", "cos", "tan", "log", "ln", "exp", "lim", "max", "min", "det", "ker", "deg", "dim", "arg", "sup", "inf",
                                             "sinh", "cosh", "tanh", "coth", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "Pr", "gcd", "lg", "hom", "mod"]

    func live() throws -> Live {
        try JSONDecoder().decode(Live.self, from: fixture("tex-live"))
    }

    static func leaked(_ tex: String, _ out: String) -> [String] {
        let names = Set(tex.replacingOccurrences(of: "\\\\", with: " ").matches(of: /\\([A-Za-z]+)/).map { String($0.output.1) }).subtracting(functionWords)
        let words = Set(out.matches(of: /[A-Za-z]+/).map { String($0.output) })
        return names.filter { words.contains($0) && !TeXLite.plain.contains($0) }.sorted()
    }

    @Test func liveMathLeavesNoCommands() throws {
        var bad: [String] = []
        for m in try live().math {
            let r = TeXLite.render(m)
            let names = Self.leaked(m, r)
            if r.contains("\\") || !names.isEmpty { bad.append("\(names) \(m) => \(r)") }
        }
        #expect(bad.isEmpty, "\(bad.count): \(bad.prefix(8).joined(separator: "\n"))")
    }

    @Test func liveProseRendersDisplayAndInlineMath() throws {
        let raw = try live().prose.map { ($0, TeXLite.prose($0)) }.filter { $0.1.contains("\\") || $0.1.contains("$$") }
        #expect(raw.isEmpty, "\(raw.prefix(3))")
    }

    @Test func leakDetectionCatchesBareNames() {
        #expect(Self.leaked("p \\nvdash q", "p nvdash q") == ["nvdash"])
        #expect(Self.leaked("\\sin x", "sin x").isEmpty)
    }

    @Test func proseHandlesEveryDelimiter() {
        #expect(TeXLite.prose("so $$q\\equiv-\\frac{a}{b}.$$ Then") == "so q≡-a⁄b. Then")
        #expect(TeXLite.prose("energy $E=mc^2$ and \\(\\alpha\\) and \\[\\beta\\]") == "energy E=mc² and α and β")
        #expect(TeXLite.prose("no math here") == "no math here")
        #expect(TeXLite.prose("a \\$1M prize and $\\text{P}\\ne\\text{NP}$") == "a $1M prize and P≠NP")
        #expect(TeXLite.prose(#"called \"van der Waals\" loosely"#) == #"called "van der Waals" loosely"#)
    }

    @Test func pricesStayPrices() {
        #expect(TeXLite.prose("costs $5 today") == "costs $5 today")
        #expect(TeXLite.prose("costs $5 and $6") == "costs $5 and $6")
        #expect(TeXLite.prose("between $5 and $10, with $x$ apples") == "between $5 and $10, with x apples")
        #expect(TeXLite.prose("over $200\\,\\text{ms}$ windows") == "over 200 ms windows")
    }

    @Test func markdownStaysOutOfMath() {
        let a = TeXLite.attributed("$x_ab$ and $a*b*c^2$ then *em*")
        #expect(String(a.characters) == "xₐb and a*b*c² then em")
        let em = a.runs.first { $0.inlinePresentationIntent == .emphasized }
        #expect(em.map { String(a[$0.range].characters) } == "em")
        #expect(TeXLite.segments("$x_ab$ and *c*") == [.math(tex: "x_ab", shown: "xₐb"), .text(" and *c*")])
    }

    @Test func spokenForms() {
        #expect(TeXLite.spoken("\\frac{a}{b}") == "a over b")
        #expect(TeXLite.spoken("e^{Ht}") == "e to the Ht")
        #expect(TeXLite.spoken("E=mc^2") == "E equals mc to the 2")
        #expect(TeXLite.spoken("\\alpha \\le \\beta") == "alpha less than or equal to beta")
        #expect(TeXLite.spokenProse("so $x_1$ wins") == "so x sub 1 wins")
    }

    @Test func pmodNeverBecomesPlusMinus() {
        #expect(TeXLite.render("8\\equiv3\\pmod5") == "8≡3 (mod 5)")
        #expect(TeXLite.render("a\\equiv b \\pmod {n}") == "a≡ b  (mod n)")
        #expect(TeXLite.render("x\\pmod{p}") == "x (mod p)")
        #expect(TeXLite.render("\\pm 1") == "± 1")
    }

    @Test func lettersAndGreekGoUpAndDown() {
        #expect(TeXLite.render("e^{Ht}") == "eᴴᵗ")
        #expect(TeXLite.render("x_{\\beta}") == "xᵦ")
        #expect(TeXLite.render("t^{2/3}") == "t^(2/3)")
        #expect(TeXLite.render("a\\not\\subseteq b") == "a⊆\u{0338} b")
    }

    @Test func nestedCommandsStayLinear() {
        #expect(TeXLite.render("\\frac{\\frac{a}{b}}{c}") == "(a⁄b)⁄(c)")
        let long = String(repeating: "\\text{a}", count: 4000)
        #expect(TeXLite.render(long) == String(repeating: "a", count: 4000))
    }
}
