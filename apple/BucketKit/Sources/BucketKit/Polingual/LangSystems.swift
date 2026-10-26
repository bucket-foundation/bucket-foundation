import Foundation

public struct LangInfo: Sendable {
    public let name: String
    public let bcp47: String
    public let latin: Bool
    public let rtl: Bool
}

public enum Lang {
    public static let codes = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "pl", "fi", "ru", "el", "ar", "hi", "ja", "zh", "ko", "he", "fa", "tr", "cs", "id", "vi", "th", "ta", "la", "grc", "sa", "ang"]

    public static let info: [String: LangInfo] = [
        "en": LangInfo(name: "English", bcp47: "en-US", latin: true, rtl: false),
        "es": LangInfo(name: "Spanish", bcp47: "es-ES", latin: true, rtl: false),
        "fr": LangInfo(name: "French", bcp47: "fr-FR", latin: true, rtl: false),
        "it": LangInfo(name: "Italian", bcp47: "it-IT", latin: true, rtl: false),
        "pt": LangInfo(name: "Portuguese", bcp47: "pt-PT", latin: true, rtl: false),
        "de": LangInfo(name: "German", bcp47: "de-DE", latin: true, rtl: false),
        "nl": LangInfo(name: "Dutch", bcp47: "nl-NL", latin: true, rtl: false),
        "sv": LangInfo(name: "Swedish", bcp47: "sv-SE", latin: true, rtl: false),
        "pl": LangInfo(name: "Polish", bcp47: "pl-PL", latin: true, rtl: false),
        "fi": LangInfo(name: "Finnish", bcp47: "fi-FI", latin: true, rtl: false),
        "ru": LangInfo(name: "Russian", bcp47: "ru-RU", latin: false, rtl: false),
        "el": LangInfo(name: "Greek", bcp47: "el-GR", latin: false, rtl: false),
        "ar": LangInfo(name: "Arabic", bcp47: "ar-SA", latin: false, rtl: true),
        "hi": LangInfo(name: "Hindi", bcp47: "hi-IN", latin: false, rtl: false),
        "ja": LangInfo(name: "Japanese", bcp47: "ja-JP", latin: false, rtl: false),
        "zh": LangInfo(name: "Mandarin", bcp47: "zh-CN", latin: false, rtl: false),
        "ko": LangInfo(name: "Korean", bcp47: "ko-KR", latin: false, rtl: false),
        "he": LangInfo(name: "Hebrew", bcp47: "he-IL", latin: false, rtl: true),
        "fa": LangInfo(name: "Persian", bcp47: "fa-IR", latin: false, rtl: true),
        "tr": LangInfo(name: "Turkish", bcp47: "tr-TR", latin: true, rtl: false),
        "cs": LangInfo(name: "Czech", bcp47: "cs-CZ", latin: true, rtl: false),
        "id": LangInfo(name: "Indonesian", bcp47: "id-ID", latin: true, rtl: false),
        "vi": LangInfo(name: "Vietnamese", bcp47: "vi-VN", latin: true, rtl: false),
        "th": LangInfo(name: "Thai", bcp47: "th-TH", latin: false, rtl: false),
        "ta": LangInfo(name: "Tamil", bcp47: "ta-IN", latin: false, rtl: false),
        "la": LangInfo(name: "Latin", bcp47: "la", latin: true, rtl: false),
        "grc": LangInfo(name: "Ancient Greek", bcp47: "grc", latin: false, rtl: false),
        "sa": LangInfo(name: "Sanskrit", bcp47: "sa-IN", latin: false, rtl: false),
        "ang": LangInfo(name: "Old English", bcp47: "ang", latin: true, rtl: false),
    ]

    public static func name(_ code: String) -> String { info[code]?.name ?? code }
    public static func isRTL(_ code: String) -> Bool { info[code]?.rtl ?? false }

    public static let maxTargets = 6
    public static let newPerLangPerDay = 5
    public static let placementTiers: [Double] = [0, 2, 4, 6, 8, 10]
    public static let placementItemsPerTier = 3
    public static let placementPassPerTier = 2
    public static let placementMaxItems = 18
    public static let placementProduceAt = 1
    public static let unitUnlockShare = 0.8
    public static let checkGap = 3
    public static let maxTries = 2
    public static let levelLabel: [Int: String] = [1: "A1", 2: "A2", 3: "B1"]

    public static let presets: [(name: String, targets: [String])] = [
        ("Romance", ["fr", "es", "it"]),
        ("East Asian", ["zh", "ja"]),
        ("Germanic", ["de", "nl", "sv"]),
        ("Iberian", ["es", "pt"]),
    ]

    public enum Grammar: String, Sendable { case gender, conj, past }

    struct UnitDef {
        let id: String
        let title: String
        let categories: [String]
        let grammar: [Grammar]
        var verbTierMax: Double?
        var verbTierMin: Double?
    }

    static let units: [UnitDef] = [
        UnitDef(id: "numbers", title: "Numbers", categories: ["number"], grammar: []),
        UnitDef(id: "greetings", title: "Greetings", categories: ["ph:greeting", "ph:courtesy"], grammar: []),
        UnitDef(id: "people", title: "People and family", categories: ["family", "ph:intro"], grammar: [.gender]),
        UnitDef(id: "colors", title: "Colors", categories: ["color"], grammar: []),
        UnitDef(id: "food", title: "Food and drink", categories: ["food", "ph:dining"], grammar: [.gender]),
        UnitDef(id: "verbs-1", title: "Core verbs 1", categories: ["verb"], grammar: [.conj], verbTierMax: 6),
        UnitDef(id: "animals", title: "Animals", categories: ["animal"], grammar: [.gender]),
        UnitDef(id: "body", title: "The body", categories: ["body"], grammar: [.gender]),
        UnitDef(id: "describe", title: "Describing things", categories: ["adjective", "ph:basics"], grammar: []),
        UnitDef(id: "home", title: "Home and objects", categories: ["object", "ph:shopping"], grammar: [.gender]),
        UnitDef(id: "time", title: "Time", categories: ["time", "ph:time"], grammar: [.gender]),
        UnitDef(id: "nature", title: "Nature", categories: ["nature"], grammar: [.gender]),
        UnitDef(id: "verbs-2", title: "Core verbs 2", categories: ["verb"], grammar: [.conj, .past], verbTierMin: 7),
        UnitDef(id: "travel", title: "Getting around", categories: ["ph:survival", "ph:direction", "ph:smalltalk"], grammar: []),
    ]

    public static let articles: [String: [(String, String)]] = [
        "es": [("m", "el"), ("f", "la")],
        "fr": [("m", "le"), ("f", "la")],
        "it": [("m", "il"), ("f", "la")],
        "pt": [("m", "o"), ("f", "a")],
        "de": [("m", "der"), ("f", "die"), ("n", "das")],
        "nl": [("de", "de"), ("het", "het")],
    ]

    static func article(_ lang: String, _ gender: String) -> String? { articles[lang]?.first { $0.0 == gender }?.1 }

    static let frenchAspiratedH = ["haricot", "héros", "hibou", "homard", "honte", "huit", "hache", "haine", "hall", "hasard", "haut", "hockey", "hamac", "hamburger", "handicap", "hangar", "hanche", "hareng", "harpe", "hérisson", "hêtre", "hutte", "hublot", "huppe", "hameau", "halle"]

    public static func contextualArticle(_ lang: String, _ gender: String, _ noun: String) -> String? {
        let w = noun.lowercased()
        guard let first = w.first else { return nil }
        switch lang {
        case "it":
            if "aeiouàèéìòù".contains(first) { return "l'" }
            guard gender == "m" else { return nil }
            let rest = w.dropFirst()
            let sCluster = first == "s" && rest.first.map { !"aeiouàèéìòù".contains($0) } == true
            if sCluster || "zxy".contains(first) || ["gn", "ps", "pn"].contains(where: { w.hasPrefix($0) }) { return "lo" }
            return nil
        case "fr":
            guard "aeiouhàâéèêîôûœ".contains(first) else { return nil }
            return frenchAspiratedH.contains(where: { w.hasPrefix($0) }) ? nil : "l'"
        case "es":
            let stressedA = ["agua", "águila", "alma", "arma", "hambre", "hacha", "aula", "área", "ala", "ave", "ancla", "hada", "haba", "habla", "alba", "asma", "aya"]
            return gender == "f" && stressedA.contains(w) ? "el" : nil
        default:
            return nil
        }
    }

    public static func articleWord(_ lang: String, _ gender: String, _ noun: String) -> String? {
        guard let base = article(lang, gender) else { return nil }
        return contextualArticle(lang, gender, noun) ?? base
    }

    static let phraseTier: [String: Double] = ["greeting": 1, "courtesy": 1, "intro": 3, "basics": 4, "smalltalk": 5, "survival": 6, "dining": 7, "shopping": 7, "direction": 8, "time": 8]
}

