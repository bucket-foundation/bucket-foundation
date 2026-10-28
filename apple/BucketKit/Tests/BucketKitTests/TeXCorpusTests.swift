import Foundation
import Testing
@testable import BucketKit

@Suite struct TeXCorpusTests {
    struct Live: Decodable {
        let math: [String]
        let prose: [String]
    }

    func live() throws -> Live {
        try JSONDecoder().decode(Live.self, from: fixture("tex-live"))
    }

    @Test func liveMathLeavesNoCommands() throws {
        let raw = try live().math.map { ($0, TeXLite.render($0)) }.filter { $0.1.contains("\\") || $0.1.contains("±od") }
        #expect(raw.isEmpty, "\(raw.prefix(5))")
    }

    @Test func liveProseRendersDisplayAndInlineMath() throws {
        let raw = try live().prose.map { ($0, TeXLite.prose($0)) }.filter { $0.1.contains("\\") || $0.1.contains("$$") }
        #expect(raw.isEmpty, "\(raw.prefix(3))")
    }

    @Test func proseHandlesEveryDelimiter() {
        #expect(TeXLite.prose("so $$q\\equiv-\\frac{a}{b}.$$ Then") == "so q≡-a⁄b. Then")
        #expect(TeXLite.prose("energy $E=mc^2$ and \\(\\alpha\\) and \\[\\beta\\]") == "energy E=mc² and α and β")
        #expect(TeXLite.prose("costs $5 today") == "costs $5 today")
        #expect(TeXLite.prose("no math here") == "no math here")
        #expect(TeXLite.prose("a \\$1M prize and $\\text{P}\\ne\\text{NP}$") == "a $1M prize and P≠NP")
        #expect(TeXLite.prose(#"called \"van der Waals\" loosely"#) == #"called "van der Waals" loosely"#)
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
    }
}
