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
    public var asked = 0
    public var sounds = 0

    public init() {}

    public mutating func record(_ kind: ExerciseKind) {
        if kind == .intro || kind == .match { return }
        asked += 1
        if SessionMix.soundKinds.contains(kind) { sounds += 1 }
    }
}

public enum SessionMix {
    public static let masteryBar = 0.8
    public static let soundKinds: Set<ExerciseKind> = [.listen, .typeHeard, .speak, .spellHeard, .letterSound, .minimalPair]
    public static let compareKinds: Set<ExerciseKind> = [.match, .falseFriend, .cognate]

    public static func mastery(_ state: EngineState, _ lang: String, _ itemId: String) -> Double {
        FSRS().mastery(state.cards[cardId(lang, itemId)])
    }

    public static func mastered(_ state: EngineState, _ lang: String, _ itemId: String) -> Bool {
        mastery(state, lang, itemId) >= masteryBar
    }

    public static func startedCount(_ state: EngineState, _ system: LangSystem) -> Int {
        state.cards.entries.filter { system.targets.contains(parseCardId($0.key).lang) && isStarted($0.value) }.count
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

    static let kindRank: [ItemKind: Int] = [.word: 0, .phrase: 1, .gender: 2, .conj: 2]

    public static func frequencyOrder(_ items: [LangItem]) -> [LangItem] {
        items.stableSorted { x, y in
            if x.tier != y.tier { return x.tier < y.tier }
            return kindRank[x.kind]! < kindRank[y.kind]!
        }
    }

    public static func curriculum(_ corpus: LangCorpus, _ system: LangSystem, _ lang: String) -> [LangItem] {
        frequencyOrder(corpus.items.filter { isVocab($0) && usable($0, system.root, lang) })
    }

    public static func frequencyFirst(_ corpus: LangCorpus) -> LangCorpus {
        LangCorpus(items: frequencyOrder(corpus.items), byId: corpus.byId, attribution: corpus.attribution, sources: corpus.sources, pool: corpus.pool,
                   poolKeys: corpus.poolKeys, persons: corpus.persons, falseFriends: corpus.falseFriends, units: corpus.units)
    }

    public static func compareReady(_ item: LangItem, _ system: LangSystem, _ state: EngineState, langs: [String]) -> Bool {
        !langs.isEmpty && langs.allSatisfy { mastered(state, $0, item.id) }
    }

    public static func gateComparisons(_ queue: [QueueEntry], _ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState) -> [QueueEntry] {
        queue.filter { e in
            guard e.stage == .match else { return true }
            guard let item = corpus.byId[e.itemId] else { return false }
            return compareReady(item, system, state, langs: system.targets.filter { item.form($0) != nil })
        }
    }

    public static func alternate(_ queue: [QueueEntry]) -> [QueueEntry] {
        var order: [String] = []
        var byLang: [String: [QueueEntry]] = [:]
        for e in queue {
            if byLang[e.lang] == nil { order.append(e.lang); byLang[e.lang] = [] }
            byLang[e.lang]!.append(e)
        }
        var out: [QueueEntry] = []
        var last = ""
        while out.count < queue.count {
            let live = order.filter { !byLang[$0]!.isEmpty }.stableSorted { byLang[$0]!.count > byLang[$1]!.count }
            let pick = live.first { $0 != last } ?? live[0]
            out.append(byLang[pick]!.removeFirst())
            last = pick
        }
        return out
    }

    public static func queue(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, size: Int = 14, tz: TimeZone = .current, heritage: Bool = false) -> [QueueEntry] {
        let built = buildQueue(system, frequencyFirst(corpus), state, now: now, size: size, tz: tz, heritage: heritage)
        return alternate(gateComparisons(built, system, corpus, state))
    }

    public static func exerciseMix(_ system: LangSystem, _ item: LangItem, _ lang: String, _ state: EngineState, tally: SoundTally) -> ExerciseMix {
        let family = sharedRootLangs(item, system).filter { $0 != lang }
        let ffReady = mastered(state, lang, item.id)
        let compare = item.falseFriends[lang] != nil ? ffReady : compareReady(item, system, state, langs: family)
        return ExerciseMix(sound: soundAllowed(tally, started: startedCount(state, system)), compare: compare, sentenceFirst: stage(item, state, lang) == .sentence)
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