public struct Reading: Sendable, Equatable, Hashable {
    public var roman: String?
    public var kana: String?
    public var ipa: String?

    public init(roman: String? = nil, kana: String? = nil, ipa: String? = nil) {
        self.roman = roman
        self.kana = kana
        self.ipa = ipa
    }

    init(js: JSValue) {
        roman = js["roman"]?.string
        kana = js["kana"]?.string
        ipa = js["ipa"]?.string
    }
}

public enum ItemKind: String, Sendable { case word, phrase, gender, conj }

public struct FalseFriend: Sendable, Equatable, Hashable {
    public let lang: String
    public let word: String
    public let means: String
    public let looksLike: String
    public let itemId: String?
    public let crossWith: Cross?

    public struct Cross: Sendable, Equatable, Hashable {
        public let lang: String
        public let word: String
        public let means: String
    }

    init?(js: JSValue) {
        guard let lang = js["lang"]?.string, let word = js["word"]?.string else { return nil }
        self.lang = lang
        self.word = word
        means = js["means"]?.string ?? ""
        looksLike = js["looksLike"]?.string ?? ""
        itemId = js["itemId"]?.string
        if let c = js["crossWith"], let l = c["lang"]?.string, let w = c["word"]?.string {
            crossWith = Cross(lang: l, word: w, means: c["means"]?.string ?? "")
        } else {
            crossWith = nil
        }
    }
}

public struct LangItem: Sendable, Identifiable {
    public var id: String
    public var kind: ItemKind
    public var baseId: String
    public var tier: Double
    public var unit: Int
    public var category: String
    public var gloss: String
    public var forms: [String: String]
    public var readings: [String: Reading]
    public var root: String?
    public var cognateLangs: [String]
    public var note: String?
    public var example: [String: String]
    public var sentences: [String: [String]]
    public var gender: OrderedMap<String>
    public var conj: [String: [String]]
    public var conjPast: [String: [String]]
    public var falseFriends: [String: FalseFriend]

    public func form(_ l: String) -> String? {
        guard let f = forms[l], !f.isEmpty else { return nil }
        return f
    }
}

public struct PoolSentence: Sendable {
    public let t: [String: String]
    public let r: [String: String]
    public let jaTokens: [String]?
    public let lv: [String: Double]?

    public func text(_ l: String) -> String? {
        guard let s = t[l], !s.isEmpty else { return nil }
        return s
    }
}

public struct LangUnit: Sendable, Identifiable {
    public let index: Int
    public let id: String
    public let title: String
    public let grammar: [Lang.Grammar]
}

public struct LangCorpus: Sendable {
    public let items: [LangItem]
    public let byId: [String: LangItem]
    public let attribution: String
    public let sources: [String]
    public let pool: [String: PoolSentence]
    public let poolKeys: [String]
    public let persons: [String: [String]]
    public let falseFriends: [FalseFriend]
    public let units: [LangUnit]
}

public struct LangSystem: Sendable, Identifiable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var root: String
    public var targets: [String]
    public var createdAt: Double
    public var updatedAt: Double?
    public var placement: [String: Double]

    public init(id: String, name: String, root: String, targets: [String], createdAt: Double, updatedAt: Double? = nil, placement: [String: Double] = [:]) {
        self.id = id
        self.name = name
        self.root = root
        self.targets = targets
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.placement = placement
    }

    public init?(js: JSValue) {
        guard let id = js["id"]?.string else { return nil }
        self.id = id
        name = js["name"]?.string ?? id
        root = js["root"]?.string ?? "en"
        targets = js["targets"]?.stringArray ?? []
        createdAt = js["createdAt"]?.number ?? 0
        updatedAt = js["updatedAt"]?.number
        var p: [String: Double] = [:]
        for (k, v) in js["placement"]?.object?.entries ?? [] { if let n = v.number { p[k] = n } }
        placement = p
    }

    public var js: JSValue {
        var o = JSObject([("id", .string(id)), ("name", .string(name)), ("root", .string(root)), ("targets", .array(targets.map(JSValue.string))), ("createdAt", .number(createdAt))])
        if let updatedAt { o["updatedAt"] = .number(updatedAt) }
        o["placement"] = .object(JSObject(placement.keys.sorted().map { ($0, .number(placement[$0]!)) }))
        return .object(o)
    }
}

extension Array {
    func stableSorted(_ less: (Element, Element) -> Bool) -> [Element] {
        enumerated().sorted { a, b in less(a.element, b.element) || (!less(b.element, a.element) && a.offset < b.offset) }.map(\.element)
    }
}

func strCmp(_ a: String, _ b: String) -> Bool { Array(a.utf16).lexicographicallyPrecedes(Array(b.utf16)) }

func unitFor(_ category: String, _ kind: ItemKind, _ tier: Double) -> Int {
    let key = kind == .phrase ? "ph:\(category)" : category
    let i = Lang.units.firstIndex { u in u.categories.contains(key) && (u.verbTierMax == nil || tier <= u.verbTierMax!) && (u.verbTierMin == nil || tier >= u.verbTierMin!) }
    return i ?? Lang.units.count - 1
}

func articleFor(_ lang: String, _ gender: String, _ noun: String) -> String? {
    guard let a = Lang.article(lang, gender) else { return nil }
    if lang == "fr" || lang == "it", let first = noun.unicodeScalars.first, "aeiouhàâéèêîôûœAEIOUH".unicodeScalars.contains(first) { return "l'\(noun)" }
    return "\(a) \(noun)"
}

func strings(_ v: JSValue?) -> [String: String] {
    var out: [String: String] = [:]
    for (k, x) in v?.object?.entries ?? [] { if let s = x.string { out[k] = s } }
    return out
}

