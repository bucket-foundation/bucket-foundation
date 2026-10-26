import Foundation
import Testing
@testable import BucketKit

func langFixture(_ name: String) throws -> JSValue {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/lang"))
    return try JSON.parse(Data(contentsOf: url))
}

func s(_ x: String?) -> JSValue { x.map(JSValue.string) ?? .null }
func n(_ x: Double?) -> JSValue { x.map(JSValue.number) ?? .null }
func strs(_ x: [String]?) -> JSValue { x.map { .array($0.map(JSValue.string)) } ?? .null }
func obj(_ pairs: [(String, JSValue)]) -> JSValue { .object(JSObject(pairs)) }

func tierText(_ t: Double) -> String { JSON.number(t) }

func exJS(_ e: Exercise?) -> JSValue {
    guard let e else { return .null }
    return obj([
        ("kind", .string(e.kind.rawValue)), ("itemId", .string(e.itemId)), ("lang", .string(e.lang)),
        ("prompt", .string(e.prompt)), ("promptLang", .string(e.promptLang)), ("answer", .string(e.answer)), ("answerLang", .string(e.answerLang)),
        ("options", strs(e.options)), ("tokens", strs(e.tokens)), ("accept", strs(e.accept)),
        ("pairs", strs(e.pairs?.map { "\($0.lang)=\($0.word)" })), ("family", strs(e.family?.map { "\($0.lang)=\($0.word)" })),
        ("cloze", e.cloze.map { .array([.string($0.before), .string($0.after)]) } ?? .null),
        ("person", s(e.person)), ("tense", s(e.tense)), ("note", s(e.note)), ("sentenceId", s(e.sentenceId)),
    ])
}

