import Foundation

public typealias LemmaResolver = (_ lang: String, _ lemma: String) -> String?

extension InputStage {
    static func lemmaKey(_ s: String) -> String {
        s.precomposedStringWithCanonicalMapping.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func lemmaCardMap(_ corpus: LangCorpus, lang: String) -> [String: String] {
        var out: [String: String] = [:]
        let words = corpus.items.filter { $0.kind == .word && $0.forms[lang] != nil }
            .sorted { $0.tier != $1.tier ? $0.tier < $1.tier : $0.id < $1.id }
        for w in words {
            let k = lemmaKey(w.forms[lang]!)
            if !k.isEmpty && out[k] == nil { out[k] = cardId(lang, w.id) }
        }
        return out
    }

    public static func resolver(_ maps: [String: [String: String]]) -> LemmaResolver {
        { lang, lemma in maps[lang]?[lemmaKey(lemma)] }
    }

    public static func dueLemmas(_ b: InputBundle, state: EngineState, lang: String, resolve: LemmaResolver, now: Double) -> Set<String> {
        var out = Set<String>()
        for item in b.items {
            for t in item.tokens {
                guard let id = resolve(lang, t.lemma), let due = state.cards[id]?.due, due <= now else { continue }
                out.insert(t.lemma)
            }
        }
        return out
    }

    public static func learner(_ state: EngineState, lang: String, resolve: @escaping LemmaResolver, now: Double, tier: Int, due: Set<String>, recent: [String: Int] = [:], lastVideo: String? = nil) -> InputLearner {
        InputLearner(p: { lemma in
            let c = resolve(lang, lemma).flatMap { state.cards[$0] }
            return LearnerModel.known(LemmaEvidence(stability: c?.stability, lastReview: c?.lastReview), now: now, tier: tier).p
        }, due: due, rank: { _ in nil }, recent: recent, lastVideo: lastVideo)
    }

    public static func eligibleUnitSeconds(_ b: InputBundle, learner l: InputLearner) -> [Double] {
        let map = b.byId
        return b.units.compactMap { u in
            let p = InputSelector.plan(u.id, lemmas: b.lemmas(u), targets: u.targetLemmas, media: u.kind == "episode", video: u.itemIds.first.flatMap { map[$0]?.media?.videoId }, learner: l)
            return p.eligible ? Double(p.tokens) * 1.5 : nil
        }
    }

    public static func logRow(_ e: ExposureInput, lang: String, meta: LogRow.Meta) -> LogRow {
        .exposure(.init(meta: meta, lang: lang, item: e.item, unit: e.unit, lemmasSeen: e.lemmasSeen, taps: e.taps, seconds: e.seconds, coveragePred: e.coveragePred, completed: e.completed, revealed: e.revealed, playback: e.playback))
    }
}

public enum InputMode: Equatable, Sendable {
    case off, on, demo

    public static func of(_ flag: String?, debug: Bool) -> InputMode {
        switch flag {
        case "demo": debug ? .demo : .off
        case "1", "on": .on
        case "0", "off": .off
        default: debug ? .on : .off
        }
    }
}

public final class InputPlanState {
    public let lang: String
    public let mix: SessionMix.InputMix
    let bundle: InputBundle
    let resolve: LemmaResolver
    let tier: Int
    let systemId: String
    let started: Double
    let allowFallback: Bool
    let device: String
    let clock: () -> Double
    let ids: () -> String
    let tz: String
    private var done = Set<Int>()
    private var shown: [String: Int] = [:]
    private var units = 0
    private var seconds = 0.0
    private var ended = false
    private var current: (Int, StageChoice)?

    init(lang: String, bundle: InputBundle, resolve: @escaping LemmaResolver, mix: SessionMix.InputMix, tier: Int, systemId: String, started: Double, allowFallback: Bool, device: String, clock: @escaping () -> Double, ids: @escaping () -> String, tz: String) {
        self.lang = lang; self.bundle = bundle; self.resolve = resolve; self.mix = mix; self.tier = tier; self.systemId = systemId
        self.started = started; self.allowFallback = allowFallback; self.device = device; self.clock = clock; self.ids = ids; self.tz = tz
    }

    public static func plan(mode: InputMode, lang: String, bundle: InputBundle, resolve: @escaping LemmaResolver, state: EngineState, cards: Int, tier: Int, systemId: String, device: String, now: Double,
                            clock: @escaping () -> Double = { Date().timeIntervalSince1970 * 1000 }, ids: @escaping () -> String = { UUID().uuidString.lowercased() }, tz: String = TimeZone.current.identifier) -> InputPlanState? {
        if mode == .off { return nil }
        let l = InputStage.learner(state, lang: lang, resolve: resolve, now: now, tier: tier, due: InputStage.dueLemmas(bundle, state: state, lang: lang, resolve: resolve, now: now))
        let demo = mode == .demo
        var eligible = InputStage.eligibleUnitSeconds(bundle, learner: l)
        if eligible.isEmpty && demo, let c = InputStage.choose(bundle, learner: l, allowFallback: true) { eligible = [Double(c.plan.tokens) * 1.5] }
        let mix = SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligible)
        if mix.units == 0 { return nil }
        return InputPlanState(lang: lang, bundle: bundle, resolve: resolve, mix: mix, tier: tier, systemId: systemId, started: now, allowFallback: demo, device: device, clock: clock, ids: ids, tz: tz)
    }

