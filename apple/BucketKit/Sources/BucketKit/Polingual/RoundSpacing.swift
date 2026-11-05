import Foundation

public func spacedChecks(_ queue: [QueueEntry], gap: Int = Lang.checkGap) -> [QueueEntry] {
    var early: Set<String> = []
    while true {
        let movesUp = { (e: QueueEntry) in e.stage == .intro && early.contains(entryKey(e)) }
        let pass = spacingPass(queue.filter(movesUp) + queue.filter { !movesUp($0) }, gap: gap)
        let late = Set(pass.unplaced.map(entryKey))
        if late.isSubset(of: early) { return pass.out + pass.unplaced }
        early.formUnion(late)
    }
}

private func entryKey(_ e: QueueEntry) -> String { cardId(e.lang, e.itemId) }

private func spacingPass(_ queue: [QueueEntry], gap: Int) -> (out: [QueueEntry], unplaced: [QueueEntry]) {
    let introduced = Set(queue.filter { $0.stage == .intro }.map(entryKey))
    let paired = { (e: QueueEntry) in e.stage == .check && introduced.contains(entryKey(e)) }
    var checks: [String: QueueEntry] = [:]
    for e in queue where paired(e) && checks[entryKey(e)] == nil { checks[entryKey(e)] = e }

    let rest = queue.filter { !paired($0) }
    var out: [QueueEntry] = []
    var pending: [(at: Int, e: QueueEntry)] = []
    func flush(keep: Int) {
        while let p = pending.first, pending.count > keep, out.count - p.at - 1 >= gap {
            out.append(p.e)
            pending.removeFirst()
        }
    }
    var fillersLeft = rest.filter { $0.stage != .intro }.count
    for e in rest {
        out.append(e)
        if e.stage == .intro, let c = checks.removeValue(forKey: entryKey(e)) { pending.append((out.count - 1, c)) } else if e.stage != .intro { fillersLeft -= 1 }
        flush(keep: fillersLeft >= gap ? 0 : gap)
    }
    flush(keep: 0)
    return (out, pending.map(\.e))
}
