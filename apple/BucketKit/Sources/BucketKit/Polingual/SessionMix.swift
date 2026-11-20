import Foundation

public struct ExerciseMix: Sendable, Equatable {
    public var sound: Bool
    public var compare: Bool
    public var sentenceFirst: Bool

    public init(sound: Bool = true, compare: Bool = true, sentenceFirst: Bool = false) {
        self.sound = sound
        self.compare = compare
        self.sentenceFirst = sentenceFirst
    }

    public static let open = ExerciseMix()
}

public enum CurriculumStage: String, Sendable { case word, phrase, sentence }

public struct SoundTally: Sendable, Equatable {
    public private(set) var asked = 0
    public private(set) var sounds = 0
    private var counted: Set<String> = []

    public init() {}

    public mutating func record(_ kind: ExerciseKind, key: String) {
        if kind == .intro || kind == .match || counted.contains(key) { return }
        counted.insert(key)
        asked += 1
        if SessionMix.soundKinds.contains(kind) { sounds += 1 }
    }
}

public struct StudyRound: Sendable, Equatable {
    public private(set) var queue: [QueueEntry]
    public private(set) var tally = SoundTally()

    public init(_ queue: [QueueEntry]) { self.queue = queue }

    public mutating func restart(_ queue: [QueueEntry]) {
        self.queue = queue
        tally = SoundTally()
    }

    public mutating func record(_ kind: ExerciseKind, key: String) { tally.record(kind, key: key) }
}

public struct ItemMastery: Sendable, Equatable {
    public let id: String
    public let stage: CurriculumStage
    public let mastery: Double
}

public struct FrequencyRank: Sendable {
    public let ranks: [String: [String: Int]]

    public init(_ top: [String: [TopWord]]) {
        var r: [String: [String: Int]] = [:]
        for (lang, words) in top {
            var m: [String: Int] = [:]
            for w in words where m[w.word.lowercased()] == nil { m[w.word.lowercased()] = w.rank }
            r[lang] = m
        }
        ranks = r
    }

    public static let unranked = 5000

    func fallback(_ item: LangItem) -> Int { 2000 + Int(item.tier * 100) }

    public func rank(_ item: LangItem, _ lang: String) -> Int {
        guard let form = item.form(lang)?.lowercased(), let table = ranks[lang] else { return fallback(item) }
        if let r = table[form] { return r }
        let words = form.split { !$0.isLetter && $0 != "'" }.map(String.init)
        let hits = words.compactMap { table[$0] }
        guard item.kind == .phrase, let worst = hits.max() else { return fallback(item) }
        return hits.count == words.count ? worst : max(worst, fallback(item))
    }

    public func rank(_ item: LangItem, langs: [String]) -> Int {
        let rs = langs.filter { item.form($0) != nil }.map { rank(item, $0) }
        return rs.isEmpty ? fallback(item) : rs.reduce(0, +) / rs.count
    }
}

public enum SessionMix {
    public static let masteryBar = 0.8
    public static let falseFriendBar = 0.5
    public static let soundKinds: Set<ExerciseKind> = [.listen, .typeHeard, .speak, .spellHeard, .letterSound, .minimalPair]
    public static let compareKinds: Set<ExerciseKind> = [.match, .falseFriend, .cognate]

    public static func mastery(_ state: EngineState, _ lang: String, _ itemId: String) -> Double {
        FSRS().mastery(state.cards[cardId(lang, itemId)])
    }

    public static func mastered(_ state: EngineState, _ lang: String, _ itemId: String, bar: Double = masteryBar) -> Bool {
        mastery(state, lang, itemId) >= bar
    }

    public static func sentenceItemId(_ sentenceId: String) -> String { "sent:\(sentenceId)" }

    public static func startedCount(_ state: EngineState, _ system: LangSystem) -> Int {
        state.cards.entries.filter { system.targets.contains(parseCardId($0.key).lang) && !isSentenceCard($0.key) && isStarted($0.value) }.count
    }

    public static func soundShare(started: Int) -> Double {
        started < 40 ? 0.1 : started < 150 ? 0.25 : 0.4
    }

    public static func soundAllowed(_ tally: SoundTally, started: Int) -> Bool {
        Double(tally.sounds + 1) <= soundShare(started: started) * Double(tally.asked + 1)
    }

    public static func stage(_ item: LangItem, _ state: EngineState, _ lang: String) -> CurriculumStage {
        if item.kind == .word && mastered(state, lang, item.id) { return .sentence }
        return item.kind == .phrase ? .phrase : .word
    }

