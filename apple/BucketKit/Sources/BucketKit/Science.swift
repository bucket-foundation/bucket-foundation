import Foundation

public func toFixed(_ x: Double, _ digits: Int) -> Double {
    guard x.isFinite, abs(x) < 1e21 else { return x }
    guard x.isNormal else { return 0 }
    let a = abs(x)
    let sig = UInt128(a.significandBitPattern | (1 << 52))
    var scale: UInt128 = 1
    for _ in 0..<digits { scale *= 10 }
    let n = sig * scale
    let shift = 52 - Int(a.exponent)
    var q: UInt128
    if shift <= 0 {
        q = n << UInt128(-shift)
    } else if shift >= 120 {
        q = 0
    } else {
        q = n >> UInt128(shift)
        let r = n - (q << UInt128(shift))
        if r >= (UInt128(1) << UInt128(shift - 1)) { q += 1 }
    }
    let v = Double(q) / Double(scale)
    return x < 0 ? -v : v
}

public struct EncEdge: Sendable, Equatable, Hashable {
    public let id: String
    public let weight: Double
    public let dist: Int
}

public struct FirePatch: Sendable, Equatable {
    public let id: String
    public let stability: Double
    public let due: Double
    public let credit: Double
    public let weight: Double
}

public struct RouteItem: Sendable, Equatable, Hashable {
    public enum Kind: String, Sendable { case review, new }
    public let id: String
    public let kind: Kind
    public let due: Double?
}

public struct ScienceSummary: Sendable, Equatable {
    public let total: Int
    public let introduced: Int
    public let mastered: Int
    public let dueCount: Int
    public let xp: Double
    public let streak: Double
}

public let masteredThreshold = 0.7
public let depthOrder = ["recall", "apply", "derive", "teach"]

func indexById(_ atoms: [Atom]) -> [String: Int] {
    var out: [String: Int] = [:]
    for (i, a) in atoms.enumerated() { out[a.id] = i }
    return out
}

public func withLeverage(_ atoms: [Atom]) -> [Atom] {
    var out = atoms.map { a -> Atom in
        var b = a
        b.unlocks = []
        return b
    }
    let byId = indexById(out)
    for i in out.indices {
        let id = out[i].id
        for r in out[i].requires {
            if let p = byId[r], !out[p].unlocks.contains(id) { out[p].unlocks.append(id) }
        }
    }
    func descendants(_ id: String, _ seen: inout Set<String>) {
        guard let i = byId[id] else { return }
        for u in out[i].unlocks where !seen.contains(u) {
            seen.insert(u)
            descendants(u, &seen)
        }
    }
    var reach: [Double] = []
    var top = 1.0
    for a in out {
        var seen = Set<String>()
        descendants(a.id, &seen)
        let r = Double(seen.count) + Double(a.unlocks.count) * 0.5
        reach.append(r)
        top = max(top, r)
    }
    for i in out.indices { out[i].leverage = toFixed(reach[i] / top, 3) }
    return out
}

public func buildEncompassingMap(_ atoms: [Atom]) -> [String: [EncEdge]] {
    let byId = indexById(atoms)
    var map: [String: [EncEdge]] = [:]
    for a in atoms {
        var order: [String] = []
        var best: [String: Int] = [:]
        var frontier = a.requires.map { ($0, 1) }
        while !frontier.isEmpty {
            var next: [(String, Int)] = []
            for (id, d) in frontier {
                if id == a.id { continue }
                if let prev = best[id], prev <= d { continue }
                if best[id] == nil { order.append(id) }
                best[id] = d
                if d >= Adaptive.encompassMaxHops { continue }
                guard let p = byId[id] else { continue }
                for r2 in atoms[p].requires { next.append((r2, d + 1)) }
            }
            frontier = next
        }
        var edges: [EncEdge] = []
        for pid in order {
            let d = best[pid]!
            guard byId[pid] != nil else { continue }
            let w = Adaptive.encompassBase * pow(Adaptive.encompassDecay, Double(d - 1))
            if w >= Adaptive.encompassMin { edges.append(EncEdge(id: pid, weight: toFixed(w, 4), dist: d)) }
        }
        map[a.id] = stableSorted(edges) { $0.weight > $1.weight }
    }
    return map
}

func stableSorted<T>(_ xs: [T], by before: (T, T) -> Bool) -> [T] {
    xs.enumerated().sorted { l, r in
        if before(l.element, r.element) { return true }
        if before(r.element, l.element) { return false }
        return l.offset < r.offset
    }.map(\.element)
}

