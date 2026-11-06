import BucketKit
import Foundation
import SwiftUI

enum InterfaceLanguage {
    static let localizations: [String: String] = [
        "en": "en", "ar": "ar", "cs": "cs", "de": "de", "el": "el", "es": "es", "fa": "fa", "fi": "fi", "fr": "fr",
        "he": "he", "hi": "hi", "id": "id", "it": "it", "ja": "ja", "ko": "ko", "nl": "nl", "pl": "pl", "pt": "pt-BR",
        "ru": "ru", "sv": "sv", "ta": "ta", "th": "th", "tr": "tr", "vi": "vi", "zh": "zh-Hans",
    ]
    static let rightToLeft: Set<String> = ["ar", "fa", "he"]
    static let storageKey = "interface.root"

    nonisolated(unsafe) private static var active: String?

    static func localization(for root: String?) -> String? {
        root.flatMap { localizations[$0] }
    }

    static var current: String? { active }

    static var locale: Locale {
        active.map(Locale.init(identifier:)) ?? .current
    }

    static var layoutDirection: LayoutDirection {
        guard let active else { return Locale.current.language.characterDirection == .rightToLeft ? .rightToLeft : .leftToRight }
        return rightToLeft.contains(String(active.prefix(2))) ? .rightToLeft : .leftToRight
    }

    static func restore(_ defaults: UserDefaults = .standard) {
        apply(root: defaults.string(forKey: storageKey), defaults: defaults)
    }

    static var deviceRoot: String {
        let code = Locale.preferredLanguages.first.map { Locale(identifier: $0).language.languageCode?.identifier ?? "en" } ?? "en"
        return localizations[code] != nil && Lang.codes.contains(code) ? code : "en"
    }

    @discardableResult
    static func apply(root: String?, defaults: UserDefaults = .standard) -> String? {
        let loc = localization(for: root)
        active = loc
        guard defaults.string(forKey: storageKey) != root else { return loc }
        if let root, let loc {
            defaults.set(root, forKey: storageKey)
            defaults.set([loc], forKey: "AppleLanguages")
        } else {
            defaults.removeObject(forKey: storageKey)
            defaults.removeObject(forKey: "AppleLanguages")
        }
        return loc
    }
}

@MainActor @Observable
final class InterfacePick {
    static let shared = InterfacePick()
    var root: String?
}

struct InterfaceLanguageModifier: ViewModifier {
    let root: String?

    func body(content: Content) -> some View {
        if let root = root ?? InterfacePick.shared.root { InterfaceLanguage.apply(root: root) }
        return content
            .environment(\.locale, InterfaceLanguage.locale)
            .environment(\.layoutDirection, InterfaceLanguage.layoutDirection)
    }
}

extension View {
    func interfaceLanguage(_ root: String?) -> some View {
        modifier(InterfaceLanguageModifier(root: root))
    }
}

extension InterfaceLanguage {
    static func string(_ key: String) -> String {
        let lproj = active.flatMap { Bundle.main.path(forResource: $0, ofType: "lproj") }.flatMap(Bundle.init(path:))
        return (lproj ?? .main).localizedString(forKey: key, value: key, table: nil)
    }
}

extension LangSystem {
    var title: String {
        guard name == systemName(root, targets) else { return name }
        let preset = Lang.presets.first { $0.targets.count == targets.count && $0.targets.allSatisfy(targets.contains) }
        let set = preset.map { InterfaceLanguage.string($0.name) } ?? targets.map(langName).joined(separator: " + ")
        return String(format: InterfaceLanguage.string("%@ from %@"), set, langName(root))
    }
}
