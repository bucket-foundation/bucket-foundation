import Foundation

public enum Skill: String, CaseIterable, Sendable {
    case count, introduce, order, sentence

    public static let phrases: [Skill] = allCases.filter { !$0.items.isEmpty }

    public var items: [String] {
        switch self {
        case .sentence: []
        case .count: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
        case .introduce: ["ph-hello", "ph-my-name-is", "ph-i-am-from", "ph-nice-to-meet-you"]
        case .order: ["ph-menu-please", "ph-water-please", "ph-i-would-like", "ph-the-check-please"]
        }
    }
}

public struct FirstSentence: Sendable, Hashable, Comparable {
    public var id: String
    public var introduced: String

    public init(id: String, introduced: String) {
        self.id = id
        self.introduced = introduced
    }

    public static func < (a: FirstSentence, b: FirstSentence) -> Bool {
        (a.introduced, a.id) < (b.introduced, b.id)
    }
}

public struct Feats: Sendable, Equatable {
    public var skills: [String: Set<Skill>]
    public var hello: Set<String>
    public var sentences: [String: FirstSentence]

    public init(skills: [String: Set<Skill>] = [:], hello: Set<String> = [], sentences: [String: FirstSentence] = [:]) {
        self.skills = skills
        self.hello = hello
        self.sentences = sentences
    }

    public mutating func merge(_ other: Feats) {
        skills.merge(other.skills) { $0.union($1) }
        hello.formUnion(other.hello)
        sentences.merge(other.sentences) { min($0, $1) }
    }
}

public struct Milestone: Hashable, Identifiable, Sendable {
    public enum Kind: Hashable, Sendable {
        case mastered(lang: String, count: Int)
        case streak(days: Int)
        case skill(Skill, lang: String)
        case hello(langs: [String])
    }

    public let kind: Kind

    public init(kind: Kind) {
        self.kind = kind
    }

    public var id: String {
        switch kind {
        case .mastered(let lang, let count): "mastered:\(lang):\(count)"
        case .streak(let days): "streak:\(days)"
        case .skill(let skill, let lang): "skill:\(skill.rawValue):\(lang)"
        case .hello(let langs): "hello:\(langs.count)"
        }
    }

    var size: Int {
        switch kind {
        case .mastered(_, let count): count
        case .streak(let days): days
        case .skill(let skill, _): skill.items.count
        case .hello(let langs): langs.count
        }
    }

    public var family: Int {
        switch kind {
        case .streak: 0
        case .mastered: 1
        case .hello: 2
        case .skill(.sentence, _): 4
        case .skill: 3
        }
    }
}

public enum Milestones {
    public static let words = [1, 5, 10, 25, 50, 100, 250, 500, 1000]
    public static let days = [3, 7, 14, 30, 50, 100, 200, 365]

    public static let hellos = [2, 3, 5, 10, 17]
    public static let helloItem = "ph-hello"

    public static func earned(mastered: [String: Int], streak: Int, feats: Feats = Feats()) -> [Milestone] {
        let long = days.filter { $0 <= streak }.map { Milestone(kind: .streak(days: $0)) }
        let known = mastered.keys.sorted().flatMap { lang in
            words.filter { $0 <= mastered[lang, default: 0] }.map { Milestone(kind: .mastered(lang: lang, count: $0)) }
        }
        let able = feats.skills.keys.sorted().flatMap { lang in
            Skill.allCases.filter { feats.skills[lang, default: []].contains($0) }.map { Milestone(kind: .skill($0, lang: lang)) }
        }
        let greeted = feats.hello.sorted()
        let hello = hellos.filter { $0 <= greeted.count }.map { Milestone(kind: .hello(langs: Array(greeted.prefix($0)))) }
        return long + known + able + hello
    }

    public static func feats(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState) -> Feats {
        let byId = Dictionary(corpus.items.map { ($0.id, $0) }) { a, _ in a }
        func knows(_ id: String, _ lang: String) -> Bool {
            guard let item = byId[id], usable(item, system.root, lang), let card = state.cards[cardId(lang, id)], isStarted(card) else { return false }
            return FSRS().mastery(card) >= LexiconMap.masteredAt
        }
        var out = Feats()
        for lang in system.targets {
            var skills = Set(Skill.phrases.filter { $0.items.allSatisfy { knows($0, lang) } })
            if let first = firstSentence(lang, root: system.root, corpus, state) {
                skills.insert(.sentence)
                out.sentences[lang] = first
            }
            if !skills.isEmpty { out.skills[lang] = skills }
            if knows(helloItem, lang) { out.hello.insert(lang) }
        }
        return out
    }

    public static func firstSentence(_ lang: String, root: String, _ corpus: LangCorpus, _ state: EngineState) -> FirstSentence? {
        let fsrs = FSRS()
        return state.cards.entries.compactMap { e -> FirstSentence? in
            let p = parseCardId(e.key)
            guard p.lang == lang, isSentenceCard(e.key), e.value.placed != true, isStarted(e.value),
                  fsrs.mastery(e.value) >= LexiconMap.masteredAt else { return nil }
            let id = String(p.itemId.dropFirst("sent:".count))
            guard let s = corpus.pool[id], s.text(lang) != nil, s.text(root) != nil else { return nil }
            return FirstSentence(id: id, introduced: e.value.introduced ?? "~")
        }.min()
    }

    public static func sentence(_ id: String, lang: String, root: String, _ corpus: LangCorpus) -> [MasteredWord] {
        guard let s = corpus.pool[id], let form = s.text(lang) else { return [] }
        return [MasteredWord(form: form, meaning: s.text(root) ?? "")]
    }

    public static func words(_ skill: Skill, lang: String, root: String, _ corpus: LangCorpus) -> [MasteredWord] {
        let byId = Dictionary(corpus.items.map { ($0.id, $0) }) { a, _ in a }
        return skill.items.compactMap { id in
            guard let item = byId[id], let form = item.form(lang) else { return nil }
            return MasteredWord(form: form, meaning: item.form(root) ?? item.gloss)
        }
    }

    public static func hello(langs: [String], _ corpus: LangCorpus) -> [ShareForm] {
        guard let item = corpus.items.first(where: { $0.id == helloItem }) else { return [] }
        return langs.compactMap { lang in item.form(lang).map { ShareForm(lang: lang, form: $0) } }
    }

    public static func next(_ earned: [Milestone], seen: Set<String>) -> Milestone? {
        earned.filter { !seen.contains($0.id) }.max { ($0.family, $0.size, $1.id) < ($1.family, $1.size, $0.id) }
    }

    public static func settled(_ shown: Milestone, _ earned: [Milestone]) -> [String] {
        earned.filter { $0.family == shown.family }.map(\.id)
    }
}
