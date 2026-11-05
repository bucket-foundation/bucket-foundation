import Foundation

public struct ShareRecipient: Codable, Equatable, Hashable, Sendable {
    public var userId: String
    public var name: String

    public init(userId: String, name: String) {
        self.userId = userId
        self.name = name
    }
}

public struct ShareTarget: Codable, Equatable, Hashable, Sendable, Identifiable {
    public enum Kind: String, Codable, Sendable {
        case person, family, friends
    }

    public var conversationId: String
    public var groupId: String
    public var userId: String?
    public var name: String
    public var kind: Kind
    public var recipients: [ShareRecipient]
    public var id: String { conversationId }

    public init(groupId: String, userId: String? = nil, name: String, kind: Kind, recipients: [ShareRecipient]) {
        conversationId = ShareTargets.conversationId(groupId: groupId, userId: userId)
        self.groupId = groupId
        self.userId = userId
        self.name = name
        self.kind = kind
        self.recipients = recipients
    }

    public var isGroup: Bool { kind != .person }

    public var initials: String {
        let words = name.split(separator: " ").prefix(2)
        let s = words.compactMap { $0.first.map(String.init) }.joined().uppercased()
        return s.isEmpty ? "?" : s
    }
}

public enum ShareTargets {
    public static let separator: Character = "/"
    public static let limit = 24

    public static func conversationId(groupId: String, userId: String?) -> String {
        userId.map { "\(groupId)\(separator)\($0)" } ?? groupId
    }

    public static func parse(_ conversationId: String) -> (groupId: String, userId: String?)? {
        let parts = conversationId.split(separator: separator, omittingEmptySubsequences: false).map(String.init)
        switch parts.count {
        case 1 where !parts[0].isEmpty: return (parts[0], nil)
        case 2 where !parts[0].isEmpty && !parts[1].isEmpty: return (parts[0], parts[1])
        default: return nil
        }
    }

    public static func group(_ g: LearningGroup) -> ShareTarget? {
        let others = g.members.filter { !$0.isMe }
        guard !others.isEmpty else { return nil }
        return ShareTarget(groupId: g.id, name: g.name, kind: g.kind == .family ? .family : .friends, recipients: others.map { ShareRecipient(userId: $0.userId, name: $0.name) })
    }

    public static func person(_ m: GroupMember, in groupId: String) -> ShareTarget? {
        guard !m.isMe else { return nil }
        return ShareTarget(groupId: groupId, userId: m.userId, name: m.name, kind: .person, recipients: [ShareRecipient(userId: m.userId, name: m.name)])
    }

    public static func build(_ groups: [LearningGroup], limit: Int = limit) -> [ShareTarget] {
        let ordered = groups.filter { $0.kind == .family } + groups.filter { $0.kind != .family }
        var people: [ShareTarget] = []
        var seen = Set<String>()
        for g in ordered {
            for m in g.members where !m.isMe && seen.insert(m.userId).inserted {
                if let t = person(m, in: g.id) { people.append(t) }
            }
        }
        return Array((ordered.compactMap(group) + people).prefix(limit))
    }

    public static func find(_ conversationId: String, in targets: [ShareTarget]) -> ShareTarget? {
        targets.first { $0.conversationId == conversationId }
    }
}

public struct ShareDonationPlan: Equatable, Sendable {
    public var donate: [ShareTarget]
    public var forget: [String]

    public static let refresh: TimeInterval = 12 * 3600

    public static func make(old: [ShareTarget], new: [ShareTarget], lastDonated: Date?, now: Date, donate: Bool) -> ShareDonationPlan {
        let keep = Set(new.map(\.conversationId))
        let forget = old.map(\.conversationId).filter { !keep.contains($0) }
        guard donate else { return ShareDonationPlan(donate: [], forget: forget) }
        let stale = lastDonated.map { now.timeIntervalSince($0) >= refresh } ?? true
        let before = Set(old)
        return ShareDonationPlan(donate: stale ? new : new.filter { !before.contains($0) }, forget: forget)
    }
}

public struct ShareTargetCache: Sendable {
    public let suite: String?
    static let key = "share.targets"
    static let donatedKey = "share.donated"

    public init(suite: String?) { self.suite = suite }

    var defaults: UserDefaults? { suite.map { UserDefaults(suiteName: $0) } ?? .standard }

    public func load() -> [ShareTarget] {
        guard let data = defaults?.data(forKey: Self.key) else { return [] }
        return (try? JSONDecoder().decode([ShareTarget].self, from: data)) ?? []
    }

    public func save(_ targets: [ShareTarget]) {
        defaults?.set(try? JSONEncoder().encode(targets), forKey: Self.key)
    }

    public var lastDonated: Date? {
        get { defaults?.object(forKey: Self.donatedKey) as? Date }
        nonmutating set { defaults?.set(newValue, forKey: Self.donatedKey) }
    }

    public func clear() {
        defaults?.removeObject(forKey: Self.key)
        defaults?.removeObject(forKey: Self.donatedKey)
    }
}
