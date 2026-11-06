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

    static let writtenKey = "interface.appleLanguages"
    static let appleLanguages = "AppleLanguages"

    nonisolated(unsafe) private static var active: String?

    static func localization(for root: String?) -> String? {
        root.flatMap { localizations[$0] }
    }

    static var current: String? { active }

    static var locale: Locale {
        active.map(Locale.init(identifier:)) ?? .current
    }

    static var layoutDirection: LayoutDirection { direction(active) }

    static func direction(_ active: String?) -> LayoutDirection {
        guard let active else { return Locale.current.language.characterDirection == .rightToLeft ? .rightToLeft : .leftToRight }
        return rightToLeft.contains(String(active.prefix(2))) ? .rightToLeft : .leftToRight
    }

    static var deviceRoot: String {
        let code = Locale.preferredLanguages.first.map { Locale(identifier: $0).language.languageCode?.identifier ?? "en" } ?? "en"
        return localizations[code] != nil && Lang.codes.contains(code) ? code : "en"
    }

    static var appDomain: String { Bundle.main.bundleIdentifier ?? "" }

    static func userChoseLanguage(_ defaults: UserDefaults, domain: String) -> Bool {
        let own = defaults.persistentDomain(forName: domain)?[appleLanguages] as? [String]
        return own != nil && own != defaults.stringArray(forKey: writtenKey)
    }

    static func restore(_ defaults: UserDefaults = .standard, domain: String = appDomain) {
        apply(root: defaults.string(forKey: storageKey), defaults: defaults, domain: domain)
    }

    @discardableResult
    static func apply(root: String?, defaults: UserDefaults = .standard, domain: String = appDomain) -> String? {
        if userChoseLanguage(defaults, domain: domain) {
            active = nil
            defaults.removeObject(forKey: writtenKey)
            root.map { defaults.set($0, forKey: storageKey) } ?? defaults.removeObject(forKey: storageKey)
            return nil
        }
        let loc = localization(for: root)
        active = loc
        if let root { defaults.set(root, forKey: storageKey) } else { defaults.removeObject(forKey: storageKey) }
        if let loc {
            defaults.set([loc], forKey: appleLanguages)
            defaults.set([loc], forKey: writtenKey)
        } else if defaults.stringArray(forKey: writtenKey) != nil {
            defaults.removeObject(forKey: appleLanguages)
            defaults.removeObject(forKey: writtenKey)
        }
        return loc
    }
}

@MainActor @Observable
final class InterfacePick {
    static let shared = InterfacePick()
    var root: String?
}

enum RootState: Equatable {
    case loading
    case known(String?)
}

struct InterfaceLanguageModifier: ViewModifier {
    let state: RootState
    @State private var active = InterfaceLanguage.current

    var effective: RootState {
        if case .known(nil) = state, let pick = InterfacePick.shared.root { return .known(pick) }
        return state
    }

    func body(content: Content) -> some View {
        content
            .environment(\.locale, active.map(Locale.init(identifier:)) ?? .current)
            .environment(\.layoutDirection, InterfaceLanguage.direction(active))
            .onChange(of: effective, initial: true) { _, s in
                guard case .known(let root) = s else { return }
                active = InterfaceLanguage.apply(root: root)
            }
    }
}

extension View {
    func interfaceLanguage(_ store: LangStore) -> some View {
        modifier(InterfaceLanguageModifier(state: store.status == .ready || store.status == .error ? .known(store.systems.first?.root) : .loading))
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
