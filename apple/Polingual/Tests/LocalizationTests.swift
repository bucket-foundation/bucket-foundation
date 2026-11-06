import Foundation
import Testing
@testable import Polingual

struct LocalizationTests {
    static let languages = ["ar", "cs", "de", "el", "es", "fa", "fi", "fr", "he", "hi", "id", "it", "ja", "ko", "nl", "pl", "pt-BR", "ru", "sv", "ta", "th", "tr", "vi", "zh-Hans"]
    static let tables = [
        "Bucket/Resources/%@.lproj/Localizable.strings",
        "Bucket/Resources/%@.lproj/Bucket-InfoPlist.strings",
        "Bucket/Widget/%@.lproj/Localizable.strings",
        "Bucket/Watch/%@.lproj/Localizable.strings",
        "Polingual/Resources/%@.lproj/Localizable.strings",
        "Polingual/Resources/%@.lproj/Polingual-InfoPlist.strings",
        "Polingual/Widget/%@.lproj/Localizable.strings",
        "Polingual/Watch/%@.lproj/Localizable.strings",
        "ShareExtension/Resources/%@.lproj/Localizable.strings",
        "Clip/Resources/%@.lproj/Localizable.strings",
    ]

    static var appleRoot: URL {
        URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    }

    static func table(_ pattern: String, _ lang: String) -> [String: String]? {
        let url = appleRoot.appendingPathComponent(String(format: pattern, lang))
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: String]
    }

    static func specifiers(_ s: String) -> [Int: String] {
        let regex = /%(?:(\d+)\$)?(lld|ld|lu|li|d|i|u|@|f|\.\d+f|lf|%)/
        var out: [Int: String] = [:]
        var next = 0
        for m in s.matches(of: regex) where m.output.2 != "%" {
            if let pos = m.output.1.flatMap({ Int($0) }) {
                out[pos] = String(m.output.2)
            } else {
                next += 1
                out[next] = String(m.output.2)
            }
        }
        return out
    }

    @Test(arguments: tables)
    func everyLanguageHasEveryKey(_ pattern: String) throws {
        let all = Self.languages.map { (lang: $0, table: Self.table(pattern, $0)) }
        for entry in all { #expect(entry.table != nil, "\(String(format: pattern, entry.lang)) is missing or unreadable") }
        let keys = all.compactMap(\.table).reduce(into: Set<String>()) { $0.formUnion($1.keys) }
        #expect(!keys.isEmpty)
        for entry in all {
            guard let table = entry.table else { continue }
            let missing = keys.subtracting(table.keys)
            #expect(missing.isEmpty, "\(entry.lang) \(pattern) lacks \(missing.sorted().prefix(5))")
        }
    }

    @Test(arguments: tables)
    func specifiersMatchTheKey(_ pattern: String) {
        let infoPlist = pattern.contains("InfoPlist")
        for lang in Self.languages {
            guard let table = Self.table(pattern, lang) else { continue }
            for (key, value) in table {
                if !infoPlist {
                    #expect(Self.specifiers(key) == Self.specifiers(value), "\(lang): \(key) -> \(value)")
                }
                #expect(!value.contains("\u{2014}") && !value.contains("\u{2013}"), "\(lang): dash in \(value)")
            }
        }
    }

    @Test func positionalSpecifiersAreNotMixed() {
        for pattern in Self.tables {
            for lang in Self.languages {
                for value in (Self.table(pattern, lang) ?? [:]).values {
                    let positional = value.contains(/%\d+\$/)
                    let plain = value.contains(/%(lld|ld|d|@)/)
                    #expect(!(positional && plain), "\(lang): \(value)")
                }
            }
        }
    }

    @Test func rootLanguagesMapToShippedLocalizations() {
        for (root, loc) in InterfaceLanguage.localizations where root != "en" {
            #expect(Self.languages.contains(loc), "\(root) maps to \(loc)")
        }
        #expect(InterfaceLanguage.localization(for: "pt") == "pt-BR")
        #expect(InterfaceLanguage.localization(for: "zh") == "zh-Hans")
        #expect(InterfaceLanguage.localization(for: "la") == nil)
    }

    @Test func applyStoresTheLanguageForTheNextLaunch() throws {
        let defaults = try #require(UserDefaults(suiteName: "interface-language-test"))
        defer { defaults.removePersistentDomain(forName: "interface-language-test") }
        #expect(InterfaceLanguage.apply(root: "ar", defaults: defaults) == "ar")
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["ar"])
        #expect(InterfaceLanguage.layoutDirection == .rightToLeft)
        InterfaceLanguage.apply(root: "ja", defaults: defaults)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["ja"])
        #expect(InterfaceLanguage.layoutDirection == .leftToRight)
        InterfaceLanguage.apply(root: "la", defaults: defaults)
        #expect(defaults.persistentDomain(forName: "interface-language-test")?["AppleLanguages"] == nil)
        #expect(defaults.string(forKey: InterfaceLanguage.storageKey) == nil)
    }
}