    public static func masteryTable(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, _ lang: String) -> [ItemMastery] {
        let items = corpus.items.filter { isVocab($0) && usable($0, system.root, lang) && state.cards.started(cardId(lang, $0.id)) }
            .map { ItemMastery(id: $0.id, stage: $0.kind == .phrase ? .phrase : .word, mastery: mastery(state, lang, $0.id)) }
        let sentences = state.cards.entries.compactMap { e -> ItemMastery? in
            let p = parseCardId(e.key)
            guard p.lang == lang, p.itemId.hasPrefix("sent:"), isStarted(e.value) else { return nil }
            return ItemMastery(id: p.itemId, stage: .sentence, mastery: FSRS().mastery(e.value))
        }
        return items + sentences
    }

    static let kindRank: [ItemKind: Int] = [.word: 0, .phrase: 1, .gender: 2, .conj: 2]

    public static func frequencyOrder(_ items: [LangItem], _ freq: FrequencyRank, langs: [String]) -> [LangItem] {
        let keyed = items.map { (item: $0, rank: freq.rank($0, langs: langs)) }
        return keyed.stableSorted { x, y in
            if x.rank != y.rank { return x.rank < y.rank }
            return kindRank[x.item.kind, default: 2] < kindRank[y.item.kind, default: 2]
        }.map(\.item)
    }

    public static func curriculum(_ corpus: LangCorpus, _ system: LangSystem, _ lang: String, _ freq: FrequencyRank) -> [LangItem] {
        frequencyOrder(corpus.items.filter { isVocab($0) && usable($0, system.root, lang) }, freq, langs: [lang])
    }

    public static func frequencyFirst(_ corpus: LangCorpus, _ freq: FrequencyRank, langs: [String]) -> LangCorpus {
        LangCorpus(items: frequencyOrder(corpus.items, freq, langs: langs), byId: corpus.byId, attribution: corpus.attribution, sources: corpus.sources, pool: corpus.pool,
                   poolKeys: corpus.poolKeys, persons: corpus.persons, falseFriends: corpus.falseFriends, units: corpus.units)
    }

    public static func compareReady(_ item: LangItem, _ state: EngineState, langs: [String], bar: Double = masteryBar) -> Bool {
        !langs.isEmpty && langs.allSatisfy { mastered(state, $0, item.id, bar: bar) }
    }

    public static func gateComparisons(_ queue: [QueueEntry], _ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState) -> [QueueEntry] {
        queue.filter { e in
            guard e.stage == .match else { return true }
            guard let item = corpus.byId[e.itemId] else { return false }
            return compareReady(item, state, langs: system.targets.filter { item.form($0) != nil })
        }
    }

    public static func alternate(_ queue: [QueueEntry], gap: Int = Lang.checkGap) -> [QueueEntry] {
        var order: [String] = []
        var byLang: [String: [QueueEntry]] = [:]
        for e in queue {
            if byLang[e.lang] == nil { order.append(e.lang); byLang[e.lang] = [] }
            byLang[e.lang]!.append(e)
        }
        var out: [QueueEntry] = []
        var introAt: [String: Int] = [:]
        var last = ""
        func ready(_ e: QueueEntry) -> Bool {
            guard e.stage == .check, let at = introAt[cardId(e.lang, e.itemId)] else { return true }
            return out.count - at - 1 >= gap
        }
        while out.count < queue.count {
            let live = order.filter { !byLang[$0]!.isEmpty }.stableSorted { byLang[$0]!.count > byLang[$1]!.count }
            let pick = live.first { $0 != last && ready(byLang[$0]![0]) } ?? live.first { ready(byLang[$0]![0]) } ?? live.first { $0 != last } ?? live[0]
            let e = byLang[pick]!.removeFirst()
            if e.stage == .intro { introAt[cardId(e.lang, e.itemId)] = out.count }
            out.append(e)
            last = pick
        }
        return out
    }

    public static func queue(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, freq: FrequencyRank, size: Int = 14, tz: TimeZone = .current, heritage: Bool = false) -> [QueueEntry] {
        let built = buildQueue(system, frequencyFirst(corpus, freq, langs: system.targets), state, now: now, size: size, tz: tz, heritage: heritage, newFloor: Lang.newPerSessionFloor)
        return gateComparisons(built, system, corpus, state)
    }