    public func itemId(_ lemma: String) -> String? {
        resolve(lang, lemma).flatMap { $0.split(separator: ":", maxSplits: 1).last.map(String.init) }
    }

    public func due(answered: Int) -> StageChoice? {
        guard let c = current, c.0 == answered, mix.positions.contains(answered), !done.contains(answered) else { return nil }
        return c.1
    }

    public func prepare(answered i: Int, state: EngineState) {
        guard mix.positions.contains(i), !done.contains(i), current?.0 != i else { return }
        let now = clock()
        let l = InputStage.learner(state, lang: lang, resolve: resolve, now: now, tier: tier, due: InputStage.dueLemmas(bundle, state: state, lang: lang, resolve: resolve, now: now), recent: shown)
        if let c = InputStage.choose(bundle, learner: l, allowFallback: allowFallback) { current = (i, c) } else { done.insert(i) }
    }

    public func finish(_ rows: [ExposureInput], seconds secs: Double) -> [LogRow] {
        guard let c = current else { return [] }
        done.insert(c.0)
        current = nil
        let now = clock()
        let out = rows.map { InputStage.logRow($0, lang: lang, meta: LogRow.Meta(id: ids(), at: now, device: device, tz: tz, systemId: systemId)) }
        if !rows.isEmpty {
            shown[c.1.unit.id, default: 0] += 1
            units += 1
            seconds += secs
        }
        return out
    }

    public func end(answered: Int) -> LogRow? {
        if ended { return nil }
        ended = true
        let now = clock()
        let total = (now - started) / 1000
        let real = total > 0 ? (min(1, seconds / total) * 1e4).rounded() / 1e4 : 0
        return .session(.init(meta: LogRow.Meta(id: ids(), at: now, device: device, tz: tz, systemId: systemId), lang: lang, sessionId: ids(), started: started, ended: now, shareTarget: mix.target, shareReal: real, arm: nil, units: min(units, 1000), cards: min(answered, 1000)))
    }
}

public enum InputManifest {
    static let file = "^[a-z]{2,3}\\.[0-9a-f]{8,64}\\.json$"

    static func langs(_ data: Data) -> [String: Any]? {
        (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["langs"] as? [String: Any]
    }

    public static func files(_ data: Data) -> Set<String> {
        Set((langs(data) ?? [:]).values.compactMap { ($0 as? [String: Any])?["file"] as? String }.filter { $0.range(of: file, options: .regularExpression) != nil })
    }

    public static func file(_ data: Data, lang: String) -> String? {
        guard let f = (langs(data)?[lang] as? [String: Any])?["file"] as? String, f.range(of: file, options: .regularExpression) != nil else { return nil }
        return f
    }
}

public final class InputRepo: @unchecked Sendable {
    let dir: URL
    let base: String
    let fetch: @Sendable (URL) async -> Data?

    public init(dir: URL, base: String, fetch: @escaping @Sendable (URL) async -> Data?) {
        self.dir = dir; self.base = base; self.fetch = fetch
    }

    public convenience init(dir: URL, base: String) {
        self.init(dir: dir, base: base) { url in
            guard let (d, r) = try? await URLSession.shared.data(from: url), (r as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return d
        }
    }

    func cached(_ name: String) -> Data? { try? Data(contentsOf: dir.appendingPathComponent(name)) }

    func store(_ name: String, _ data: Data) {
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? data.write(to: dir.appendingPathComponent(name), options: .atomic)
    }

    func prune(_ manifest: Data) {
        let keep = InputManifest.files(manifest)
        guard !keep.isEmpty, let names = try? FileManager.default.contentsOfDirectory(atPath: dir.path) else { return }
        for n in names where n != "manifest.json" && !keep.contains(n) { try? FileManager.default.removeItem(at: dir.appendingPathComponent(n)) }
    }

    func url(_ name: String) -> URL? { URL(string: "\(base.hasSuffix("/") ? String(base.dropLast()) : base)/\(name)") }

    public func bundle(_ lang: String) async -> InputBundle? {
        var fresh: Data?
        if let u = url("manifest.json"), let d = await fetch(u), !InputManifest.files(d).isEmpty { fresh = d }
        if let f = fresh, f != cached("manifest.json") {
            store("manifest.json", f)
            prune(f)
        }
        guard let manifest = fresh ?? cached("manifest.json"), let file = InputManifest.file(manifest, lang: lang) else { return nil }
        if let d = cached(file), let b = InputStage.parseBundle(d) { return b }
        guard let u = url(file), let d = await fetch(u), let b = InputStage.parseBundle(d) else { return nil }
        store(file, d)
        return b
    }
}
