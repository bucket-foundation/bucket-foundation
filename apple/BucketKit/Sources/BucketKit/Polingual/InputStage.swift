import Foundation

public struct InputToken: Equatable, Sendable {
    public var surface: String
    public var lemma: String
    public init(surface: String, lemma: String) { self.surface = surface; self.lemma = lemma }
}

public struct InputMedia: Equatable, Sendable {
    public var videoId: String
    public var start: Double
    public var end: Double
}

public struct InputItem: Equatable, Sendable {
    public var id: String
    public var tokens: [InputToken]
    public var text: String
    public var translation: String?
    public var translationSource: String?
    public var media: InputMedia?
    public init(id: String, tokens: [InputToken], text: String = "", translation: String? = nil, translationSource: String? = nil, media: InputMedia? = nil) {
        self.id = id; self.tokens = tokens; self.text = text; self.translation = translation; self.translationSource = translationSource; self.media = media
    }
}

public struct InputUnitRef: Equatable, Sendable {
    public var id: String
    public var kind: String
    public var itemIds: [String]
    public var targetLemmas: [String]
}

public struct InputBundle: Sendable {
    public var lang: String
    public var items: [InputItem]
    public var units: [InputUnitRef]
    public var byId: [String: InputItem] { Dictionary(items.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a }) }
    public func lemmas(_ u: InputUnitRef) -> [String] {
        let map = byId
        return u.itemIds.flatMap { map[$0]?.tokens.map(\.lemma) ?? [] }
    }
}

public struct StageChoice: Sendable {
    public var unit: InputUnitRef
    public var items: [InputItem]
    public var plan: InputPlan
    public var fallback: Bool
}

public struct Viewing: Equatable, Sendable {
    public var taps: [String: [String]] = [:]
    public var seenMs: [String: Double] = [:]
    public var revealed: Set<String> = []
    public init() {}
}

public struct ExposureInput: Equatable, Sendable {
    public var item: String
    public var unit: String
    public var lemmasSeen: [String]
    public var taps: [String]
    public var seconds: Int
    public var coveragePred: Double
    public var completed: Bool
    public var revealed: Bool
    public var playback: String? = nil
}

public enum InputStage {
    public static let maxExposureSeconds = 3600

    static func lemmaOk(_ s: String) -> Bool { s.range(of: "^\\S{1,40}$", options: .regularExpression) != nil }

