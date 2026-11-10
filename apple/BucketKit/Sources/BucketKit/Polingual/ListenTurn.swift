public struct ListenTurn<ID: Hashable & Sendable>: Equatable, Sendable {
    public private(set) var ids: [ID] = []

    public init() {}

    public mutating func expect(_ ids: [ID]) { self.ids = ids }
    public mutating func clear() { ids = [] }

    public func owns(_ id: ID) -> Bool { ids.contains(id) }
    public func leads(_ id: ID) -> Bool { ids.first == id }

    public mutating func finished(_ id: ID) -> Bool {
        guard let last = ids.last, last == id else { return false }
        ids = []
        return true
    }
}