public func buildLangCorpus(core: JSValue?, cognates: JSValue?, phrases: JSValue?, layers: JSValue?) -> LangCorpus {
    let concepts = cognates?["concepts"]?.object ?? JSObject()
    let fix = layers?["forms"]?.object ?? JSObject()
    let ffs = (layers?["falseFriends"]?.array ?? []).compactMap(FalseFriend.init(js:))
    var items: [LangItem] = []

    for a in core?["atoms"]?.array ?? [] {
        guard let aid = a["id"]?.string else { continue }
        let c = concepts[aid]
        var forms: [String: String] = [:]
        for (l, f) in a["forms"]?.object?.entries ?? [] { if let w = f["word"]?.nonEmptyString { forms[l] = w } }
        for (l, m) in fix.entries { if let w = m[aid]?.nonEmptyString { forms[l] = w } }
        let cognateLangs = (c?["cognateLangs"]?.stringArray ?? []).filter { forms[$0].map { !$0.isEmpty } ?? false }
        let tier = a["tier"]?.number ?? 0
        let category = a["category"]?.string ?? "word"
        var readings: [String: Reading] = [:]
        for (l, r) in layers?["readings"]?[aid]?.object?.entries ?? [] { readings[l] = Reading(js: r) }
        var item = LangItem(
            id: aid, kind: .word, baseId: aid, tier: tier, unit: unitFor(category, .word, tier), category: category,
            gloss: a["gloss"]?.string ?? aid, forms: forms, readings: readings,
            root: (c?["root"]?.truthy ?? false) && cognateLangs.count >= 2 ? c?["root"]?.string : nil,
            cognateLangs: cognateLangs.count >= 2 ? cognateLangs : [], note: a["note"]?.string, example: strings(a["example"]),
            sentences: [:], gender: OrderedMap(), conj: [:], conjPast: [:], falseFriends: [:])
        for (l, ids) in layers?["sentences"]?["byItem"]?[aid]?.object?.entries ?? [] { item.sentences[l] = ids.stringArray ?? [] }
        for (l, g) in layers?["gender"]?.object?.entries ?? [] { if let v = g[aid]?.nonEmptyString { item.gender[l] = v } }
        let conjTables = layers?["conjugation"]?[aid]?.object?.entries ?? []
        for (l, t) in conjTables {
            item.conj[l] = t["present"]?.stringArray ?? []
            if let past = t["past"]?.stringArray { item.conjPast[l] = past }
        }
        for f in ffs where f.itemId == aid {
            if let w = forms[f.lang], !w.isEmpty, w.lowercased() == f.word.lowercased() { item.falseFriends[f.lang] = f }
        }
        items.append(item)

        var genderForms: [String: String] = [:]
        for (l, g) in item.gender.entries {
            if let w = articleFor(l, g, forms[l] ?? ""), let f = forms[l], !f.isEmpty { genderForms[l] = w }
        }
        if !genderForms.isEmpty {
            var g = item
            g.id = "g-\(aid)"
            g.kind = .gender
            g.forms = forms.merging(genderForms) { $1 }
            g.readings = [:]
            g.sentences = [:]
            g.falseFriends = [:]
            g.tier = tier + 0.5
            items.append(g)
        }
        if !item.conj.isEmpty {
            var conjForms = forms
            for (l, t) in conjTables { if let inf = t["infinitive"]?.string { conjForms[l] = inf } }
            var x = item
            x.id = "c-\(aid)"
            x.kind = .conj
            x.forms = conjForms
            x.readings = [:]
            x.sentences = [:]
            x.falseFriends = [:]
            x.tier = tier + 0.5
            items.append(x)
        }
    }
    for p in phrases?["phrases"]?.array ?? [] {
        guard let pid = p["id"]?.string else { continue }
        let id = "ph-\(pid)"
        let cat = p["category"]?.string
        let tier = Lang.phraseTier[cat ?? ""] ?? 5
        var readings: [String: Reading] = [:]
        for (l, r) in layers?["readings"]?[id]?.object?.entries ?? [] { readings[l] = Reading(js: r) }
        items.append(LangItem(
            id: id, kind: .phrase, baseId: id, tier: tier, unit: unitFor(cat ?? "", .phrase, tier), category: cat ?? "phrase",
            gloss: p["en"]?.string ?? p["forms"]?["en"]?.string ?? pid, forms: strings(p["forms"]), readings: readings,
            root: nil, cognateLangs: [], note: nil, example: [:], sentences: [:], gender: OrderedMap(), conj: [:], conjPast: [:], falseFriends: [:]))
    }
    let kindOrder: [ItemKind: Int] = [.word: 0, .phrase: 1, .gender: 2, .conj: 2]
    items = items.stableSorted { x, y in
        if x.unit != y.unit { return x.unit < y.unit }
        if x.tier != y.tier { return x.tier < y.tier }
        return kindOrder[x.kind]! < kindOrder[y.kind]!
    }
    var pool: [String: PoolSentence] = [:]
    let poolObj = layers?["sentences"]?["pool"]?.object ?? JSObject()
    for (k, s) in poolObj.entries {
        var lv: [String: Double]?
        if let o = s["lv"]?.object {
            var m: [String: Double] = [:]
            for (l, n) in o.entries { if let n = n.number { m[l] = n } }
            lv = m
        }
        pool[k] = PoolSentence(t: strings(s["t"]), r: strings(s["r"]), jaTokens: s["jaTokens"]?.stringArray, lv: lv)
    }
    var persons: [String: [String]] = [:]
    for (l, p) in layers?["persons"]?.object?.entries ?? [] { persons[l] = p.stringArray ?? [] }
    var byId: [String: LangItem] = [:]
    for i in items { byId[i.id] = i }
    return LangCorpus(
        items: items, byId: byId,
        attribution: cognates?["meta"]?["attribution"]?.string ?? "Language data from Wiktionary contributors via Kaikki (kaikki.org), CC-BY-SA 3.0.",
        sources: layers?["meta"]?["attribution"]?.stringArray ?? [],
        pool: pool, poolKeys: poolObj.keys, persons: persons, falseFriends: ffs,
        units: Lang.units.enumerated().map { LangUnit(index: $0.offset, id: $0.element.id, title: $0.element.title, grammar: $0.element.grammar) })
}

public func systemName(_ root: String, _ targets: [String]) -> String {
    if let p = Lang.presets.first(where: { $0.targets.count == targets.count && $0.targets.allSatisfy(targets.contains) }) { return "\(p.name) from \(Lang.name(root))" }
    return "\(targets.map(Lang.name).joined(separator: " + ")) from \(Lang.name(root))"
}

public enum SystemError: String, Error, Sendable {
    case noTargets = "no-targets"
    case tooMany = "too-many"
    case unknownLanguage = "unknown-language"
    case rootInTargets = "root-in-targets"
    case duplicate

    public var message: String {
        switch self {
        case .noTargets: "Pick at least one language to learn."
        case .tooMany: "Pick \(Lang.maxTargets) languages at most."
        case .unknownLanguage: "That language is not in the course."
        case .rootInTargets: "The root language cannot also be a target."
        case .duplicate: "You already have this system."
        }
    }
}

func unique(_ xs: [String]) -> [String] {
    var seen = Set<String>()
    return xs.filter { seen.insert($0).inserted }
}

func targetKey(_ t: [String]) -> String { t.sorted(by: strCmp).joined(separator: ",") }

public func validateSystem(_ root: String, _ targets: [String], _ existing: [LangSystem] = []) -> SystemError? {
    let t = unique(targets)
    if t.isEmpty { return .noTargets }
    if t.count > Lang.maxTargets { return .tooMany }
    if Lang.info[root] == nil || t.contains(where: { Lang.info[$0] == nil }) { return .unknownLanguage }
    if t.contains(root) { return .rootInTargets }
    let key = targetKey(t)
    if existing.contains(where: { $0.root == root && targetKey($0.targets) == key }) { return .duplicate }
    return nil
}

public func createSystem(_ root: String, _ targets: [String], _ existing: [LangSystem] = [], now: Double) throws -> LangSystem {
    if let err = validateSystem(root, targets, existing) { throw err }
    let t = unique(targets)
    let base = "\(root)-\(t.joined(separator: "-"))"
    var id = base
    var n = 2
    while existing.contains(where: { $0.id == id }) {
        id = "\(base)-\(n)"
        n += 1
    }
    return LangSystem(id: id, name: systemName(root, t), root: root, targets: t, createdAt: now)
}

public func progressBranch(_ s: LangSystem) -> String { String("lang-sys-\(s.id)".prefix(64)) }
public func cardId(_ lang: String, _ itemId: String) -> String { "\(lang):\(itemId)" }

public func parseCardId(_ id: String) -> (lang: String, itemId: String) {
    guard let i = id.firstIndex(of: ":") else { return ("", id) }
    return (String(id[..<i]), String(id[id.index(after: i)...]))
}

public func usable(_ item: LangItem, _ root: String, _ lang: String) -> Bool {
    if item.form(root) == nil || item.form(lang) == nil { return false }
    if item.kind == .gender { return item.gender[lang].map { !$0.isEmpty } ?? false }
    if item.kind == .conj { return item.conj[lang] != nil }
    return true
}

