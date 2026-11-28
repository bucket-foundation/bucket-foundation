import Foundation
import Observation

public struct AccountChoice: Sendable, Equatable, Identifiable {
    public let userId: String
    public let label: String
    public let shortId: String
    public let initial: String
    public let active: Bool
    public var id: String { userId }
}

public struct AccountSwitch: Sendable {
    let index: AccountIndex
    let items: SecretItems

    public init(index: AccountIndex, items: SecretItems) {
        self.index = index
        self.items = items
    }

    public var choices: [AccountChoice] {
        let active = index.activeUserId
        return index.rows.sorted { $0.lastActive > $1.lastActive }.map { row in
            AccountChoice(userId: row.userId, label: row.label, shortId: String(row.userId.prefix(8)), initial: row.label.isEmpty ? String(row.userId.prefix(1)).uppercased() : row.initial, active: row.userId == active)
        }
    }

    public var canAdd: Bool { !index.isFull }

    @discardableResult
    public func select(_ userId: String, now: Date = .now) -> Bool {
        guard index.rows.contains(where: { $0.userId == userId }), items.state(SessionItem.user(userId)) == .present else { return false }
        index.upsert(userId: userId, now: now)
        index.activate(userId)
        return true
    }

    @discardableResult
    public func add() -> Bool {
        guard canAdd else { return false }
        index.activate(nil)
        return true
    }
}

@MainActor
@Observable
public final class AccountHost {
    public private(set) var generation = 0
    public private(set) var choices: [AccountChoice] = []
    public private(set) var canAdd = false
    public private(set) var switching = false
    @ObservationIgnored let switcher: AccountSwitch
    @ObservationIgnored let rebuild: @MainActor () async -> Void

    public init(switcher: AccountSwitch, rebuild: @escaping @MainActor () async -> Void) {
        self.switcher = switcher
        self.rebuild = rebuild
        refresh()
    }

    public func refresh() {
        choices = switcher.choices
        canAdd = switcher.canAdd
    }

    @discardableResult
    public func open(_ userId: String) async -> Bool {
        guard !switching, choices.first(where: { $0.active })?.userId != userId, switcher.select(userId) else { return false }
        await reload()
        return true
    }

    @discardableResult
    public func add() async -> Bool {
        guard !switching, switcher.add() else { return false }
        await reload()
        return true
    }

    public func afterSignOut() {
        Task { await reload() }
    }

    @ObservationIgnored private var queued = false

    public func reload() async {
        guard !switching else {
            queued = true
            return
        }
        switching = true
        repeat {
            queued = false
            await rebuild()
            generation += 1
        } while queued
        refresh()
        switching = false
    }
}