func runScenario(_ corpus: LangCorpus) throws -> JSValue {
    let utc = TimeZone(identifier: "UTC")!
    let day = DAY_MS
    var rng0 = Rng(seed: 7)
    var out: [(String, JSValue)] = []
    out.append(("rng", .array((0..<4).map { _ in .number(rng0.next()) })))
    out.append(("items", .array(corpus.items.map { i in
        .string([i.id, i.kind.rawValue, String(i.unit), tierText(i.tier), i.root ?? "", i.cognateLangs.joined(separator: ","), i.gender.keys.joined(separator: ","), i.falseFriends.keys.sorted(by: strCmp).joined(separator: ",")].joined(separator: "|"))
    })))
    out.append(("normalize", .array(["  ¿Dónde está?  ", "L'Été", "Straße!", "مَرْحَبًا", "Ça   va, bien."].enumerated().map { .string(normalizeAnswer($0.element, $0.offset == 3 ? "ar" : "")) })))
    out.append(("judge", .array([["gato", "gato", "es"], ["gatto", "gato", "es"], ["comrpar", "comprar", "es"], ["Hund.", "Hund", "de"], ["perro", "gato", "es"], ["mrhba", "مرحبا", "ar"]].map { .string(judgeTyped($0[0], [$0[1]], $0[2]).rawValue) })))
    out.append(("edit", .array([editDistance("kitten", "sitting"), editDistance("ab", "ba"), editDistance("", "abc")].map { .number(Double($0)) })))
    out.append(("audio", .array([LangAudio.key("es", "hola"), LangAudio.key("ja", "こんにちは"), LangAudio.key("fr", " l'été ")].map(JSValue.string))))

    var c = DateComponents()
    c.year = 2026; c.month = 10; c.day = 20; c.hour = 15
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = utc
    let t0 = cal.date(from: c)!.timeIntervalSince1970 * 1000
    let system = try createSystem("en", ["fr", "es", "it"], [], now: t0)
    var state = EngineState()
    let ratings = [3, 3, 1, 3, 2, 3, 4, 3, 1, 3, 3, 2]
    var r = 0
    var log: [JSValue] = []
    var sys = system

    for d in 0..<4 {
        if d == 1 {
            var answers: [PlacementAnswer] = []
            var seen = Set<String>()
            var prng = Rng(seed: 99)
            var steps: [JSValue] = []
            for k in 0..<20 {
                let step = placementStep(answers)
                if step.done {
                    steps.append(obj([("done", .bool(true)), ("tier", .number(step.tier))]))
                    sys.placement["es"] = step.tier
                    state = applyPlacement(state, sys, corpus, "es", step.tier, now: t0 + day * Double(d), tz: utc)
                    break
                }
                guard let item = placementItem(sys, corpus, "es", step.nextTier!, seen, &prng) else { break }
                let opts = placementOptions(corpus, item, "es", sys.root, &prng)
                steps.append(obj([("tier", n(step.nextTier)), ("mode", s(step.nextMode?.rawValue)), ("item", .string(item.id)), ("opts", strs(opts))]))
                seen.insert(item.id)
                answers.append(PlacementAnswer(tier: step.nextTier!, correct: k % 3 != 2, mode: step.nextMode))
            }
            log.append(obj([("placement", .array(steps))]))
        }
        for session in 0..<3 {
            var now = t0 + day * Double(d) + Double(session) * 3_600_000
            var queue = buildQueue(sys, corpus, state, now: now, tz: utc)
            var rng = Rng(seed: UInt32(1000 + d * 10 + session))
            var rows: [JSValue] = []
            var i = 0
            while i < queue.count {
                let e = queue[i]
                let item = corpus.byId[e.itemId]!
                let made: Exercise? = e.stage == .match
                    ? matchExercise(corpus, sys, item, &rng)
                    : exerciseFor(corpus, sys, item, e.lang, state.cards[cardId(e.lang, e.itemId)], &rng, speech: false, afterIntro: e.stage == .check, level: learnerLevel(state, e.lang))
                rows.append(obj([("stage", .string(e.stage.rawValue)), ("ex", exJS(made))]))
                now += 20_000
                defer { i += 1 }
                guard let made, made.kind != .intro else { continue }
                if made.kind == .match {
                    for p in made.pairs ?? [] { state = gradeCard(state, p.lang, e.itemId, 3, now: now, tz: "UTC") }
                    continue
                }
                let rating = ratings[r % ratings.count]
                r += 1
                state = gradeCard(state, e.lang, e.itemId, rating, now: now, tz: "UTC")
                if rating == 1 { queue = requeueAfterMiss(queue, i, QueueEntry(itemId: e.itemId, lang: e.lang, stage: .review)) }
            }
            log.append(obj([("day", .number(Double(d))), ("session", .number(Double(session))), ("queue", .array(queue.map { .string("\($0.lang):\($0.itemId):\($0.stage.rawValue)") })), ("rows", .array(rows))]))
        }
    }
    let end = t0 + day * 4
    out.append(("log", .array(log)))
    out.append(("cards", .array(state.cards.entries.map { id, c in
        .array([.string(id), s(c.state), n(c.reps), n(c.lapses), n(c.stability), n(c.difficulty), n(c.due), s(c.introduced), .bool(c.placed ?? false)])
    })))
    out.append(("stats", .array([.number(state.xp), .number(state.streak), s(state.lastStudyDay)])))
    out.append(("progress", .array(langProgress(sys, corpus, state, now: end).map { p in
        .array([.string(p.lang), .number(Double(p.total)), .number(Double(p.started)), .number(Double(p.mastered)), .number(Double(p.due)), .number(p.retention), n(p.placedAt), .number(Double(p.grammarStarted)), .number(Double(p.grammarTotal))])
    })))
    out.append(("units", .array(unitStatus(sys, corpus, state, "fr").map { u in
        .array([.string(u.unit.id), .number(Double(u.total)), .number(Double(u.started)), .bool(u.unlocked), .bool(u.done)])
    })))
    let sum = systemSummary(sys, corpus, state, now: end)
    out.append(("summary", .array([sum.started, sum.total, sum.due].map { .number(Double($0)) } + [.number(sum.xp), .number(sum.streak), .number(Double(sum.sharedRootItems))])))
    var a0 = system
    a0.placement = ["es": 2]
    var b0 = system
    b0.updatedAt = t0 + 5
    b0.name = "renamed"
    b0.placement = ["es": 4, "fr": 1]
    var b1 = system
    b1.id = "x"
    b1.createdAt = t0 - 1
    let merged = mergeSystems(SystemsDoc(systems: [a0]), SystemsDoc(systems: [b0, b1], removed: ["x": t0]))
    out.append(("merge", merged.js))
    let sweepSys = try createSystem("en", ["fr", "es", "it", "de", "ja"], [], now: t0)
    var srng = Rng(seed: 4242)
    var sweep: [JSValue] = []
    for item in corpus.items {
        for lang in sweepSys.targets {
            if item.form(lang) == nil || item.form("en") == nil { continue }
            if item.kind == .gender && item.gender[lang] == nil { continue }
            if item.kind == .conj && item.conj[lang] == nil { continue }
            for reps in [1, 2, 3, 5] {
                var card = Card(state: reps == 5 ? "relearning" : "review")
                card.reps = Double(reps)
                card.lapses = reps == 5 ? 1 : 0
                card.stability = 3
                card.difficulty = 5
                card.lastReview = t0
                card.due = t0
                sweep.append(exJS(exerciseFor(corpus, sweepSys, item, lang, card, &srng, speech: true, level: 1 + reps % 3)))
            }
        }
    }
    out.append(("sweep", .array(sweep)))
    var crng = Rng(seed: 808)
    var cross: [JSValue] = []
    for item in corpus.items where item.kind == .word || item.kind == .phrase {
        for lang in sweepSys.targets {
            if item.form(lang) == nil || item.form("en") == nil { continue }
            var card = Card(state: "review")
            card.reps = 1
            card.lapses = 0
            card.stability = 3
            card.difficulty = 5
            card.lastReview = t0
            card.due = t0
            let made = exerciseFor(corpus, sweepSys, item, lang, card, &crng, speech: false, level: 1)
            guard made.kind == .choose else { continue }
            let c = crossLanguageOptions(made, item, sweepSys, &crng)
            cross.append(obj([
                ("itemId", .string(item.id)), ("lang", .string(lang)), ("options", strs(c.options)),
                ("optionLangs", strs(c.optionLangs.map { $0.map { "\($0.key)=\($0.value)" }.sorted(by: strCmp) })),
            ]))
        }
    }
    out.append(("cross", .array(cross)))
    out.append(("heritage", heritageScenario(corpus, t0: t0)))
    let articleCases: [(String, String, String)] = [("fr","m","haricot"),("fr","m","haricots"),("fr","m","hibou"),("fr","m","hiboux"),("fr","m","héros"),("fr","f","hache"),("fr","m","hamburger"),("fr","m","Homard"),("fr","f","honte"),("fr","m","hors-d'œuvre"),("fr","m","haut de gamme"),("fr","m","homme"),("fr","f","heure"),("fr","m","hôtel"),("fr","f","herbe"),("fr","m","hot-dog"),("fr","m","hold-up"),("fr","m","hip-hop"),("fr","f","haute couture"),("fr","m","haut-parleur"),("fr","f","hallucination"),("fr","m","hautbois"),("fr","f","haches"),("fr","m","ami"),("fr","f","eau"),("fr","m","livre"),("it","m","zero"),("it","f","acqua"),("it","m","libro"),("es","f","agua"),("es","f","casa"),("de","f","Kirche")]
    let gateLangs = ["ja", "th", "hi", "ru"]
    out.append(("gate", .array(gateLangs.map { l in
        let u = LangScript.alphabetUnit(l)!
        var rows: [JSValue] = []
        var gs = EngineState()
        for round in 0..<30 {
            let fresh = LangScript.nextLetters(gs, l, n: 5).map(\.ch)
            rows.append(.array([.string(fresh.joined()), .bool(LangScript.alphabetDone(gs, l))]))
            if fresh.isEmpty { break }
            for ch in fresh { gs = gradeCard(gs, l, LangScript.letterItemId(ch), 3, now: t0 + Double(round) * 86_400_000, tz: "UTC") }
        }
        return .array([.string(l), .number(Double(u.letters.count)), .array(rows)])
    })))
    out.append(("articles", .array(articleCases.map { Lang.articleWord($0.0, $0.1, $0.2).map(JSValue.string) ?? .null })))
    return obj(out)
}

