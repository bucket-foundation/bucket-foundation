import Foundation

public func spacedChecks(_ queue: [QueueEntry], gap: Int = Lang.checkGap) -> [QueueEntry] {
    func key(_ e: QueueEntry) -> String { cardId(e.lang, e.itemId) }
    let introduced = Set(queue.filter { $0.stage == .intro }.map(key))
    let paired = { (e: QueueEntry) in e.stage == .check && introduced.contains(key(e)) }
    var checks: [String: QueueEntry] = [:]
    for e in queue where paired(e) && checks[key(e)] == nil { checks[key(e)] = e }

    var out: [QueueEntry] = []
    var pending: [(at: Int, e: QueueEntry)] = []
    func flush() {
        while let p = pending.first, out.count - p.at - 1 >= gap {
            out.append(p.e)
            pending.removeFirst()
        }
    }
    for e in queue where !paired(e) {
        out.append(e)
        if e.stage == .intro, let c = checks.removeValue(forKey: key(e)) { pending.append((out.count - 1, c)) }
        flush()
    }
    flush()
    let deferred = Set(pending.map { key($0.e) })
    if !deferred.isEmpty {
        return spacedChecks(queue.filter { !(($0.stage == .intro || $0.stage == .check) && deferred.contains(key($0))) }, gap: gap)
    }
    return out.allSatisfy { $0.stage == .match } ? [] : out
}
