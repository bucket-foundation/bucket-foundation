import Foundation

public enum Skill: String, CaseIterable, Sendable {
    case count, introduce, order

    public var items: [String] {
        switch self {
        case .count: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
        case .introduce: ["ph-hello", "ph-my-name-is", "ph-i-am-from", "ph-nice-to-meet-you"]
        case .order: ["ph-menu-please", "ph-water-please", "ph-i-would-like", "ph-the-check-please"]
        }
    }
}

public struct Feats: Sendable, Equatable {
    public var skills: [String: Set<Skill>]
    public var hello: Set<String>

    public init(skills: [String: Set<Skill>] = [:], hello: Set<String> = []) {
        self.skills = skills
        self.hello = hello
    }

    public mutating func merge(_ other: Feats) {
        skills.merge(other.skills) { $0.union($1) }
        hello.formUnion(other.hello)
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
            guard let item = byId[id], usable(item, system.root, lang) else { return false }
            return SessionMix.mastered(state, lang, id, bar: LexiconMap.masteredAt)
        }
        var out = Feats()
        for lang in system.targets {
            let skills = Set(Skill.allCases.filter { $0.items.allSatisfy { knows($0, lang) } })
            if !skills.isEmpty { out.skills[lang] = skills }
            if knows(helloItem, lang) { out.hello.insert(lang) }
        }
        return out
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
        earned.filter { !seen.contains($0.id) }.max { $0.size < $1.size }
    }
}
