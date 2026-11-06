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
        let regex = /%(?:(\d+)\$)?(lld|ld|lu|li|d|i|u|@|(?:\.\d+)?l?[fFeEgG]|%)/
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
                    let plain = value.contains(/%(lld|ld|d|@|(?:\.\d+)?l?[fFeEgG])/)
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

    static func suite(_ name: String) throws -> UserDefaults {
        let d = try #require(UserDefaults(suiteName: name))
        d.removePersistentDomain(forName: name)
        return d
    }

    @Test func applyStoresTheLanguageForTheNextLaunch() throws {
        let name = "interface-language-test"
        let defaults = try Self.suite(name)
        defer { defaults.removePersistentDomain(forName: name) }
        #expect(InterfaceLanguage.apply(root: "ar", defaults: defaults, domain: name) == "ar")
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["ar"])
        #expect(InterfaceLanguage.layoutDirection == .rightToLeft)
        InterfaceLanguage.apply(root: "ja", defaults: defaults, domain: name)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["ja"])
        #expect(InterfaceLanguage.layoutDirection == .leftToRight)
        InterfaceLanguage.apply(root: nil, defaults: defaults, domain: name)
        #expect(defaults.persistentDomain(forName: name)?["AppleLanguages"] == nil)
        #expect(defaults.string(forKey: InterfaceLanguage.storageKey) == nil)
    }

    @Test(arguments: ["la", "grc", "sa", "ang"])
    func classicalRootKeepsTheDeviceLanguage(_ root: String) throws {
        let name = "interface-language-classical"
        let defaults = try Self.suite(name)
        defer { defaults.removePersistentDomain(forName: name) }
        #expect(InterfaceLanguage.apply(root: root, defaults: defaults, domain: name) == nil)
        #expect(defaults.persistentDomain(forName: name)?["AppleLanguages"] == nil)
        #expect(InterfaceLanguage.locale == .current)
        defaults.set(["fr"], forKey: "AppleLanguages")
        #expect(InterfaceLanguage.apply(root: root, defaults: defaults, domain: name) == nil)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["fr"])
    }

    @Test func userPerAppLanguageWins() throws {
        let name = "interface-language-user"
        let defaults = try Self.suite(name)
        defer { defaults.removePersistentDomain(forName: name) }
        defaults.set(["de"], forKey: "AppleLanguages")
        #expect(InterfaceLanguage.apply(root: "ja", defaults: defaults, domain: name) == nil)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["de"])
        InterfaceLanguage.apply(root: nil, defaults: defaults, domain: name)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["de"])
        defaults.removeObject(forKey: "AppleLanguages")
        #expect(InterfaceLanguage.apply(root: "ja", defaults: defaults, domain: name) == "ja")
        defaults.set(["ko"], forKey: "AppleLanguages")
        #expect(InterfaceLanguage.apply(root: "ja", defaults: defaults, domain: name) == nil)
        #expect(defaults.stringArray(forKey: "AppleLanguages") == ["ko"])
    }

    static func sourceKeys() throws -> Set<String> {
        let fm = FileManager.default
        var keys = Set<String>()
        let call = /(?:\bText|\bButton|\bLabel|\bToggle|\bSection|navigationTitle|String\(localized:|Eyebrow\(text:)\(?\s*"((?:[^"\\\n]|\\[^(])*)"/
        for dir in ["Bucket/Sources", "Polingual/Sources", "ShareExtension/Sources", "Clip/Sources"] {
            let root = appleRoot.appendingPathComponent(dir)
            guard let walk = fm.enumerator(at: root, includingPropertiesForKeys: nil) else { continue }
            for case let url as URL in walk where url.pathExtension == "swift" {
                let text = try String(contentsOf: url, encoding: .utf8)
                for m in text.matches(of: call) {
                    let key = String(m.output.1).replacingOccurrences(of: "\\\"", with: "\"").replacingOccurrences(of: "\\n", with: "\n")
                    if !key.isEmpty { keys.insert(key) }
                }
            }
        }
        return keys
    }

    @Test func literalKeysInSwiftExistInEveryLanguage() throws {
        let keys = try Self.sourceKeys()
        #expect(keys.count > 300)
        let tables = ["Bucket/Resources/%@.lproj/Localizable.strings", "Polingual/Resources/%@.lproj/Localizable.strings", "ShareExtension/Resources/%@.lproj/Localizable.strings", "Clip/Resources/%@.lproj/Localizable.strings"]
        for lang in Self.languages {
            let known = tables.compactMap { Self.table($0, lang) }.reduce(into: Set<String>()) { $0.formUnion($1.keys) }
            let missing = keys.subtracting(known)
            #expect(missing.isEmpty, "\(lang) lacks \(missing.sorted().prefix(8))")
        }
    }
}
