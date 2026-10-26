import Foundation

public enum FlagMisses {
    static let key = "flagMisses"

    public static func count(_ state: EngineState, _ lang: String) -> Int {
        Int(state.settingsExtra[key]?.object?[lang]?.number ?? 0)
    }

    public static func recording(_ state: EngineState, _ lang: String) -> EngineState {
        var next = state
        var table = state.settingsExtra[key]?.object ?? JSObject()
        table[lang] = .number(Double(count(state, lang) + 1))
        next.settingsExtra[key] = .object(table)
        return next
    }
}
