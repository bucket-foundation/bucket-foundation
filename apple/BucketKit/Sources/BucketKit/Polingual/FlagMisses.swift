import Foundation

public enum FlagMisses {
    static let key = "flagMisses"
    static let hitsKey = "flagHits"
    public static let hitsToHideName = 3

    static func table(_ state: EngineState, _ key: String) -> JSObject { state.settingsExtra[key]?.object ?? JSObject() }

    static func value(_ state: EngineState, _ key: String, _ lang: String) -> Int { Int(table(state, key)[lang]?.number ?? 0) }

    static func setting(_ state: EngineState, _ key: String, _ lang: String, _ n: Int) -> EngineState {
        var next = state
        var t = table(state, key)
        t[lang] = .number(Double(n))
        next.settingsExtra[key] = .object(t)
        return next
    }

    public static func count(_ state: EngineState, _ lang: String) -> Int { value(state, key, lang) }

    public static func hits(_ state: EngineState, _ lang: String) -> Int { value(state, hitsKey, lang) }

    public static func showsName(_ state: EngineState, _ lang: String) -> Bool { hits(state, lang) < hitsToHideName }

    public static func recording(_ state: EngineState, _ lang: String) -> EngineState {
        setting(setting(state, key, lang, count(state, lang) + 1), hitsKey, lang, 0)
    }

    public static func recordingHit(_ state: EngineState, _ lang: String) -> EngineState {
        setting(state, hitsKey, lang, hits(state, lang) + 1)
    }

    public static func gradeMatch(_ pairs: [LangWord], _ assign: [String: String], _ state: EngineState) -> (ratings: [(lang: String, rating: Rating?)], state: EngineState) {
        var next = state
        var out: [(lang: String, rating: Rating?)] = []
        for p in pairs {
            let flag = assign[p.lang]
            if flag == p.lang {
                out.append((p.lang, 3))
                next = recordingHit(next, p.lang)
            } else if let flag, !showsName(state, flag) {
                out.append((p.lang, nil))
                next = recording(next, flag)
            } else {
                out.append((p.lang, 1))
            }
        }
        return (out, next)
    }

    static func mergeSynced(_ out: inout JSObject, _ a: JSObject, _ b: JSObject) {
        let ma = a[key]?.object, mb = b[key]?.object, ha = a[hitsKey]?.object, hb = b[hitsKey]?.object
        guard ma != nil || mb != nil || ha != nil || hb != nil else { return }
        var langs: [String] = []
        for t in [ma, ha, mb, hb] { for l in t?.keys ?? [] where !langs.contains(l) { langs.append(l) } }
        var misses = JSObject()
        var hits = JSObject()
        for l in langs {
            let na = ma?[l]?.number ?? 0, nb = mb?[l]?.number ?? 0
            let xa = ha?[l]?.number ?? 0, xb = hb?[l]?.number ?? 0
            let (m, h) = na > nb ? (na, xa) : nb > na ? (nb, xb) : (na, max(xa, xb))
            if ha?[l] != nil || hb?[l] != nil || m > 0 { hits[l] = .number(h) }
            if ma?[l] != nil || mb?[l] != nil { misses[l] = .number(m) }
        }
        out[key] = ma == nil && mb == nil ? nil : .object(misses)
        out[hitsKey] = ha == nil && hb == nil ? nil : .object(hits)
    }

    public static func merging(_ flags: EngineState, into state: EngineState) -> EngineState {
        var next = state
        for k in [key, hitsKey] { next.settingsExtra[k] = flags.settingsExtra[k] }
        return next
    }
}
