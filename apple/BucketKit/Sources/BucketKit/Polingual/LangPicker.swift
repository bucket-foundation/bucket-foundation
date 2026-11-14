import Foundation

public enum LangPicker {
    public static let native: [String: String] = [
        "en": "English", "es": "Español", "fr": "Français", "it": "Italiano", "pt": "Português",
        "de": "Deutsch", "nl": "Nederlands", "sv": "Svenska", "pl": "Polski", "fi": "Suomi",
        "ru": "Русский", "el": "Ελληνικά", "ar": "العربية", "hi": "हिन्दी", "ja": "日本語",
        "zh": "中文", "ko": "한국어", "he": "עברית", "fa": "فارسی", "tr": "Türkçe",
        "cs": "Čeština", "id": "Bahasa Indonesia", "vi": "Tiếng Việt", "th": "ไทย", "ta": "தமிழ்",
        "la": "Latina", "grc": "Ἑλληνική", "sa": "संस्कृतम्", "ang": "Ænglisc",
    ]

    public static let recentLimit = 4

    public enum Group: String, Sendable, CaseIterable {
        case recent, suggested, all
    }

    public struct Section: Sendable, Equatable {
        public let group: Group
        public let codes: [String]
    }

    public static func nativeName(_ code: String) -> String { native[code] ?? Lang.name(code) }

    public static func matches(_ code: String, _ query: String, alias: String = "") -> Bool {
        let q = foldForSearch(query)
        guard !q.isEmpty else { return true }
        let names = [Lang.name(code), nativeName(code), alias].map(foldForSearch).filter { !$0.isEmpty }
        return foldForSearch(code).hasPrefix(q) || names.contains { $0.contains(q) }
    }

    public static func sections(query: String, recent: [String], suggested: [String], all: [String], alias: (String) -> String = { _ in "" }) -> [Section] {
        var seen = Set<String>()
        func take(_ list: [String]) -> [String] {
            list.filter { matches($0, query, alias: alias($0)) && seen.insert($0).inserted }
        }
        let known = recent.filter(all.contains)
        let groups: [(Group, [String])] = foldForSearch(query).isEmpty
            ? [(.recent, take(known)), (.suggested, take(suggested)), (.all, take(all))]
            : [(.all, take(known + suggested + all))]
        return groups.filter { !$0.1.isEmpty }.map { Section(group: $0.0, codes: $0.1) }
    }

    public static func remember(_ code: String, in recent: [String]) -> [String] {
        Array(([code] + recent.filter { $0 != code }).prefix(recentLimit))
    }

    public static func swap(from: String?, detected: String?, targets: [String]) -> (from: String, targets: [String])? {
        guard let source = from ?? detected, let first = targets.first, first != source else { return nil }
        var next = targets
        next[0] = source
        var seen = Set<String>()
        return (first, next.filter { $0 != first && seen.insert($0).inserted })
    }
}