    public static func session(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, freq: FrequencyRank, lead: [QueueEntry] = [], replay: [QueueEntry] = [], writing: [QueueEntry] = [], tz: TimeZone = .current, heritage: Bool = false) -> [QueueEntry] {
        let main = queue(system, corpus, state, now: now, freq: freq, tz: tz, heritage: heritage).filter { !replay.contains($0) && !lead.contains($0) }
        let planned = lead + replay + writing + main
        let extra = core(system, corpus, state, now: now, freq: freq, taken: Set(planned.map { cardId($0.lang, $0.itemId) }), limit: max(coreFloor, roundSize - planned.count), tz: tz)
        let ordered = alternate(spacedChecks(lead + replay + main + extra))
        let held = Set(lead.filter { $0.stage != .check } + replay)
        let opening = ordered.lastIndex { held.contains($0) }.map { $0 + 1 } ?? 0
        return wordFirst(Array(ordered.prefix(opening)) + disperse(writing, into: Array(ordered.dropFirst(opening))))
    }

    public static func wordFirst(_ queue: [QueueEntry]) -> [QueueEntry] {
        guard queue.first?.stage == .letter, let at = queue.firstIndex(where: { $0.stage != .letter && $0.stage != .check }) else { return queue }
        var out = queue
        out.insert(out.remove(at: at), at: 0)
        return out
    }

    public static func disperse(_ extras: [QueueEntry], into body: [QueueEntry]) -> [QueueEntry] {
        guard !extras.isEmpty, !body.isEmpty else { return body + extras }
        var out: [QueueEntry] = []
        var next = 0
        for (placed, e) in body.enumerated() {
            out.append(e)
            while next < extras.count, max(1, (next + 1) * body.count / (extras.count + 1)) <= placed + 1 {
                out.append(extras[next])
                next += 1
            }
        }
        return out + extras[next...]
    }

    public static let coreFloor = 4
    public static let roundSize = 14

    public static func core(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, freq: FrequencyRank, taken: Set<String> = [], limit: Int = coreFloor, tz: TimeZone = .current) -> [QueueEntry] {
        let today = dayKey(now, tz: tz)
        let found = state.cards.entries.compactMap { e -> (entry: QueueEntry, rank: Int)? in
            let p = parseCardId(e.key)
            guard system.targets.contains(p.lang), !taken.contains(e.key), isStarted(e.value), let item = corpus.byId[p.itemId], isVocab(item), usable(item, system.root, p.lang) else { return nil }
            guard FSRS().mastery(e.value) < masteryBar, let due = e.value.due, due > now else { return nil }
            if let last = e.value.lastReview, dayKey(last, tz: tz) == today { return nil }
            return (QueueEntry(itemId: p.itemId, lang: p.lang, stage: .review), freq.rank(item, p.lang))
        }
        return found.stableSorted { $0.rank < $1.rank }.prefix(max(0, limit)).map(\.entry)
    }

    public static func exerciseMix(_ system: LangSystem, _ item: LangItem, _ lang: String, _ state: EngineState, tally: SoundTally) -> ExerciseMix {
        let family = sharedRootLangs(item, system).filter { $0 != lang }
        let compare = item.falseFriends[lang] != nil ? mastered(state, lang, item.id, bar: falseFriendBar) : compareReady(item, state, langs: family)
        return ExerciseMix(sound: soundAllowed(tally, started: startedCount(state, system)), compare: compare, sentenceFirst: stage(item, state, lang) == .sentence)
    }

    public static func letterExercise(_ entry: QueueEntry, _ system: LangSystem, _ state: EngineState, tally: SoundTally, _ rng: inout Rng) -> Exercise? {
        let made = ScriptCourse.exercise(entry.lang, system.root, entry.itemId, &rng, state: state)
        guard let made, soundKinds.contains(made.kind), !soundAllowed(tally, started: startedCount(state, system)) else { return made }
        return ScriptCourse.drill(.letter, entry.lang, system.root, entry.itemId, &rng, state: state)
    }

    public static func exercise(_ entry: QueueEntry, _ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, tally: SoundTally, _ rng: inout Rng, speech: Bool = false, heritage: Bool = false) -> Exercise? {
        if entry.stage == .letter { return letterExercise(entry, system, state, tally: tally, &rng) }
        guard let item = corpus.byId[entry.itemId] else { return nil }
        if entry.stage == .match { return matchExercise(corpus, system, item, &rng) }
        return exerciseFor(corpus, system, item, entry.lang, state.cards[cardId(entry.lang, entry.itemId)], &rng, speech: speech, afterIntro: entry.stage == .check,
                           level: learnerLevel(state, entry.lang), heritage: heritage, mix: exerciseMix(system, item, entry.lang, state, tally: tally))
    }

    public static func longestRun(_ queue: [QueueEntry]) -> Int {
        var best = 0
        var run = 0
        var last = ""
        for e in queue {
            run = e.lang == last ? run + 1 : 1
            last = e.lang
            best = max(best, run)
        }
        return best
    }
}
