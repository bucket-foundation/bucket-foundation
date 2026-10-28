import Foundation

public enum CefrBand: String, Sendable, CaseIterable, Codable {
    case a1 = "A1", a2 = "A2", b1 = "B1", b2 = "B2"
}

public enum CefrTask: String, Sendable, Codable {
    case recognize, recall, listen, cloze, grammar, reading
}

public enum CefrMapping: String, Sendable { case proxy, none }

public struct TopWord: Sendable, Decodable, Equatable {
    public let rank: Int
    public let word: String
    public let meaning: String
    public var pos: String?
    public var ipa: String?
    public var zipf: Double?
    public let band: String
}

public struct BandSpec: Sendable {
    public let band: CefrBand
    public let tierMin: Double
    public let tierMax: Double
    public let sentenceLevel: Double
    public let pastTense: Bool
    public let tasks: [CefrTask]
}

public struct CefrAnswer: Sendable, Equatable, Codable {
    public let band: CefrBand
    public let task: CefrTask
    public let itemId: String
    public let correct: Bool

    public init(band: CefrBand, task: CefrTask, itemId: String, correct: Bool) {
        self.band = band
        self.task = task
        self.itemId = itemId
        self.correct = correct
    }
}

public struct BandResult: Sendable, Equatable {
    public let band: CefrBand
    public let asked: Int
    public let right: Int
    public let recallRight: Int
    public let passed: Bool
    public let failed: Bool
    public let confidence: Double
}

public struct CefrStep: Sendable, Equatable {
    public let done: Bool
    public let level: String
    public let bands: [BandResult]
    public var next: (band: CefrBand, task: CefrTask)?
    public var unknownFrom: CefrBand?

    public var stoppedHere: CefrStep { CefrStep(done: true, level: level, bands: bands, unknownFrom: next?.band) }

    public static func == (a: CefrStep, b: CefrStep) -> Bool {
        a.done == b.done && a.level == b.level && a.bands == b.bands && a.next?.band == b.next?.band && a.next?.task == b.next?.task && a.unknownFrom == b.unknownFrom
    }
}

public struct CefrPlacement: Sendable, Equatable {
    public let level: String
    public let mapping: CefrMapping
    public let floorTier: Double
    public let placeIds: [String]
    public let bands: [BandResult]
    public var unknownFrom: CefrBand?
}

public struct PlacementSource: Sendable {
    public let system: LangSystem
    public let corpus: LangCorpus
    public let lang: String
    public let top: [TopWord]?

    public init(system: LangSystem, corpus: LangCorpus, lang: String, top: [TopWord]?) {
        self.system = system
        self.corpus = corpus
        self.lang = lang
        self.top = top
    }
}

public enum Cefr {
    public static let bands: [BandSpec] = [
        BandSpec(band: .a1, tierMin: 0, tierMax: 3, sentenceLevel: 1, pastTense: false, tasks: [.recognize, .recall, .listen, .cloze, .grammar, .recognize, .recall, .reading]),
        BandSpec(band: .a2, tierMin: 4, tierMax: 6, sentenceLevel: 1, pastTense: false, tasks: [.recall, .recognize, .cloze, .listen, .grammar, .reading, .recall, .cloze]),
        BandSpec(band: .b1, tierMin: 7, tierMax: 8, sentenceLevel: 2, pastTense: true, tasks: [.recall, .cloze, .reading, .grammar, .listen, .recall, .reading, .recall]),
        BandSpec(band: .b2, tierMin: 9, tierMax: 10, sentenceLevel: 3, pastTense: true, tasks: [.recall, .reading, .grammar, .recall, .cloze, .listen, .reading, .recall]),
    ]
    public static let bandItems = 8
    public static let bandPass = 6
    public static let bandFail = 3
    public static let bandRecallPass = 1
    public static let placeMinBands = 2
    public static let skipConfidence = 0.5
    public static let maxItems = bandItems * bands.count
    public static let noCefrLangs: Set<String> = ["la", "grc", "sa"]
    public static let wordTasks: Set<CefrTask> = [.recognize, .recall, .listen, .cloze]
    public static let topPrefix = "top:"