public func isVocab(_ item: LangItem) -> Bool { item.kind == .word || item.kind == .phrase }

public func sharedRootLangs(_ item: LangItem, _ system: LangSystem) -> [String] {
    guard item.root != nil else { return [] }
    let pool = Set([system.root] + system.targets)
    return item.cognateLangs.filter(pool.contains)
}

func isJSSpace(_ u: Unicode.Scalar) -> Bool {
    switch u.value {
    case 0x09...0x0D, 0x20, 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF: true
    default: false
    }
}

func jsTrim(_ s: String) -> String {
    let u = Array(s.unicodeScalars)
    var a = 0
    var b = u.count
    while a < b, isJSSpace(u[a]) { a += 1 }
    while b > a, isJSSpace(u[b - 1]) { b -= 1 }
    var out = String.UnicodeScalarView()
    out.append(contentsOf: u[a..<b])
    return String(out)
}

func mapScalars(_ s: String, _ f: (Unicode.Scalar) -> Unicode.Scalar?) -> String {
    var out = String.UnicodeScalarView()
    for u in s.unicodeScalars { if let x = f(u) { out.append(x) } }
    return String(out)
}

func isArabicVowel(_ u: Unicode.Scalar) -> Bool { (0x064B...0x0652).contains(u.value) || u.value == 0x0670 || u.value == 0x0640 }

let answerPunct: Set<Unicode.Scalar> = Set("¿¡!?.,;:\"'«»()。、！？؟،".unicodeScalars)

func collapseSpaces(_ s: String) -> String {
    var out = String.UnicodeScalarView()
    var inSpace = false
    for u in s.unicodeScalars {
        if isJSSpace(u) {
            if !inSpace { out.append(" ") }
            inSpace = true
        } else {
            out.append(u)
            inSpace = false
        }
    }
    return String(out)
}

public func normalizeAnswer(_ s: String, _ lang: String = "") -> String {
    var t = jsTrim(s).lowercased()
    if lang == "ar" {
        t = mapScalars(t) { isArabicVowel($0) ? nil : $0 }
    } else {
        t = LangScript.foldableMarks(t.decomposedStringWithCanonicalMapping).precomposedStringWithCanonicalMapping
    }
    t = mapScalars(t) { answerPunct.contains($0) ? " " : $0 }
    return jsTrim(collapseSpaces(t))
}

public func editDistance(_ a: String, _ b: String) -> Int {
    let x = Array(a.utf16)
    let y = Array(b.utf16)
    let m = x.count
    let n = y.count
    var d = (0...m).map { i in (0...n).map { j in i == 0 ? j : j == 0 ? i : 0 } }
    if m > 0 && n > 0 {
        for i in 1...m {
            for j in 1...n {
                let cost = x[i - 1] == y[j - 1] ? 0 : 1
                d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
                if i > 1 && j > 1 && x[i - 1] == y[j - 2] && x[i - 2] == y[j - 1] { d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1) }
            }
        }
    }
    return d[m][n]
}

public enum Verdict: String, Sendable { case exact, close, wrong }

let endPunct: Set<Unicode.Scalar> = Set(".!?。？！".unicodeScalars)

func stripEndPunct(_ s: String) -> String {
    var u = Array(s.unicodeScalars)
    while let last = u.last, endPunct.contains(last) { u.removeLast() }
    var out = String.UnicodeScalarView()
    out.append(contentsOf: u)
    return String(out)
}

public func judgeTyped(_ given: String, _ expected: [String], _ lang: String = "") -> Verdict {
    let raw = stripEndPunct(jsTrim(given).lowercased())
    if raw.isEmpty { return .wrong }
    var best = Verdict.wrong
    for exp in expected {
        let e0 = stripEndPunct(jsTrim(exp).lowercased())
        if raw == e0 { return .exact }
        if lang == "ar" && mapScalars(raw, { isArabicVowel($0) ? nil : $0 }) == mapScalars(e0, { isArabicVowel($0) ? nil : $0 }) { return .exact }
        let g = normalizeAnswer(given, lang)
        let e = normalizeAnswer(exp, lang)
        if g == e || (e.utf16.count >= 5 && editDistance(g, e) <= 1) { best = .close }
    }
    return best
}

public func verdictRating(_ v: Verdict, hesitated: Bool = false) -> Rating {
    switch v {
    case .wrong: 1
    case .close: 2
    case .exact: hesitated ? 2 : 3
    }
}

public enum ExerciseKind: String, Sendable {
    case intro, choose, reverse, listen, translate, typeHeard = "type-heard", speak, cloze, cognate, match, sentence, wordbank, gender, conjugate, falseFriend = "false-friend", spellHeard = "spell-heard", letter

    public var label: String {
        switch self {
        case .intro: "new word"
        case .choose: "translate"
        case .reverse: "what does it mean"
        case .listen: "listen"
        case .translate: "type it"
        case .typeHeard: "type what you hear"
        case .speak: "say it"
        case .cloze: "fill the gap"
        case .cognate: "shared root"
        case .match: "match the set"
        case .sentence: "translate the sentence"
        case .wordbank: "build the sentence"
        case .gender: "article"
        case .conjugate: "conjugate"
        case .falseFriend: "false friend"
        case .spellHeard: "spell what you hear"
        case .letter: "find the letter"
        }
    }
}

public struct LangWord: Sendable, Equatable, Hashable {
    public let lang: String
    public let word: String
    public var reading: Reading?
}

public struct Exercise: Sendable {
    public var kind: ExerciseKind
    public var itemId: String
    public var lang: String
    public var root: String
    public var prompt: String
    public var promptLang: String
    public var answer: String
    public var answerLang: String
    public var accept: [String]?
    public var options: [String]?
    public var optionLangs: [String: String]?
    public var pairs: [LangWord]?
    public var cloze: (before: String, after: String)?
    public var family: [LangWord]?
    public var note: String?
    public var promptReading: Reading?
    public var answerReading: Reading?
    public var tokens: [String]?
    public var sentenceId: String?
    public var person: String?
    public var tense: String?
    public var level: Double?
    public var falseFriend: FalseFriend?

    init(kind: ExerciseKind, itemId: String, lang: String, root: String, prompt: String, promptLang: String, answer: String, answerLang: String, note: String? = nil) {
        self.kind = kind
        self.itemId = itemId
        self.lang = lang
        self.root = root
        self.prompt = prompt
        self.promptLang = promptLang
        self.answer = answer
        self.answerLang = answerLang
        self.note = note
    }
}

public struct Rng: Sendable {
    var s: UInt32

    public init(seed: UInt32) { s = seed }

    public mutating func next() -> Double {
        s = s &+ 0x6d2b79f5
        var t = s
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return Double(t ^ (t >> 14)) / 4294967296
    }

    public mutating func index(_ n: Int) -> Int { Int((next() * Double(n)).rounded(.down)) }
}

public func shuffle<T>(_ xs: [T], _ rng: inout Rng) -> [T] {
    var a = xs
    var i = a.count - 1
    while i > 0 {
        let j = rng.index(i + 1)
        a.swapAt(i, j)
        i -= 1
    }
    return a
}

public func distractors(_ corpus: LangCorpus, _ item: LangItem, _ optionLang: String, _ otherLang: String, _ rng: inout Rng, _ n: Int = 3) -> [String] {
    let right = item.forms[optionLang] ?? ""
    let other = item.forms[otherLang] ?? ""
    let kind: ItemKind = item.kind == .phrase ? .phrase : .word
    let nRight = normalizeAnswer(right, optionLang)
    let nOther = normalizeAnswer(other, otherLang)
    let same = corpus.items.filter { x in
        guard x.baseId != item.baseId, x.kind == kind, let o = x.form(optionLang), let p = x.form(otherLang) else { return false }
        return normalizeAnswer(o, optionLang) != nRight && normalizeAnswer(p, otherLang) != nOther
    }
    let close = same.filter { $0.category == item.category }
    let pool = shuffle(close.count >= n ? close : same, &rng)
    var out: [String] = []
    for x in pool {
        let w = x.forms[optionLang]!
        if !out.contains(where: { normalizeAnswer($0, optionLang) == normalizeAnswer(w, optionLang) }) { out.append(w) }
        if out.count >= n { break }
    }
    return out
}