func diff(_ a: JSValue, _ b: JSValue, _ path: String = "$") -> String? {
    switch (a, b) {
    case (.number(let x), .number(let y)):
        return abs(x - y) <= 1e-9 * max(1, abs(x), abs(y)) ? nil : "\(path): \(x) != \(y)"
    case (.array(let x), .array(let y)):
        if x.count != y.count { return "\(path): count \(x.count) != \(y.count)" }
        for (i, (p, q)) in zip(x, y).enumerated() { if let d = diff(p, q, "\(path)[\(i)]") { return d } }
        return nil
    case (.object(let x), .object(let y)):
        for k in Set(x.keys).union(y.keys).sorted() { if let d = diff(x[k] ?? .null, y[k] ?? .null, "\(path).\(k)") { return d } }
        return nil
    default:
        return a == b ? nil : "\(path): \(JSON.stringify(a)) != \(JSON.stringify(b))"
    }
}

@Suite struct PolingualParityTests {
    @Test func swiftEngineMatchesTheWebEngine() throws {
        let corpus = buildLangCorpus(core: try langFixture("core"), cognates: try langFixture("cognates"), phrases: try langFixture("phrases"), layers: try langFixture("layers"))
        let golden = try langFixture("golden")
        let mine = try runScenario(corpus)
        if let out = ProcessInfo.processInfo.environment["PARITY_OUT"] { try JSON.data(mine).write(to: URL(fileURLWithPath: out)) }
        let d = diff(mine, golden)
        #expect(d == nil, "\(d ?? "")")
    }
}