    static let fallback: [CefrTask: [CefrTask]] = [
        .recognize: [.recognize],
        .recall: [.recall, .recognize],
        .listen: [.listen, .recall, .recognize],
        .cloze: [.cloze, .recall, .recognize],
        .grammar: [.grammar, .recall, .recognize],
        .reading: [.reading, .cloze, .recall, .recognize],
    ]

    static func spec(_ band: CefrBand) -> BandSpec { bands.first { $0.band == band }! }

    public static func wilsonLower(_ right: Int, _ n: Int, z: Double = 1.96) -> Double {
        guard n > 0 else { return 0 }
        let nn = Double(n)
        let p = Double(right) / nn
        let z2 = z * z
        let v = (p + z2 / (2 * nn) - z * ((p * (1 - p)) / nn + z2 / (4 * nn * nn)).squareRoot()) / (1 + z2 / nn)
        return (max(0, v) * 100).rounded(.toNearestOrAwayFromZero) / 100
    }

    public static func topBands(_ top: [TopWord]) -> [Int: CefrBand] {
        var out: [Int: CefrBand] = [:]
        let b1 = top.filter { $0.band == "B1" && ($0.zipf ?? 0) > 0 }.map { $0.zipf! }.sorted()
        let median = b1.isEmpty ? nil : b1[b1.count / 2]
        for w in top {
            if w.band == "A1" { out[w.rank] = .a1 } else if w.band == "A2" { out[w.rank] = .a2 } else if w.band == "B1" {
                if let median, let z = w.zipf, z > 0, z < median { out[w.rank] = .b2 } else { out[w.rank] = .b1 }
            }
        }
        return out
    }

