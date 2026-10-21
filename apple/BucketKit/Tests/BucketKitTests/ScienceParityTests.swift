import Foundation
import Testing
@testable import BucketKit

func scienceFixture(_ name: String) throws -> Data {
    let url = try #require(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures/science"))
    return try Data(contentsOf: url)
}

func runScienceScenario(_ deck: Deck) -> JSValue {
    let utc = TimeZone(identifier: "UTC")!
    let atoms = withLeverage(deck.atoms)
    let enc = buildEncompassingMap(atoms)
    let byId = Dictionary(atoms.map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
    var c = DateComponents()
    c.year = 2026; c.month = 10; c.day = 20
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = utc
    let t0 = cal.date(from: c)!.timeIntervalSince1970 * 1000
    let ratings = [3, 4, 1, 3, 2, 3, 3, 4, 1, 2, 3, 3, 3]
    let days = [0, 1, 2, 3, 5, 6, 9, 10, 14, 20, 21, 30, 31, 45]
    var state = EngineState()
    var r = 0
    var sessions: [JSValue] = []
    func sum(_ s: ScienceSummary) -> JSValue {
        .array([.number(Double(s.total)), .number(Double(s.introduced)), .number(Double(s.mastered)), .number(Double(s.dueCount)), .number(s.xp), .number(s.streak)])
    }
    for day in days {
        let tz = day >= 20 && day < 31 ? "Asia/Tokyo" : "UTC"
        for h in [8, 19] {
            var now = t0 + Double(day) * DAY_MS + Double(h) * 3_600_000
            let queue = route(state, atoms, now: now, tz: utc)
            var rows: [JSValue] = []
            for item in queue {
                let level = pickLevel(state, byId[item.id]!)
                let rating = ratings[r % ratings.count]
                r += 1
                state = grade(state, encompassing: enc, id: item.id, rating: rating, level: level, now: now, tz: tz)
                rows.append(.array([.string(item.id), .string(item.kind.rawValue), n(item.due), .string(level), .number(Double(rating))]))
                now += 30_000
            }
            sessions.append(obj([("day", .number(Double(day))), ("h", .number(Double(h))), ("rows", .array(rows)), ("summary", sum(summary(state, atoms, now: now)))]))
        }
    }
    let end = t0 + 60 * DAY_MS
    let fixed: [(Double, Int)] = [(0.125, 2), (1.005, 2), (0.0005, 3), (2.5, 0), (1.45, 1), (0.075, 4), (0.66666666, 3), (-0.125, 2), (12345.67895, 4)]
    return obj([
        ("leverage", .array(atoms.map { .array([.string($0.id), n($0.leverage), .string($0.unlocks.joined(separator: ","))]) })),
        ("enc", .array(atoms.map { a in .array([.string(a.id), .array(enc[a.id]!.map { .string("\($0.id):\(JSON.number($0.weight)):\($0.dist)") })]) })),
        ("sessions", .array(sessions)),
        ("mastery", .array(atoms.map { .array([.string($0.id), .number(masteryFor(state, $0.id))]) })),
        ("levels", .array(atoms.map { .string(pickLevel(state, $0)) })),
        ("route", .array(route(state, atoms, now: end, tz: utc).map { .string("\($0.kind.rawValue):\($0.id)") })),
        ("summary", sum(summary(state, atoms, now: end))),
        ("fixed", .array(fixed.map { .number(toFixed($0.0, $0.1)) })),
        ("state", state.js),
    ])
}

func mutatedGolden(_ golden: JSValue) -> JSValue {
    guard case .object(var root) = golden, case .object(var st) = root["state"]!, case .object(var cards) = st["cards"]!,
          let first = cards.keys.first, case .object(var card) = cards[first]! else { return golden }
    card["stability"] = .number((card["stability"]?.number ?? 0) + 0.001)
    cards[first] = .object(card)
    st["cards"] = .object(cards)
    root["state"] = .object(st)
    return .object(root)
}

@Suite struct ScienceParityTests {
    @Test func swiftScienceEngineMatchesTheWebEngine() throws {
        let deck = try JSONDecoder().decode(Deck.self, from: scienceFixture("deck"))
        let golden = try JSON.parse(scienceFixture("golden"))
        let mine = runScienceScenario(deck)
        if let out = ProcessInfo.processInfo.environment["SCIENCE_PARITY_OUT"] { try JSON.data(mine).write(to: URL(fileURLWithPath: out)) }
        let d = diff(mine, golden)
        #expect(d == nil, "\(d ?? "")")
    }

    @Test func parityCheckCatchesOneChangedGoldenValue() throws {
        let deck = try JSONDecoder().decode(Deck.self, from: scienceFixture("deck"))
        let golden = try JSON.parse(scienceFixture("golden"))
        let bent = mutatedGolden(golden)
        #expect(bent != golden)
        let d = diff(runScienceScenario(deck), bent)
        #expect(d?.contains("stability") == true)
    }

    @Test func toFixedRoundsHalfUpOnTheExactBinaryValue() {
        #expect(toFixed(0.125, 2) == 0.13)
        #expect(toFixed(1.005, 2) == 1)
        #expect(toFixed(-0.125, 2) == -0.13)
        #expect(toFixed(0.6 * 0.125, 4) == 0.075)
    }

    @Test func fireCreditsRaiseAPrerequisiteWhenTheParentIsRecalled() throws {
        let deck = try JSONDecoder().decode(Deck.self, from: scienceFixture("deck"))
        let atoms = withLeverage(deck.atoms)
        let enc = buildEncompassingMap(atoms)
        let ids = Set(atoms.map(\.id))
        let child = try #require(atoms.first { c in c.requires.first.map(ids.contains) ?? false })
        let parent = child.requires[0]
        var s = grade(EngineState(), encompassing: enc, id: parent, rating: 3, now: 0, tz: "UTC")
        let before = try #require(s.cards[parent]?.stability)
        s = grade(s, encompassing: enc, id: child.id, rating: 3, now: DAY_MS, tz: "UTC")
        let after = try #require(s.cards[parent])
        #expect(after.stability! > before)
        #expect((after.firedCredit ?? 0) > 0)
    }
}
