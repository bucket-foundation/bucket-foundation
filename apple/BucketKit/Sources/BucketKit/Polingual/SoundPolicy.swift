import Foundation

public enum SoundKind: Sendable, Equatable { case tap, auto, effect }

public enum SoundPolicy {
    public static let silentKey = "polingual.silent"
    public static let tapBudget: TimeInterval = 0.3

    public static func allows(_ kind: SoundKind, silent: Bool) -> Bool {
        kind == .tap || !silent
    }

    public static func honorsMuteSwitch(_ kind: SoundKind) -> Bool { kind != .tap }

    public enum Start: Sendable, Equatable { case speak, renewThenSpeak }

    public static func start(busy: Bool) -> Start { busy ? .renewThenSpeak : .speak }

    public static func retryAfter(_ kind: SoundKind) -> TimeInterval { kind == .tap ? tapBudget : 1 }
}

public struct VoiceCache<Voice: Sendable>: Sendable {
    private var list: [Voice] = []
    private var picked: [String: Voice] = [:]

    public init() {}

    public var loaded: Bool { !list.isEmpty }

    public mutating func fill(_ voices: [Voice]) {
        guard !voices.isEmpty else { return }
        list = voices
        picked = [:]
    }

    public mutating func forget() {
        list = []
        picked = [:]
    }

    public mutating func pick(_ lang: String, load: () -> [Voice], choose: ([Voice], String) -> Voice?) -> Voice? {
        if let hit = picked[lang] { return hit }
        if list.isEmpty { fill(load()) }
        guard !list.isEmpty, let v = choose(list, lang) else { return nil }
        picked[lang] = v
        return v
    }
}

public struct TapLatency: Sendable {
    private(set) public var samples: [TimeInterval] = []

    public init() {}

    public mutating func record(_ seconds: TimeInterval) { samples.append(seconds) }

    public var median: TimeInterval? {
        guard !samples.isEmpty else { return nil }
        let s = samples.sorted()
        return s[s.count / 2]
    }

    public var worst: TimeInterval? { samples.max() }

    public var withinBudget: Bool { (worst ?? 0) <= SoundPolicy.tapBudget }
}

public enum SilentDeck {
    public static let soundKinds: Set<ExerciseKind> = [.listen, .typeHeard, .spellHeard, .speak, .letterSound, .minimalPair, .blend]

    public static func needsSound(_ kind: ExerciseKind, spoken: Bool = false) -> Bool {
        soundKinds.contains(kind) || spoken
    }

    public static func shows(_ kind: ExerciseKind, spoken: Bool = false, silent: Bool) -> Bool {
        !silent || !needsSound(kind, spoken: spoken)
    }

    public struct Pass: Sendable, Equatable {
        public var shown: [Int] = []
        public var deferred: [Int] = []
    }

    public static func pass(_ kinds: [ExerciseKind], silent: Bool) -> Pass {
        var p = Pass()
        for (i, k) in kinds.enumerated() {
            if shows(k, silent: silent) { p.shown.append(i) } else { p.deferred.append(i) }
        }
        return p
    }

    public static func onlySound(graded: Int, deferred: Int) -> Bool { graded == 0 && deferred > 0 }

    public static func chorusAllowed(_ kind: ExerciseKind) -> Bool { kind == .intro }
}