    public static func parseBundle(_ data: Data) -> InputBundle? {
        guard let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any], o["format"] as? String == "polingual-input",
              let lang = o["lang"] as? String, let rawItems = o["items"] as? [[String: Any]], let rawUnits = o["units"] as? [[String: Any]] else { return nil }
        var items: [InputItem] = []
        for i in rawItems {
            guard let id = i["id"] as? String, let toks = i["tokens"] as? [[String: Any]] else { return nil }
            let media = (i["media"] as? [String: Any]).flatMap { m -> InputMedia? in
                guard let v = m["videoId"] as? String, let s = (m["start"] as? NSNumber)?.doubleValue, let e = (m["end"] as? NSNumber)?.doubleValue else { return nil }
                return InputMedia(videoId: v, start: s, end: e)
            }
            items.append(InputItem(id: id, tokens: toks.compactMap { t in (t["surface"] as? String).flatMap { s in (t["lemma"] as? String).map { InputToken(surface: s, lemma: $0) } } }, text: i["text"] as? String ?? "", translation: i["translation"] as? String, translationSource: i["translationSource"] as? String, media: media))
        }
        let units = rawUnits.compactMap { u -> InputUnitRef? in
            guard let id = u["id"] as? String, let kind = u["kind"] as? String, let ids = u["itemIds"] as? [String] else { return nil }
            return InputUnitRef(id: id, kind: kind, itemIds: ids, targetLemmas: u["targetLemmas"] as? [String] ?? [])
        }
        return InputBundle(lang: lang, items: items, units: units)
    }

    public static let bandRanks = [500, 1000, 2000, 4000, 8000]

    public static func bandsFor(_ knownWords: Int) -> [Int] {
        guard let i = bandRanks.firstIndex(where: { $0 > max(0, knownWords) }) else { return [bandRanks.last!] }
        return Array(bandRanks[i..<min(i + 2, bandRanks.count)])
    }

    public static func expandBandItem(_ o: [String: Any]) -> InputItem? {
        guard let id = o["id"] as? String, let text = o["text"] as? String, let tok = o["tok"] as? [[Any]] else { return nil }
        let cps = Array(text.unicodeScalars)
        var tokens: [InputToken] = []
        for t in tok {
            guard t.count >= 2, let at = (t[0] as? NSNumber)?.intValue, let n = (t[1] as? NSNumber)?.intValue, at >= 0, n >= 1, at + n <= cps.count else { return nil }
            var s = String.UnicodeScalarView()
            s.append(contentsOf: cps[at..<(at + n)])
            let surface = String(s)
            tokens.append(InputToken(surface: surface, lemma: t.count > 2 ? (t[2] as? String ?? surface) : surface))
        }
        let media = (o["media"] as? [String: Any]).flatMap { m -> InputMedia? in
            guard let v = m["videoId"] as? String, let s = (m["start"] as? NSNumber)?.doubleValue, let e = (m["end"] as? NSNumber)?.doubleValue else { return nil }
            return InputMedia(videoId: v, start: s, end: e)
        }
        return InputItem(id: id, tokens: tokens, text: text, translation: o["translation"] as? String, translationSource: o["translationSource"] as? String, media: media)
    }

    public static func mergeBands(_ b: InputBundle, bands: [Data?]) -> InputBundle {
        var items = b.items
        var have = Set(items.map(\.id))
        var unitIds = Set(b.units.map(\.id))
        var units = b.units
        for data in bands {
            guard let data, let o = try? JSONSerialization.jsonObject(with: data) as? [String: Any], o["format"] as? String == "polingual-input-band",
                  o["lang"] as? String == b.lang, let rawItems = o["items"] as? [[String: Any]], let rawUnits = o["units"] as? [[String: Any]] else { continue }
            var fresh: [String: InputItem] = [:]
            for i in rawItems {
                if let id = i["id"] as? String, have.contains(id) { continue }
                if let x = expandBandItem(i) { fresh[x.id] = x }
            }
            for u in rawUnits {
                guard let id = u["id"] as? String, let kind = u["kind"] as? String, let ids = u["itemIds"] as? [String],
                      !unitIds.contains(id), ids.allSatisfy({ have.contains($0) || fresh[$0] != nil }) else { continue }
                for i in ids where !have.contains(i) {
                    items.append(fresh[i]!)
                    have.insert(i)
                }
                unitIds.insert(id)
                units.append(InputUnitRef(id: id, kind: kind, itemIds: ids, targetLemmas: u["targetLemmas"] as? [String] ?? []))
            }
        }
        return InputBundle(lang: b.lang, items: items, units: units)
    }

    public static func choose(_ b: InputBundle, learner l: InputLearner, allowFallback: Bool) -> StageChoice? {
        let map = b.byId
        let byId = Dictionary(b.units.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let plans = b.units.map { u in InputSelector.plan(u.id, lemmas: b.lemmas(u), targets: u.targetLemmas, media: u.kind == "episode", video: u.itemIds.first.flatMap { map[$0]?.media?.videoId }, learner: l) }
        guard let pick = InputSelector.select(plans, learner: l, lemmasOf: { b.lemmas(byId[$0]!) }), allowFallback || !pick.fallback, let unit = byId[pick.plan.unit] else { return nil }
        return StageChoice(unit: unit, items: unit.itemIds.compactMap { map[$0] }, plan: pick.plan, fallback: pick.fallback)
    }

    public static func toggleTap(_ v: Viewing, item: String, lemma: String) -> Viewing {
        var out = v
        var cur = v.taps[item] ?? []
        if let i = cur.firstIndex(of: lemma) { cur.remove(at: i) } else { cur.append(lemma) }
        out.taps[item] = cur
        return out
    }

    public static func addSeen(_ v: Viewing, visible: [String], ms: Double) -> Viewing {
        guard ms > 0, !visible.isEmpty else { return v }
        var out = v
        let share = ms / Double(visible.count)
        for id in visible { out.seenMs[id, default: 0] += share }
        return out
    }

    public static func reveal(_ v: Viewing, item: String) -> Viewing {
        var out = v
        out.revealed.insert(item)
        return out
    }

    static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

    static func distinct(_ xs: [String]) -> [String] {
        var seen = Set<String>()
        return xs.filter { seen.insert($0).inserted }
    }

    public static func present(_ v: Viewing, visible: [String]) -> Viewing {
        var out = v
        for id in visible where out.seenMs[id] == nil { out.seenMs[id] = 0 }
        return out
    }

    public static func exposureRows(_ choice: StageChoice, viewing v: Viewing, completed: Bool, playerUnavailable: Bool = false) -> [ExposureInput] {
        choice.items.compactMap { item in
            guard let ms = v.seenMs[item.id], ms > 0 || playerUnavailable else { return nil }
            let lemmas = Array(distinct(item.tokens.map(\.lemma).filter(lemmaOk)).prefix(200))
            let taps = Array(distinct(v.taps[item.id] ?? []).filter(lemmaOk).prefix(50))
            let secs = Int(min(Double(maxExposureSeconds), max(0, jsRound(ms / 1000))))
            let cov = jsRound(min(1, max(0, choice.plan.coverage)) * 1e4) / 1e4
            return ExposureInput(item: item.id, unit: choice.unit.id, lemmasSeen: lemmas, taps: taps, seconds: secs, coveragePred: cov, completed: completed, revealed: v.revealed.contains(item.id), playback: playerUnavailable && item.media != nil ? "unavailable" : nil)
        }
    }
}