func heritageScenario(_ corpus: LangCorpus, t0: Double) -> JSValue {
    let judgeCases: [(String, [String], String)] = [
        ("שָׁלוֹם", ["שלום"], "he"), ("كتـاب", ["كتاب"], "ar"), ("كتاي", ["كتاب"], "ar"), ("يك", ["یک"], "fa"),
        ("еж", ["ёж"], "ru"), ("мои", ["мой"], "ru"), ("кни\u{301}га", ["книга"], "ru"), ("моско", ["москва"], "ru"),
        ("καλημερα", ["καλημέρα"], "el"), ("ΟΔΟΣ", ["οδός"], "el"), ("नमसते", ["नमस्ते"], "hi"), ("ﾈｺ", ["ネコ"], "ja"),
        ("", ["猫"], "zh"), ("все", ["всё"], "ru"), ("ВСЁ", ["всё"], "ru"), ("еж", ["ёж"], "ru"), ("ねこ", ["猫", "ねこ"], "ja"), ("한국", ["한국".decomposedStringWithCanonicalMapping], "ko"),
    ]
    let foldCases: [(String, String)] = [("ru", "кни\u{301}га"), ("el", "ΟΔΟΣ"), ("el", "ὀδός"), ("grc", "Ἀθῆναι"), ("he", " שָׁלוֹם! "), ("fa", "يك"), ("ja", "ﾈｺ"), ("uk", "ї")]
    var lrng = Rng(seed: 31)
    let letters: [JSValue] = LangScript.heritageLangs.sorted(by: strCmp).map { l in
        let u = LangScript.alphabetUnit(l)!
        return .array([0, 1, u.letters.count - 1].map { i in
            let x = letterExercise(l, "en", i, &lrng)!
            return .string("\(l)|\(x.prompt)|\(x.answer)|\((x.options ?? []).joined())|\((x.accept ?? []).joined())")
        })
    }
    var hs = EngineState()
    var sched: [JSValue] = []
    for round in 0..<3 {
        let fresh = LangScript.nextLetters(hs, "ru", n: 5).map(\.ch)
        for ch in fresh { hs = gradeCard(hs, "ru", LangScript.letterItemId(ch), round == 1 ? 1 : 3, now: t0 + Double(round) * 86_400_000, tz: "UTC") }
        let due = LangScript.dueLetters(hs, "ru", now: t0 + Double(round + 5) * 86_400_000).map(\.ch).joined()
        sched.append(.array([.string(fresh.joined()), .string(due), .bool(LangScript.alphabetDone(hs, "ru"))]))
    }
    for l in LangScript.alphabetUnit("ru")!.letters { hs = gradeCard(hs, "ru", LangScript.letterItemId(l.ch), 3, now: t0, tz: "UTC") }
    sched.append(.array([.string("all"), .bool(LangScript.alphabetDone(hs, "ru")), .number(Double(LangScript.nextLetters(hs, "ru", n: 5).count))]))
    let hSys = try! createSystem("en", ["ru", "el", "ja"], [], now: t0)
    var hq = EngineState()
    for l in LangScript.alphabetUnit("ru")!.letters.prefix(3) { hq = gradeCard(hq, "ru", LangScript.letterItemId(l.ch), 3, now: t0, tz: "UTC") }
    let hQueue = buildQueue(hSys, corpus, hq, now: t0 + 6 * 86_400_000, tz: TimeZone(identifier: "UTC")!, heritage: true).map { "\($0.itemId)|\($0.lang)|\($0.stage.rawValue)" }
    var spell: [String] = []
    for item in corpus.items where item.kind == .word {
        for lang in hSys.targets {
            if item.form(lang) == nil || item.form("en") == nil { continue }
            var card = Card(state: "review")
            card.reps = 3
            card.lapses = 0
            card.stability = 3
            card.difficulty = 5
            card.lastReview = t0
            card.due = t0
            var r = Rng(seed: 5)
            let ex = exerciseFor(corpus, hSys, item, lang, card, &r, speech: false, level: 1, heritage: true)
            spell.append("\(item.id)|\(lang)|\(ex.kind.rawValue)|\(ex.prompt)|\(ex.answer)")
        }
    }
    return obj([
        ("judge", .array(judgeCases.map { .string(LangScript.judgeSpelled($0.0, $0.1, $0.2).rawValue) })),
        ("fold", .array(foldCases.map { .string(LangScript.foldMarks($0.1, $0.0)) })),
        ("letters", .array(letters)),
        ("sched", .array(sched)),
        ("spell", strs(spell)),
        ("queue", strs(hQueue)),
    ])
}