    public static func shortGloss(_ meaning: String) -> String {
        let first = String(meaning.split(separator: ";", omittingEmptySubsequences: false).first ?? "")
        let noParens = first.replacingOccurrences(of: "\\([^)]*\\)", with: "", options: .regularExpression)
        return noParens.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public static func bandResult(_ band: CefrBand, _ answers: [CefrAnswer]) -> BandResult {
        let at = answers.filter { $0.band == band }
        let right = at.filter(\.correct).count
        let wrong = at.count - right
        let recallRight = at.filter { $0.correct && $0.task == .recall }.count
        let passed = right >= bandPass && recallRight >= bandRecallPass
        let failed = !passed && (wrong >= bandFail || at.count >= bandItems)
        return BandResult(band: band, asked: at.count, right: right, recallRight: recallRight, passed: passed, failed: failed, confidence: wilsonLower(right, at.count))
    }

    public static func step(_ answers: [CefrAnswer], available: [CefrBand] = CefrBand.allCases) -> CefrStep {
        var results: [BandResult] = []
        var level = "pre-A1"
        for spec in bands {
            if !available.contains(spec.band) { return CefrStep(done: true, level: level, bands: results, unknownFrom: spec.band) }
            let r = bandResult(spec.band, answers)
            results.append(r)
            if r.passed {
                level = spec.band.rawValue
                continue
            }
            if r.failed { return CefrStep(done: true, level: level, bands: results) }
            return CefrStep(done: false, level: level, bands: results, next: (spec.band, spec.tasks[r.asked]))
        }
        return CefrStep(done: true, level: level, bands: results)
    }

    static func usesTop(_ src: PlacementSource) -> [TopWord]? {
        guard let top = src.top, !top.isEmpty, src.system.root == "en" else { return nil }
        return top
    }

    public static func topPool(_ top: [TopWord], _ band: CefrBand) -> [TopWord] {
        let b = topBands(top)
        return top.filter { b[$0.rank] == band && !$0.word.isEmpty && !shortGloss($0.meaning).isEmpty }
    }

    public static func corpusPool(_ system: LangSystem, _ corpus: LangCorpus, _ lang: String, _ band: CefrBand) -> [LangItem] {
        let s = spec(band)
        return corpus.items.filter { isVocab($0) && $0.tier >= s.tierMin && $0.tier <= s.tierMax && usable($0, system.root, lang) }
    }

    public static func bandsAvailable(_ src: PlacementSource) -> [CefrBand] {
        bands.filter { b in
            let n = usesTop(src).map { topPool($0, b.band).count } ?? corpusPool(src.system, src.corpus, src.lang, b.band).count
            return n >= bandItems
        }.map(\.band)
    }

    struct Probe {
        let id: String
        let target: String
        let gloss: String
        let reading: Reading?
    }

    static func probes(_ src: PlacementSource, _ band: CefrBand) -> [Probe] {
        if let top = usesTop(src) {
            return topPool(top, band).map { w in
                let ipa = w.ipa.flatMap { $0.isEmpty ? nil : $0.replacingOccurrences(of: "^/|/$", with: "", options: .regularExpression) }
                return Probe(id: "\(topPrefix)\(w.rank)", target: w.word, gloss: shortGloss(w.meaning), reading: ipa.map { Reading(ipa: $0) })
            }
        }
        return corpusPool(src.system, src.corpus, src.lang, band).map { i in
            Probe(id: i.id, target: i.forms[src.lang] ?? "", gloss: i.forms[src.system.root] ?? "", reading: i.readings[src.lang])
        }
    }

    static func others(_ all: [Probe], _ p: Probe, target: Bool, _ rng: inout Rng, _ n: Int = 3) -> [String] {
        var out: [String] = []
        for q in shuffle(all, &rng) {
            if out.count >= n { break }
            let v = target ? q.target : q.gloss
            if q.id == p.id || q.target == p.target || q.gloss == p.gloss || out.contains(v) { continue }
            out.append(v)
        }
        return out
    }

    static func sentencesWith(_ corpus: LangCorpus, _ lang: String, _ root: String, _ word: String, level: Double? = nil) -> [String] {
        let w = normalizeAnswer(word, lang)
        return corpus.poolKeys.filter { id in
            guard let s = corpus.pool[id], let t = s.t[lang], !t.isEmpty, let r = s.t[root], !r.isEmpty else { return false }
            if let level, (s.lv?[lang] ?? 1) != level { return false }
            return tokenize(t, lang, s.jaTokens).contains { normalizeAnswer($0, lang) == w }
        }
    }

    static func jsLowerIndex(_ text: String, _ needle: String) -> (before: String, after: String)? {
        let hay = Array(text.utf16)
        let lowHay = Array(text.lowercased().utf16)
        let low = Array(needle.lowercased().utf16)
        guard lowHay.count == hay.count, !low.isEmpty, low.count <= lowHay.count else { return nil }
        for start in 0...(lowHay.count - low.count) where Array(lowHay[start..<start + low.count]) == low {
            let needleLen = Array(needle.utf16).count
            guard start + needleLen <= hay.count else { return nil }
            return (String(decoding: hay[0..<start], as: UTF16.self), String(decoding: hay[(start + needleLen)...], as: UTF16.self))
        }
        return nil
    }

    static func build(_ task: CefrTask, _ spec: BandSpec, _ src: PlacementSource, _ seen: Set<String>, _ rng: inout Rng) -> Exercise? {
        let corpus = src.corpus, lang = src.lang, root = src.system.root
        let all = probes(src, spec.band)
        let pool = shuffle(all.filter { !seen.contains($0.id) }, &rng)
        switch task {
        case .recognize, .recall:
            guard let p = pool.first else { return nil }
            if task == .recognize {
                var ex = Exercise(kind: .choose, itemId: p.id, lang: lang, root: root, prompt: p.gloss, promptLang: root, answer: p.target, answerLang: lang)
                ex.answerReading = p.reading
                ex.options = shuffle([p.target] + others(all, p, target: true, &rng), &rng)
                return ex
            }
            var ex = Exercise(kind: .translate, itemId: p.id, lang: lang, root: root, prompt: p.gloss, promptLang: root, answer: p.target, answerLang: lang)
            ex.answerReading = p.reading
            if Lang.info[lang]?.latin ?? true {
                ex.accept = [p.target]
            } else {
                var seenForms: [String] = []
                for f in [p.target, p.reading?.kana, p.reading?.roman] {
                    if let f, !f.trimmingCharacters(in: .whitespaces).isEmpty, !seenForms.contains(f) { seenForms.append(f) }
                }
                ex.accept = seenForms
            }
            return ex
        case .listen:
            guard let p = pool.first else { return nil }
            var ex = Exercise(kind: .listen, itemId: p.id, lang: lang, root: root, prompt: p.target, promptLang: lang, answer: p.gloss, answerLang: root)
            ex.promptReading = p.reading
            ex.options = shuffle([p.gloss] + others(all, p, target: false, &rng), &rng)
            return ex
        case .cloze:
            for p in pool.prefix(40) {
                let ids = sentencesWith(corpus, lang, root, p.target)
                guard !ids.isEmpty else { continue }
                guard let s = corpus.pool[ids[rng.index(ids.count)]], let text = s.t[lang], let gap = jsLowerIndex(text, p.target) else { continue }
                var ex = Exercise(kind: .cloze, itemId: p.id, lang: lang, root: root, prompt: s.t[root] ?? "", promptLang: root, answer: p.target, answerLang: lang)
                ex.cloze = gap
                ex.options = shuffle([p.target] + others(all, p, target: true, &rng), &rng)
                return ex
            }
            return nil
        case .grammar:
            let forms = corpus.items.filter { ($0.kind == .gender || $0.kind == .conj) && $0.tier >= spec.tierMin && $0.tier <= spec.tierMax + 0.5 && usable($0, root, lang) && !seen.contains($0.id) }
            let wanted = spec.pastTense ? forms.filter { $0.kind == .conj && !($0.conjPast[lang]?.isEmpty ?? true) } : forms
            guard let item = shuffle(wanted.isEmpty ? forms : wanted, &rng).first else { return nil }
            var card = Card(state: "review")
            card.reps = spec.pastTense ? 3 : 1
            card.lapses = 0
            card.stability = 3
            card.difficulty = 5
            card.lastReview = 0
            card.due = 0
            return exerciseFor(corpus, src.system, item, lang, card, &rng)
        case .reading:
            for p in pool.prefix(40) {
                let ids = sentencesWith(corpus, lang, root, p.target, level: spec.sentenceLevel)
                guard !ids.isEmpty else { continue }
                let id = ids[rng.index(ids.count)]
                guard let s = corpus.pool[id] else { continue }
                let wrong = sentenceDistractors(corpus, lang, root, id, &rng)
                if wrong.count < 3 { continue }
                let answer = s.t[lang] ?? ""
                var ex = Exercise(kind: .sentence, itemId: p.id, lang: lang, root: root, prompt: s.t[root] ?? "", promptLang: root, answer: answer, answerLang: lang)
                ex.level = spec.sentenceLevel
                ex.sentenceId = id
                ex.options = shuffle([answer] + wrong, &rng)
                if let r = s.r[lang], !r.isEmpty { ex.answerReading = Reading(roman: r) }
                return ex
            }
            return nil
        }
    }

    public static func question(_ src: PlacementSource, _ band: CefrBand, _ task: CefrTask, seen: Set<String>, _ rng: inout Rng, speech: Bool = true) -> (task: CefrTask, ex: Exercise)? {
        let s = spec(band)
        for t in (fallback[task] ?? [task]) where t != .listen || speech {
            if let ex = build(t, s, src, seen, &rng) { return (t, ex) }
        }
        return nil
    }

    public static func bareForm(_ form: String, _ lang: String) -> String {
        let stripped = form.replacingOccurrences(of: "^(el|la|los|las|le|les|il|lo|gli|o|a|os|as|der|die|das|de|het|en|ett|un|une|una|uno) ", with: "", options: [.regularExpression, .caseInsensitive])
            .replacingOccurrences(of: "^l'", with: "", options: [.regularExpression, .caseInsensitive])
        return normalizeAnswer(stripped, lang)
    }

    public static func checkedCorpusIds(_ src: PlacementSource, _ answers: [CefrAnswer], _ bandsIn: Set<CefrBand>) -> [String] {
        let right = answers.filter { $0.correct && wordTasks.contains($0.task) && bandsIn.contains($0.band) }
        var words = Set<String>()
        var ids: [String] = []
        func add(_ id: String) { if !ids.contains(id) { ids.append(id) } }
        for a in right {
            if a.itemId.hasPrefix(topPrefix) {
                if let w = src.top?.first(where: { "\(topPrefix)\($0.rank)" == a.itemId }) { words.insert(bareForm(w.word, src.lang)) }
            } else if let item = src.corpus.byId[a.itemId], isVocab(item) {
                add(a.itemId)
            }
        }
        if !words.isEmpty {
            for i in src.corpus.items where isVocab(i) && usable(i, src.system.root, src.lang) && words.contains(bareForm(i.forms[src.lang] ?? "", src.lang)) { add(i.id) }
        }
        return ids
    }

    public static func corpusTopBands(_ src: PlacementSource) -> [(id: String, band: CefrBand)] {
        guard let top = usesTop(src) else { return [] }
        let b = topBands(top)
        var byWord: [String: CefrBand] = [:]
        for w in top {
            guard let band = b[w.rank] else { continue }
            let k = bareForm(w.word, src.lang)
            if byWord[k] == nil { byWord[k] = band }
        }
        var out: [(id: String, band: CefrBand)] = []
        for i in src.corpus.items where isVocab(i) && usable(i, src.system.root, src.lang) {
            if let band = byWord[bareForm(i.forms[src.lang] ?? "", src.lang)] { out.append((i.id, band)) }
        }
        return out
    }

    public static func trustedBands(_ results: [BandResult]) -> Set<CefrBand> {
        var out = Set<CefrBand>()
        for (k, b) in results.enumerated() where b.passed && b.confidence >= skipConfidence {
            for s in bands.prefix(k + 1) { out.insert(s.band) }
        }
        return out
    }

    public static func skipFloor(_ results: [BandResult]) -> Double {
        var floor = 0.0
        var k = 0
        while k + 2 < bands.count {
            let above = [k + 1, k + 2].map { $0 < results.count ? results[$0] : nil }
            if above.allSatisfy({ ($0?.passed ?? false) && ($0?.confidence ?? 0) >= skipConfidence }) { floor = bands[k + 1].tierMin } else { break }
            k += 1
        }
        return floor
    }

    public static func placement(_ src: PlacementSource, _ answers: [CefrAnswer], _ step: CefrStep) -> CefrPlacement {
        let passed = step.bands.filter(\.passed)
        let mapping: CefrMapping = noCefrLangs.contains(src.lang) ? .none : .proxy
        guard passed.count >= placeMinBands else {
            return CefrPlacement(level: step.level, mapping: mapping, floorTier: 0, placeIds: [], bands: step.bands, unknownFrom: step.unknownFrom)
        }
        let trusted = trustedBands(step.bands)
        var ids = checkedCorpusIds(src, answers, Set(passed.map(\.band)))
        var have = Set(ids)
        for (id, band) in corpusTopBands(src) where trusted.contains(band) && !have.contains(id) {
            ids.append(id)
            have.insert(id)
        }
        return CefrPlacement(level: step.level, mapping: mapping, floorTier: skipFloor(step.bands), placeIds: ids, bands: step.bands, unknownFrom: step.unknownFrom)
    }

    public static func apply(_ state: EngineState, _ system: LangSystem, _ corpus: LangCorpus, _ lang: String, _ placement: CefrPlacement, now: Double, tz: TimeZone = .current) -> EngineState {
        applyPlacement(state, system, corpus, lang, placement.floorTier, now: now, tz: tz, only: Set(placement.placeIds))
    }

    public static func levelLabel(_ p: CefrPlacement) -> String {
        p.mapping == .none ? "band \(p.level)" : p.level
    }
}