func utf16Slice(_ s: [UInt16], _ a: Int, _ b: Int) -> String {
    String(decoding: s[max(0, min(a, s.count))..<max(0, min(b, s.count))], as: UTF16.self)
}

func clozeFor(_ item: LangItem, _ lang: String) -> (before: String, after: String)? {
    guard item.kind == .word, let word = item.forms[lang], let sentence = item.example[lang], !sentence.isEmpty else { return nil }
    let hay = Array(sentence.lowercased().utf16)
    let needle = Array(word.lowercased().utf16)
    guard let idx = indexOf(hay, needle) else { return nil }
    let orig = Array(sentence.utf16)
    return (utf16Slice(orig, 0, idx), utf16Slice(orig, idx + word.utf16.count, orig.count))
}

func indexOf(_ hay: [UInt16], _ needle: [UInt16]) -> Int? {
    if needle.isEmpty { return 0 }
    if needle.count > hay.count { return nil }
    for i in 0...(hay.count - needle.count) where hay[i..<i + needle.count].elementsEqual(needle) { return i }
    return nil
}

let jaSkip: Set<Unicode.Scalar> = Set("。、！？".unicodeScalars)
let cjkSkip: Set<Unicode.Scalar> = Set("。，、！？.,!?".unicodeScalars)

public func tokenize(_ text: String, _ lang: String, _ jaTokens: [String]? = nil) -> [String] {
    if lang == "ja", let jaTokens, !jaTokens.isEmpty {
        return jaTokens.filter { t in
            let u = Array(t.unicodeScalars)
            return !(u.count == 1 && (isJSSpace(u[0]) || jaSkip.contains(u[0])))
        }
    }
    if lang == "zh" || lang == "ja" {
        return text.unicodeScalars.filter { !isJSSpace($0) && !cjkSkip.contains($0) }.map { String($0) }
    }
    var out: [String] = []
    var cur = String.UnicodeScalarView()
    for u in text.unicodeScalars {
        if isJSSpace(u) {
            if !cur.isEmpty { out.append(String(cur)) }
            cur = String.UnicodeScalarView()
        } else {
            cur.append(u)
        }
    }
    if !cur.isEmpty { out.append(String(cur)) }
    return out
}

public func joinTokens(_ tokens: [String], _ lang: String) -> String {
    lang == "zh" || lang == "ja" ? tokens.joined() : tokens.joined(separator: " ")
}

public func learnerLevel(_ state: EngineState, _ lang: String) -> Int {
    let n = state.cards.keys.filter { $0.hasPrefix("\(lang):") && !$0.hasPrefix("\(lang):g-") && !$0.hasPrefix("\(lang):c-") }.count
    return n < 60 ? 1 : n < 150 ? 2 : 3
}

public func sentenceFor(_ corpus: LangCorpus, _ item: LangItem, _ lang: String, _ root: String, _ rng: inout Rng, level: Int = 3) -> (id: String, s: PoolSentence)? {
    let ids = (item.sentences[lang] ?? []).filter { corpus.pool[$0]?.text(lang) != nil && corpus.pool[$0]?.text(root) != nil }
    if ids.isEmpty { return nil }
    let lv = { (id: String) in corpus.pool[id]!.lv?[lang] ?? 1 }
    let fit = ids.filter { lv($0) <= Double(level) }
    let choice = fit.isEmpty ? [ids.dropFirst().reduce(ids[0]) { a, b in lv(b) < lv(a) ? b : a }] : fit
    let id = choice[rng.index(choice.count)]
    return (id, corpus.pool[id]!)
}

func sentenceDistractors(_ corpus: LangCorpus, _ lang: String, _ root: String, _ avoid: String, _ rng: inout Rng, _ n: Int = 3) -> [String] {
    let av = corpus.pool[avoid]
    let ids = shuffle(corpus.poolKeys.filter { id in id != avoid && corpus.pool[id]!.text(lang) != nil && corpus.pool[id]!.t[root] != av?.t[root] }, &rng)
    var out: [String] = []
    for id in ids {
        let t = corpus.pool[id]!.t[lang]!
        if !out.contains(t) && t != av?.t[lang] { out.append(t) }
        if out.count >= n { break }
    }
    return out
}

public func relevantNote(_ note: String?, _ system: LangSystem) -> String? {
    guard let note, !note.isEmpty else { return nil }
    var names = system.targets.compactMap { Lang.info[$0]?.name }
    if system.targets.contains("zh") { names.append("Chinese") }
    return names.contains(where: { note.contains($0) }) ? note : nil
}

public func exerciseFor(_ corpus: LangCorpus, _ system: LangSystem, _ item: LangItem, _ lang: String, _ card: Card?, _ rng: inout Rng, speech: Bool = false, afterIntro: Bool = false, level: Int? = nil, heritage: Bool = false) -> Exercise {
    let root = system.root
    let target = item.forms[lang] ?? ""
    let rootWord = item.forms[root] ?? ""
    let tr = item.readings[lang]
    let rr = item.readings[root]
    let note = relevantNote(item.note, system)
    let reps = Int(card?.reps ?? 0)
    let latin = Lang.info[lang]?.latin ?? true
    let family = sharedRootLangs(item, system).filter { $0 != lang }.map { LangWord(lang: $0, word: item.forms[$0] ?? "", reading: item.readings[$0]) }
    let ff = item.falseFriends[lang]

    if item.kind == .gender { return genderExercise(item, lang, root, &rng) }
    if item.kind == .conj { return conjExercise(corpus, item, lang, root, reps, &rng) }

    func make(_ kind: ExerciseKind, _ prompt: String, _ pl: String, _ answer: String, _ al: String) -> Exercise {
        Exercise(kind: kind, itemId: item.id, lang: lang, root: root, prompt: prompt, promptLang: pl, answer: answer, answerLang: al, note: note)
    }

    if card == nil && !afterIntro {
        var ex = make(.intro, rootWord, root, target, lang)
        ex.family = family
        ex.answerReading = tr
        ex.promptReading = rr
        ex.falseFriend = ff
        return ex
    }
    if heritage && !latin && card != nil { return spellHeard(item, lang, root, tr) }
    func choices(_ right: String, _ l: String, _ other: String) -> [String] {
        let d = distractors(corpus, item, l, other, &rng)
        return shuffle([right] + d, &rng)
    }
    func toTarget(_ kind: ExerciseKind) -> Exercise {
        var ex = make(kind, rootWord, root, target, lang)
        ex.promptReading = rr
        ex.answerReading = tr
        return ex
    }
    func toRoot(_ kind: ExerciseKind) -> Exercise {
        var ex = make(kind, target, lang, rootWord, root)
        ex.promptReading = tr
        ex.answerReading = rr
        ex.options = choices(rootWord, root, lang)
        return ex
    }
    let lapsed = card != nil && (card?.lapses ?? 0) > 0 && card?.state == "relearning"
    let roll = rng.next()

    if let ff, reps >= 1, roll < 0.35 {
        let d = distractors(corpus, item, root, lang, &rng, 2)
        let options = shuffle(unique([rootWord, ff.looksLike] + d), &rng)
        var ex = make(.falseFriend, target, lang, rootWord, root)
        ex.options = options
        ex.promptReading = tr
        ex.falseFriend = ff
        return ex
    }
    if reps <= 1 || lapsed {
        if !family.isEmpty && sharedRootLangs(item, system).contains(lang) {
            let options = choices(target, lang, root)
            var ex = toTarget(.cognate)
            ex.options = options
            ex.family = family
            return ex
        }
        let options = choices(target, lang, root)
        var ex = toTarget(.choose)
        ex.options = options
        return ex
    }
    if reps == 2 { return roll < 0.5 ? toRoot(.listen) : toRoot(.reverse) }

    let sent = item.kind == .word ? sentenceFor(corpus, item, lang, root, &rng, level: level ?? 3) : nil
    if let sent, roll < 0.45 {
        let text = sent.s.t[lang]!
        var common = make(.sentence, sent.s.t[root] ?? "", root, text, lang)
        common.level = sent.s.lv?[lang]
        common.sentenceId = sent.id
        common.answerReading = sent.s.r[lang].flatMap { $0.isEmpty ? nil : Reading(roman: $0) }
        common.promptReading = sent.s.r[root].flatMap { $0.isEmpty ? nil : Reading(roman: $0) }
        let toks = tokenize(text, lang, sent.s.jaTokens)
        if roll < 0.25 && toks.count >= 3 && toks.count <= 12 {
            let other = sentenceDistractors(corpus, lang, root, sent.id, &rng, 1).first
            var extra: [String] = []
            if let other {
                let key = corpus.poolKeys.first { corpus.pool[$0]!.t[lang] == other }
                extra = Array(shuffle(tokenize(other, lang, key.flatMap { corpus.pool[$0]?.jaTokens }), &rng).filter { !toks.contains($0) }.prefix(2))
            }
            common.kind = .wordbank
            common.tokens = shuffle(toks + extra, &rng)
            common.accept = [joinTokens(toks, lang)]
            return common
        }
        let d = sentenceDistractors(corpus, lang, root, sent.id, &rng)
        common.options = shuffle([text] + d, &rng)
        return common
    }
    if let cloze = clozeFor(item, lang), roll < 0.6 {
        let options = choices(target, lang, root)
        var ex = toTarget(.cloze)
        ex.options = options
        ex.cloze = cloze
        return ex
    }
    if !latin {
        if roll < 0.8 { return toRoot(.listen) }
        let options = choices(target, lang, root)
        var ex = toTarget(.choose)
        ex.options = options
        return ex
    }
    if speech && roll < 0.7 { return toTarget(.speak) }
    if roll < 0.85 { return toTarget(.translate) }
    var ex = make(.typeHeard, target, lang, target, lang)
    ex.answerReading = tr
    return ex
}