public func fireCredits(_ edges: [EncEdge], _ cards: OrderedMap<Card>, _ fsrs: FSRS, now: Double, ratingScore: Double) -> [FirePatch] {
    var patches: [FirePatch] = []
    for e in edges {
        guard let card = cards[e.id], let stability = card.stability, card.state != "new" else { continue }
        let elapsed = max(0, (now - or(card.lastReview, now)) / DAY_MS)
        let r = fsrs.retrievability(elapsed, stability)
        if r < Adaptive.fireMinRetrievability { continue }
        let credit = min(Adaptive.fireMaxCredit, e.weight * Adaptive.fireMaxCredit) * ratingScore
        if credit <= 0 { continue }
        let gain = min(Adaptive.fireMaxStabilityGain, credit * Adaptive.fireMaxStabilityGain)
        let newS = stability * (1 + gain)
        let ivl = fsrs.interval(newS)
        let newDue = max(or(card.due, 0), or(card.lastReview, now) + ivl * DAY_MS)
        patches.append(FirePatch(id: e.id, stability: toFixed(newS, 4), due: newDue, credit: toFixed(credit, 4), weight: e.weight))
    }
    return patches
}

let shellRank: [String: Int] = ["prereq": 0, "nucleus": 1, "frontier": 2]

func unlocked(_ atom: Atom, _ cards: OrderedMap<Card>) -> Bool {
    atom.requires.allSatisfy { cards.has($0) }
}

public func route(_ state: EngineState, _ atoms: [Atom], now: Double, tz: TimeZone = .current) -> [RouteItem] {
    let ids = Set(atoms.map(\.id))
    var due: [RouteItem] = []
    for (id, c) in state.cards.entries {
        if let d = c.due, d <= now, ids.contains(id) { due.append(RouteItem(id: id, kind: .review, due: d)) }
    }
    due = stableSorted(due) { ($0.due ?? 0) < ($1.due ?? 0) }
    let introducedToday = state.history[dayKey(now, tz: tz)]?.new ?? 0
    let budget = max(0, or(state.newPerDay, 4) - introducedToday)
    let rank = { (a: Atom) in shellRank[a.shell ?? "nucleus"] ?? 1 }
    let fresh = stableSorted(atoms.filter { !state.cards.has($0.id) && unlocked($0, state.cards) }) { a, b in
        let ra = rank(a), rb = rank(b)
        if ra != rb { return ra < rb }
        return (a.leverage ?? 0) > (b.leverage ?? 0)
    }
    return due + fresh.prefix(Int(budget)).map { RouteItem(id: $0.id, kind: .new, due: nil) }
}

func clamp01(_ x: Double) -> Double { x < 0 ? 0 : x > 1 ? 1 : x }

func masteryFromStability(_ s: Double?) -> Double {
    guard let s else { return 0 }
    return max(0, min(1, 1 - exp(-s / 21)))
}

func horizonRetrievability(_ t: Double, _ s: Double) -> Double {
    if s == 0 || s.isNaN || s <= 0 { return 0 }
    return pow(1 + FSRS.factor * (t / s), FSRS.decay)
}

func proficiencyScore(_ p: Proficiency?) -> Double {
    guard let p, p.n != 0, !p.n.isNaN else { return 0 }
    return clamp01(1 / (1 + exp(-(p.theta - Adaptive.profDepthB["apply"]!))))
}

func retentionAtHorizon(_ s: Double?) -> Double {
    guard let s, s != 0, !s.isNaN, s > 0 else { return 0 }
    return clamp01(horizonRetrievability(90, s))
}

func fuseMastery(_ p: Double, _ r: Double) -> Double {
    let p = clamp01(p), r = clamp01(r)
    if p <= 0 || r <= 0 { return 0 }
    return clamp01(p * r)
}

public func fusedConceptMastery(_ card: Card?, _ prof: Proficiency?) -> Double {
    guard let card else { return 0 }
    guard let prof, prof.n != 0, !prof.n.isNaN else { return masteryFromStability(card.stability) }
    return fuseMastery(proficiencyScore(prof), retentionAtHorizon(card.stability))
}

public func masteryFor(_ state: EngineState, _ id: String) -> Double {
    fusedConceptMastery(state.cards[id], state.prof[id])
}

public func pickLevel(_ state: EngineState, _ atom: Atom) -> String {
    let m = masteryFor(state, atom.id)
    let have = atom.quiz.map(\.level)
    let target = m < 0.25 ? "recall" : m < 0.5 ? "apply" : m < 0.75 ? "derive" : "teach"
    var k = depthOrder.firstIndex(of: target)!
    while k >= 0 {
        if have.contains(depthOrder[k]) { return depthOrder[k] }
        k -= 1
    }
    return have.first ?? "recall"
}

public func summary(_ state: EngineState, _ atoms: [Atom], now: Double) -> ScienceSummary {
    var introduced = 0, mastered = 0, dueCount = 0
    for a in atoms {
        guard let c = state.cards[a.id] else { continue }
        introduced += 1
        if masteryFor(state, a.id) >= masteredThreshold { mastered += 1 }
        if let d = c.due, d <= now { dueCount += 1 }
    }
    return ScienceSummary(total: atoms.count, introduced: introduced, mastered: mastered, dueCount: dueCount, xp: or(state.xp, 0), streak: or(state.streak, 0))
}
