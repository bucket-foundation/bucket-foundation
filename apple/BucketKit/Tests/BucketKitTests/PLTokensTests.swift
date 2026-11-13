import CoreText
import Foundation
import Testing
@testable import BucketKit

struct PLTokensTests {
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

    static func json(_ path: String) throws -> [String: Any] {
        let data = try Data(contentsOf: root.appendingPathComponent(path))
        return try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    static func parse(_ value: String) -> (UInt32, Double) {
        if value.hasPrefix("#") { return (UInt32(value.dropFirst(), radix: 16)!, 1) }
        let n = value.drop { $0 != "(" }.dropFirst().dropLast().split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        let rgb = (UInt32(n[0])! << 16) | (UInt32(n[1])! << 8) | UInt32(n[2])!
        return (rgb, Double(n[3])!)
    }

    @Test func colorsMatchJSON() throws {
        let colors = try #require(try Self.json("polingual/src/ui/tokens.json")["color"] as? [String: String])
        #expect(Set(colors.keys) == Set(PL.colorHex.keys))
        for (k, v) in colors {
            let (hex, alpha) = Self.parse(v)
            #expect(PL.colorHex[k] == hex, "\(k)")
            #expect(PL.colorAlpha[k] == alpha, "\(k)")
        }
    }

    @Test func typeMatchesJSON() throws {
        let types = try #require(try Self.json("polingual/src/ui/tokens.json")["type"] as? [String: [String: Any]])
        #expect(Set(types.keys) == Set(PL.type.keys))
        for (k, v) in types {
            let spec = try #require(PL.type[k])
            #expect(spec.family.rawValue == v["font"] as? String)
            #expect(spec.size == CGFloat((v["size"] as! NSNumber).doubleValue))
            #expect(spec.weight == (v["weight"] as! NSNumber).intValue)
            #expect(spec.line == CGFloat((v["line"] as! NSNumber).doubleValue))
        }
    }

    @Test func scalesMatchJSON() throws {
        let t = try Self.json("polingual/src/ui/tokens.json")
        for (group, table) in [("radius", PL.Radius.all), ("space", PL.Space.all), ("lip", PL.Lip.all)] {
            let src = try #require(t[group] as? [String: NSNumber])
            #expect(src.mapValues { CGFloat($0.doubleValue) } == table, "\(group)")
        }
        let motion = try #require(t["motion"] as? [String: Any])
        for (k, ms) in PL.Motion.millis { #expect((motion[k] as? NSNumber)?.intValue == ms) }
    }

    @Test func artMatchesSource() throws {
        let src = try String(contentsOf: Self.root.appendingPathComponent("polingual/src/ui/art/data.ts"), encoding: .utf8)
        let names = src.matches(of: /"name": "([^"]+)"/).map { String($0.1) }
        #expect(names == PLArt.allCases.map(\.rawValue))
        for art in PLArt.allCases { #expect(art.available, "\(art.rawValue)") }
    }

    @Test func fontsRegister() {
        #expect(PLFonts.register())
        for spec in PL.type.values {
            let font = CTFontCreateWithName(spec.postScriptName as CFString, 12, nil)
            #expect(CTFontCopyPostScriptName(font) as String == spec.postScriptName)
        }
    }
}