func genderExercise(_ item: LangItem, _ lang: String, _ root: String, _ rng: inout Rng) -> Exercise {
    let full = item.forms[lang] ?? ""
    var noun = full
    for a in ["el", "la", "le", "il", "lo", "o", "a", "der", "die", "das", "de", "het"] where noun.hasPrefix("\(a) ") {
        noun = String(noun.dropFirst(a.count + 1))
        break
    }
    if noun.hasPrefix("l'") { noun = String(noun.dropFirst(2)) }
    let g = item.gender[lang] ?? ""
    let table = Lang.articles[lang] ?? []
    let answer = Lang.articleWord(lang, g, noun) ?? Lang.article(lang, g) ?? ""
    let extra = lang == "it" ? ["lo", "l'"] : lang == "fr" ? ["l'"] : []
    let options = shuffle(unique(table.map(\.1) + extra), &rng)
    let elided = full.hasPrefix("l'")
    var ex = Exercise(kind: .gender, itemId: item.id, lang: lang, root: root, prompt: noun, promptLang: lang, answer: answer, answerLang: lang,
                      note: elided ? "Before a vowel the article shortens to l': \(full)." : full)
    ex.options = options
    ex.cloze = ("", answer == "l'" ? noun : " \(noun)")
    let rootForm = item.forms[root]
    ex.promptReading = Reading(roman: root == "en" && rootForm.map { !$0.lowercased().hasPrefix("the ") } == true ? "the \(rootForm!)" : rootForm)
    return ex
}

public func personLabel(_ lang: String, _ person: String, _ form: String) -> String {
    if lang == "fr" && person == "je", let f = form.lowercased().unicodeScalars.first, "aeiouhéèêâîôû".unicodeScalars.contains(f) { return "j'" }
    return person
}

public func withPerson(_ lang: String, _ person: String, _ form: String) -> String {
    let label = personLabel(lang, person, form)
    return label.hasSuffix("'") ? "\(label)\(form)" : "\(label) \(form)"
}

func conjExercise(_ corpus: LangCorpus, _ item: LangItem, _ lang: String, _ root: String, _ reps: Int, _ rng: inout Rng) -> Exercise {
    let past = item.conjPast[lang]
    let usePast = past != nil && (reps >= 3 || Lang.units[item.unit].grammar.contains(.past)) && rng.next() < 0.5
    let table = usePast ? past! : item.conj[lang]!
    let persons = corpus.persons[lang] ?? ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"]
    let p = rng.index(6)
    let answer = p < table.count ? table[p] : ""
    var ex = Exercise(kind: .conjugate, itemId: item.id, lang: lang, root: root, prompt: item.forms[lang] ?? "", promptLang: lang, answer: answer, answerLang: lang,
                      note: persons.enumerated().map { withPerson(lang, $0.element, $0.offset < table.count ? table[$0.offset] : "") }.joined(separator: ", "))
    ex.accept = [answer]
    ex.person = personLabel(lang, p < persons.count ? persons[p] : "", answer)
    ex.tense = usePast ? "past" : "present"
    ex.promptReading = Reading(roman: item.forms[root])
    if reps <= 1 {
        let others = Array(shuffle(unique(table).filter { $0 != answer }, &rng).prefix(3))
        ex.options = shuffle([answer] + others, &rng)
    }
    return ex
}

public func gradeMatch(_ pairs: [LangWord], _ assign: [String: String]) -> [(lang: String, correct: Bool)] {
    pairs.map { p in (p.lang, pairs.first { $0.lang == assign[p.lang] }?.word == p.word) }
}

public func matchExercise(_ corpus: LangCorpus, _ system: LangSystem, _ item: LangItem, _ rng: inout Rng) -> Exercise? {
    let langs = system.targets.filter { item.form($0) != nil }
    guard langs.count >= 2, let rootWord = item.form(system.root) else { return nil }
    var ex = Exercise(kind: .match, itemId: item.id, lang: langs[0], root: system.root, prompt: rootWord, promptLang: system.root, answer: "", answerLang: langs[0], note: nil)
    ex.pairs = shuffle(langs.map { LangWord(lang: $0, word: item.forms[$0]!, reading: item.readings[$0]) }, &rng)
    ex.family = sharedRootLangs(item, system).map { LangWord(lang: $0, word: item.forms[$0] ?? "", reading: item.readings[$0]) }
    ex.note = relevantNote(item.note, system)
    return ex
}

public func newToday(_ state: EngineState, _ lang: String, now: Double, tz: TimeZone = .current) -> Int {
    let dk = dayKey(now, tz: tz)
    return state.cards.entries.filter { parseCardId($0.key).lang == lang && $0.value.introduced == dk && !($0.value.placed ?? false) }.count
}

public struct UnitStatus: Sendable, Identifiable {
    public let unit: LangUnit
    public let total: Int
    public let started: Int
    public let unlocked: Bool
    public let done: Bool
    public var id: String { unit.id }
}

public func unitStatus(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, _ lang: String) -> [UnitStatus] {
    var out: [UnitStatus] = []
    var prevDone = true
    for unit in corpus.units {
        let items = corpus.items.filter { $0.unit == unit.index && isVocab($0) && usable($0, system.root, lang) }
        let started = items.filter { state.cards.has(cardId(lang, $0.id)) }.count
        let done = items.isEmpty || Double(started) / Double(items.count) >= Lang.unitUnlockShare
        out.append(UnitStatus(unit: unit, total: items.count, started: started, unlocked: prevDone, done: done))
        prevDone = prevDone && done
    }
    return out
}

public struct SessionCard: Sendable, Equatable, Hashable {
    public let itemId: String
    public let lang: String
}

public func interleave(_ cards: [SessionCard]) -> [SessionCard] {
    var order: [String] = []
    var byLang: [String: [SessionCard]] = [:]
    for c in cards {
        if byLang[c.lang] == nil { order.append(c.lang); byLang[c.lang] = [] }
        byLang[c.lang]!.append(c)
    }
    var out: [SessionCard] = []
    var last = ""
    while out.count < cards.count {
        let queues = order.filter { !byLang[$0]!.isEmpty }.stableSorted { byLang[$0]!.count > byLang[$1]!.count }
        let pick = queues.first { $0 != last } ?? queues[0]
        out.append(byLang[pick]!.removeFirst())
        last = pick
    }
    return out
}

func grammarReady(_ item: LangItem, _ lang: String, _ state: EngineState) -> Bool {
    guard let base = state.cards[cardId(lang, item.baseId)] else { return false }
    return (base.reps ?? 0) >= 2
}

public func planSession(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, size: Int = 14, tz: TimeZone = .current) -> [SessionCard] {
    let due = state.cards.entries
        .map { (parseCardId($0.key), $0.value) }
        .filter { system.targets.contains($0.0.lang) && corpus.byId[$0.0.itemId] != nil && $0.1.due != nil && $0.1.due! <= now }
        .stableSorted { ($0.1.due ?? 0) < ($1.1.due ?? 0) }
        .prefix(size)
        .map { SessionCard(itemId: $0.0.itemId, lang: $0.0.lang) }
    let room = max(0, size - due.count)
    var fresh: [SessionCard] = []
    var budget: [String: Int] = [:]
    var unlocked: [String: Set<Int>] = [:]
    for l in system.targets {
        budget[l] = max(0, Lang.newPerLangPerDay - newToday(state, l, now: now, tz: tz))
        unlocked[l] = Set(unitStatus(system, corpus, state, l).filter(\.unlocked).map(\.unit.index))
    }
    outer: for item in corpus.items {
        if fresh.count >= room { break }
        for l in system.targets {
            if fresh.count >= room { break outer }
            if (budget[l] ?? 0) <= 0 { continue }
            if !usable(item, system.root, l) { continue }
            if !unlocked[l]!.contains(item.unit) { continue }
            if isVocab(item) && item.tier < (system.placement[l] ?? 0) { continue }
            if !isVocab(item) && !grammarReady(item, l, state) { continue }
            if state.cards.has(cardId(l, item.id)) { continue }
            fresh.append(SessionCard(itemId: item.id, lang: l))
            budget[l]! -= 1
        }
    }
    return interleave(Array(due)) + fresh
}

public func gradeCard(_ state: EngineState, _ lang: String, _ itemId: String, _ rating: Rating, now: Double, tz: String? = nil) -> EngineState {
    let id = cardId(lang, itemId)
    let wasNew = state.cards[id] == nil
    var next = grade(state, id: id, rating: rating, level: "recall", now: now, tz: tz)
    if wasNew { next.cards[id]!.introduced = dayKey(now, tzName: tz) } else if let i = state.cards[id]?.introduced { next.cards[id]!.introduced = i }
    return next
}

public enum PlacementMode: String, Sendable { case recognize, produce }

public struct PlacementAnswer: Sendable {
    public let tier: Double
    public let correct: Bool
    public var mode: PlacementMode?

    public init(tier: Double, correct: Bool, mode: PlacementMode? = nil) {
        self.tier = tier
        self.correct = correct
        self.mode = mode
    }
}

public struct PlacementStep: Sendable, Equatable {
    public let done: Bool
    public let tier: Double
    public var nextTier: Double?
    public var nextMode: PlacementMode?
}

public func placementStep(_ answers: [PlacementAnswer], maxItems: Int = Lang.placementMaxItems) -> PlacementStep {
    let tiers = Lang.placementTiers
    for t in tiers {
        let at = answers.filter { $0.tier == t }
        let right = at.filter(\.correct).count
        let wrong = at.count - right
        if right >= Lang.placementPassPerTier { continue }
        if wrong > Lang.placementItemsPerTier - Lang.placementPassPerTier || at.count >= Lang.placementItemsPerTier || answers.count >= maxItems { return PlacementStep(done: true, tier: t) }
        return PlacementStep(done: false, tier: t, nextTier: t, nextMode: at.count == Lang.placementProduceAt ? .produce : .recognize)
    }
    return PlacementStep(done: true, tier: tiers[tiers.count - 1] + 1)
}

public func placementHardness(_ item: LangItem, _ root: String, _ lang: String) -> Double {
    let a = normalizeAnswer(item.forms[root] ?? "", root)
    let b = normalizeAnswer(item.forms[lang] ?? "", lang)
    let n = max(a.utf16.count, b.utf16.count, 1)
    return Double(editDistance(a, b)) / Double(n)
}

public func placementItem(_ system: LangSystem, _ corpus: LangCorpus, _ lang: String, _ tier: Double, _ seen: Set<String>, _ rng: inout Rng) -> LangItem? {
    let exact = corpus.items.filter { $0.kind == .word && $0.tier == tier && usable($0, system.root, lang) && !seen.contains($0.id) }
    let near = !exact.isEmpty ? exact : corpus.items.filter { $0.kind == .word && abs($0.tier - tier) <= 1 && usable($0, system.root, lang) && !seen.contains($0.id) }
    if near.isEmpty { return nil }
    let ranked = shuffle(near, &rng).stableSorted { placementHardness($0, system.root, lang) > placementHardness($1, system.root, lang) }
    return ranked[rng.index(max(1, Int((Double(ranked.count) / 2).rounded(.up))))]
}

public func placementOptions(_ corpus: LangCorpus, _ item: LangItem, _ lang: String, _ root: String, _ rng: inout Rng) -> [String] {
    let d = distractors(corpus, item, lang, root, &rng)
    return shuffle([item.forms[lang] ?? ""] + d, &rng)
}

public func applyPlacement(_ state: EngineState, _ system: LangSystem, _ corpus: LangCorpus, _ lang: String, _ tier: Double, now: Double, tz: TimeZone = .current) -> EngineState {
    var next = state
    let fsrs = next.fsrs
    for item in corpus.items {
        if !isVocab(item) || item.tier >= tier || !usable(item, system.root, lang) { continue }
        let id = cardId(lang, item.id)
        if next.cards.has(id) { continue }
        var c = fsrs.review(Card(state: "new"), 3, now: now)
        c.placed = true
        c.introduced = dayKey(now, tz: tz)
        next.cards[id] = c
    }
    return next
}

public enum Stage: String, Sendable { case intro, check, review, match, letter }

public struct QueueEntry: Sendable, Equatable, Hashable {
    public let itemId: String
    public let lang: String
    public let stage: Stage

    public init(itemId: String, lang: String, stage: Stage) {
        self.itemId = itemId
        self.lang = lang
        self.stage = stage
    }
}

public let lettersPerSession = 5

public func letterQueue(_ system: LangSystem, _ state: EngineState, now: Double) -> [QueueEntry] {
    var out: [QueueEntry] = []
    for lang in system.targets where LangScript.alphabetUnit(lang) != nil {
        let due = LangScript.dueLetters(state, lang, now: now)
        let fresh = LangScript.alphabetDone(state, lang) ? [] : LangScript.nextLetters(state, lang, n: max(0, lettersPerSession - due.count))
        for l in due + fresh { out.append(QueueEntry(itemId: LangScript.letterItemId(l.ch), lang: lang, stage: .letter)) }
    }
    return out
}

public func letterExerciseFor(_ lang: String, _ root: String, _ itemId: String, _ rng: inout Rng) -> Exercise? {
    guard let index = LangScript.alphabetUnit(lang)?.letters.firstIndex(where: { LangScript.letterItemId($0.ch) == itemId }) else { return nil }
    return letterExercise(lang, root, index, &rng)
}

public func buildQueue(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double, size: Int = 14, tz: TimeZone = .current, heritage: Bool = false) -> [QueueEntry] {
    let plan = planSession(system, corpus, state, now: now, size: size, tz: tz)
    var out: [QueueEntry] = heritage ? letterQueue(system, state, now: now) : []
    var pending: [(at: Int, e: QueueEntry)] = []
    for c in plan {
        let isNew = !state.cards.has(cardId(c.lang, c.itemId))
        let vocab = isVocab(corpus.byId[c.itemId]!)
        out.append(QueueEntry(itemId: c.itemId, lang: c.lang, stage: isNew && vocab ? .intro : isNew ? .check : .review))
        if isNew && vocab { pending.append((out.count + Lang.checkGap, QueueEntry(itemId: c.itemId, lang: c.lang, stage: .check))) }
        while let first = pending.first, first.at <= out.count {
            out.append(first.e)
            pending.removeFirst()
        }
    }
    for p in pending { out.append(p.e) }

    if system.targets.count >= 2 {
        var seenOrder: [String] = []
        var seen: [String: Set<String>] = [:]
        func note(_ itemId: String, _ lang: String) {
            if seen[itemId] == nil { seenOrder.append(itemId); seen[itemId] = [] }
            seen[itemId]!.insert(lang)
        }
        for e in out { note(e.itemId, e.lang) }
        for id in state.cards.keys {
            let p = parseCardId(id)
            if system.targets.contains(p.lang) { note(p.itemId, p.lang) }
        }
        let candidates = seenOrder.filter { itemId in
            guard let item = corpus.byId[itemId], isVocab(item), item.form(system.root) != nil else { return false }
            let covered = system.targets.filter { item.form($0) != nil }
            return covered.count >= 2 && covered.allSatisfy { seen[itemId]!.contains($0) } && Set(covered.map { item.forms[$0]! }).count == covered.count
        }
        let roots = { (id: String) in sharedRootLangs(corpus.byId[id]!, system).count }
        if let best = candidates.stableSorted({ roots($0) > roots($1) }).first { out.append(QueueEntry(itemId: best, lang: system.targets[0], stage: .match)) }
    }
    return out
}

public func requeueAfterMiss(_ queue: [QueueEntry], _ index: Int, _ entry: QueueEntry) -> [QueueEntry] {
    let same = { (e: QueueEntry) in e.itemId == entry.itemId && e.lang == entry.lang }
    if queue.dropFirst(index + 1).contains(where: { same($0) && $0.stage != .match }) { return queue }
    if queue.filter({ same($0) && ($0.stage == .check || $0.stage == .review) }).count >= Lang.maxTries { return queue }
    let at = min(queue.count, index + 1 + Lang.checkGap)
    return Array(queue[..<at]) + [entry] + Array(queue[at...])
}

public func editSystem(_ system: LangSystem, _ targets: [String], now: Double) throws -> LangSystem {
    let t = unique(targets).filter { $0 != system.root && Lang.info[$0] != nil }
    if t.isEmpty { throw SystemError.noTargets }
    if t.count > Lang.maxTargets { throw SystemError.tooMany }
    var s = system
    s.targets = t
    s.name = systemName(system.root, t)
    s.updatedAt = now
    return s
}

public struct SystemsDoc: Sendable, Equatable {
    public var systems: [LangSystem]
    public var removed: [String: Double]

    public init(systems: [LangSystem] = [], removed: [String: Double] = [:]) {
        self.systems = systems
        self.removed = removed
    }

    public init(js: JSValue?) {
        systems = (js?["systems"]?.array ?? []).compactMap(LangSystem.init(js:))
        var r: [String: Double] = [:]
        for (k, v) in js?["removed"]?.object?.entries ?? [] { if let n = v.number { r[k] = n } }
        removed = r
    }

    public var js: JSValue {
        .object(JSObject([("systems", .array(systems.map(\.js))), ("removed", .object(JSObject(removed.keys.sorted().map { ($0, .number(removed[$0]!)) })))]))
    }
}

public func mergeSystems(_ a: SystemsDoc, _ b: SystemsDoc) -> SystemsDoc {
    var removed = a.removed
    for (id, t) in b.removed { removed[id] = max(removed[id] ?? 0, t) }
    var order: [String] = []
    var byId: [String: LangSystem] = [:]
    for s in a.systems + b.systems {
        guard let cur = byId[s.id] else {
            order.append(s.id)
            byId[s.id] = s
            continue
        }
        var placement = cur.placement
        for (l, t) in s.placement { placement[l] = max(placement[l] ?? 0, t) }
        var newer = (s.updatedAt ?? s.createdAt) > (cur.updatedAt ?? cur.createdAt) ? s : cur
        newer.createdAt = min(cur.createdAt, s.createdAt)
        newer.placement = placement
        byId[s.id] = newer
    }
    let systems = order.map { byId[$0]! }.filter { (removed[$0.id] ?? -1) < $0.createdAt }.stableSorted { $0.createdAt < $1.createdAt }
    return SystemsDoc(systems: systems, removed: removed)
}

public struct LangProgress: Sendable, Identifiable {
    public let lang: String
    public let total: Int
    public let started: Int
    public let mastered: Int
    public let due: Int
    public let retention: Double
    public let placedAt: Double?
    public let grammarStarted: Int
    public let grammarTotal: Int
    public var id: String { lang }
}

public func langProgress(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double) -> [LangProgress] {
    let fsrs = FSRS()
    return system.targets.map { lang in
        let all = corpus.items.filter { usable($0, system.root, lang) }
        let items = all.filter(isVocab)
        let grammar = all.filter { !isVocab($0) }
        var started = 0
        var mastered = 0
        var due = 0
        var rSum = 0.0
        for i in all {
            guard let c = state.cards[cardId(lang, i.id)] else { continue }
            if let d = c.due, d <= now { due += 1 }
            if !isVocab(i) { continue }
            started += 1
            if fsrs.mastery(c) >= 0.8 { mastered += 1 }
            let elapsed = max(0, (now - (c.lastReview ?? now)) / DAY_MS)
            rSum += fsrs.retrievability(elapsed, c.stability ?? 0)
        }
        return LangProgress(lang: lang, total: items.count, started: started, mastered: mastered, due: due, retention: started > 0 ? rSum / Double(started) : 0,
                            placedAt: system.placement[lang], grammarStarted: grammar.filter { state.cards.has(cardId(lang, $0.id)) }.count, grammarTotal: grammar.count)
    }
}

public struct SystemSummary: Sendable {
    public let started: Int
    public let total: Int
    public let due: Int
    public let xp: Double
    public let streak: Double
    public let sharedRootItems: Int
}

public func systemSummary(_ system: LangSystem, _ corpus: LangCorpus, _ state: EngineState, now: Double) -> SystemSummary {
    let per = langProgress(system, corpus, state, now: now)
    return SystemSummary(started: per.reduce(0) { $0 + $1.started }, total: per.reduce(0) { $0 + $1.total }, due: per.reduce(0) { $0 + $1.due },
                         xp: state.xp, streak: state.streak, sharedRootItems: corpus.items.filter { $0.kind == .word && sharedRootLangs($0, system).count >= 2 }.count)
}

public func readingsByForm(_ corpus: LangCorpus, _ lang: String) -> [String: Reading] {
    var out: [String: Reading] = [:]
    for i in corpus.items where isVocab(i) {
        if let f = i.form(lang), let r = i.readings[lang], out[f] == nil { out[f] = r }
    }
    for k in corpus.poolKeys {
        let s = corpus.pool[k]!
        if let t = s.text(lang), let r = s.r[lang], !r.isEmpty, out[t] == nil { out[t] = Reading(roman: r) }
    }
    return out
}

public func falseFriendsFor(_ corpus: LangCorpus, _ system: LangSystem) -> [FalseFriend] {
    let langs = Set(system.targets)
    return corpus.falseFriends.filter { langs.contains($0.lang) }
}
