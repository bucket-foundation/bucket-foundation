import CoreGraphics
import Foundation
import Observation

public enum GroupKind: String, Codable, Sendable, CaseIterable {
    case family, friends

    public var capacity: Int { self == .family ? 6 : 30 }
}

public enum GroupRole: String, Codable, Sendable {
    case owner, member
}

extension KeyedDecodingContainer {
    func value<T: Decodable>(_ key: Key, _ fallback: T) -> T {
        ((try? decodeIfPresent(T.self, forKey: key)) ?? nil) ?? fallback
    }
}

public struct MemberLanguage: Codable, Equatable, Sendable, Identifiable {
    public var lang: String
    public var learned: Int
    public var mastered: Int
    public var strength: Double?
    public var id: String { lang }

    public init(lang: String, learned: Int, mastered: Int, strength: Double? = nil) {
        self.lang = lang
        self.learned = learned
        self.mastered = mastered
        self.strength = strength
    }

    public var shownStrength: Double { strength ?? (learned > 0 ? Double(mastered) / Double(learned) : 0) }
}

public struct MemberSubject: Codable, Equatable, Sendable, Identifiable {
    public var branch: String
    public var title: String
    public var started: Int
    public var mastered: Int
    public var strength: Double?
    public var id: String { branch }

    public init(branch: String, title: String, started: Int, mastered: Int, strength: Double? = nil) {
        self.branch = branch
        self.title = title
        self.started = started
        self.mastered = mastered
        self.strength = strength
    }

    public var shownStrength: Double { strength ?? (started > 0 ? Double(mastered) / Double(started) : 0) }
}

public struct RecentWord: Codable, Equatable, Sendable, Identifiable {
    public var lang: String
    public var form: String
    public var gloss: String
    public var learnedAt: String?
    public var id: String { "\(lang):\(form)" }
    public var learnedDay: Date? { learnedAt.flatMap(parseInstant) }

    public init(lang: String, form: String, gloss: String, learnedAt: String? = nil) {
        self.lang = lang
        self.form = form
        self.gloss = gloss
        self.learnedAt = learnedAt
    }
}

public struct MemberSet: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var root: String
    public var targets: [String]

    public init(id: String, name: String, root: String, targets: [String]) {
        self.id = id
        self.name = name
        self.root = root
        self.targets = targets
    }
}

public struct GroupMember: Codable, Equatable, Sendable, Identifiable {
    public var userId: String
    public var name: String
    public var role: GroupRole
    public var isMe: Bool
    public var streak: Int
    public var todayReviews: Int
    public var weekReviews: Int
    public var lastActivity: String?
    public var languages: [MemberLanguage]
    public var subjects: [MemberSubject]
    public var recentWords: [RecentWord]
    public var sets: [MemberSet]
    public var id: String { userId }

    public init(userId: String, name: String, role: GroupRole, isMe: Bool, streak: Int, todayReviews: Int, weekReviews: Int = 0, lastActivity: String?, languages: [MemberLanguage], subjects: [MemberSubject], recentWords: [RecentWord] = [], sets: [MemberSet] = []) {
        self.userId = userId
        self.name = name
        self.role = role
        self.isMe = isMe
        self.streak = streak
        self.todayReviews = todayReviews
        self.weekReviews = weekReviews
        self.lastActivity = lastActivity
        self.languages = languages
        self.subjects = subjects
        self.recentWords = recentWords
        self.sets = sets
    }

    enum CodingKeys: String, CodingKey {
        case userId, name, role, isMe, streak, todayReviews, weekReviews, lastActivity, languages, subjects, recentWords, sets
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try c.decode(String.self, forKey: .userId)
        name = try c.decode(String.self, forKey: .name)
        role = c.value(.role, .member)
        isMe = c.value(.isMe, false)
        streak = c.value(.streak, 0)
        todayReviews = c.value(.todayReviews, 0)
        weekReviews = c.value(.weekReviews, 0)
        lastActivity = c.value(.lastActivity, nil as String?)
        languages = c.value(.languages, [])
        subjects = c.value(.subjects, [])
        recentWords = c.value(.recentWords, [])
        sets = c.value(.sets, [])
    }

    public var studiedToday: Bool { todayReviews > 0 }
    public var cheerKind: CheerKind { studiedToday ? .cheer : .nudge }

    public var lastActive: Date? { lastActivity.flatMap(parseInstant) }

    public var initials: String {
        let words = name.split(separator: " ").prefix(2)
        return words.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
}

func parseInstant(_ s: String) -> Date? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: s) { return d }
    f.formatOptions = [.withInternetDateTime]
    if let d = f.date(from: s) { return d }
    f.formatOptions = [.withFullDate]
    return f.date(from: s)
}

public struct GroupGoal: Codable, Equatable, Sendable {
    public var weekly: Int
    public var done: Int
    public var weekStart: String?

    public init(weekly: Int, done: Int, weekStart: String? = nil) {
        self.weekly = weekly
        self.done = done
        self.weekStart = weekStart
    }

    public var progress: Double { weekly > 0 ? min(1, Double(done) / Double(weekly)) : 0 }
    public static let choices = [50, 100, 200, 350, 500, 1000]
}

public enum CheerKind: String, Codable, Sendable {
    case cheer, nudge
}

public struct Cheer: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var from: String
    public var fromName: String
    public var to: String
    public var kind: CheerKind
    public var at: String
    public var seen: Bool

    public init(id: String, from: String, fromName: String, to: String, kind: CheerKind, at: String, seen: Bool) {
        self.id = id
        self.from = from
        self.fromName = fromName
        self.to = to
        self.kind = kind
        self.at = at
        self.seen = seen
    }
}

public struct LearningGroup: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var kind: GroupKind
    public var code: String
    public var role: GroupRole
    public var members: [GroupMember]
    public var goal: GroupGoal?
    public var cheers: [Cheer]

    public init(id: String, name: String, kind: GroupKind, code: String, role: GroupRole, members: [GroupMember], goal: GroupGoal? = nil, cheers: [Cheer] = []) {
        self.id = id
        self.name = name
        self.kind = kind
        self.code = code
        self.role = role
        self.members = members
        self.goal = goal
        self.cheers = cheers
    }

    enum CodingKeys: String, CodingKey { case id, name, kind, code, role, members, goal, cheers }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        kind = try c.decode(GroupKind.self, forKey: .kind)
        code = try c.decode(String.self, forKey: .code)
        role = c.value(.role, .member)
        members = try c.decode([GroupMember].self, forKey: .members)
        goal = c.value(.goal, nil as GroupGoal?)
        cheers = c.value(.cheers, [])
    }

    public var isOwner: Bool { role == .owner }
    public var isFull: Bool { members.count >= kind.capacity }
    public var me: GroupMember? { members.first(where: \.isMe) }
}

public struct GroupPreview: Decodable, Equatable, Sendable {
    public var name: String
    public var kind: GroupKind
    public var members: Int
    public var owner: String?

    public init(name: String, kind: GroupKind, members: Int, owner: String?) {
        self.name = name
        self.kind = kind
        self.members = members
        self.owner = owner
    }
}

public struct GraphNode: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var title: String
    public var strength: Double

    public init(id: String, title: String, strength: Double) {
        self.id = id
        self.title = title
        self.strength = strength
    }
}

public struct GraphEdge: Codable, Equatable, Sendable {
    public var from: String
    public var to: String

    public init(from: String, to: String) {
        self.from = from
        self.to = to
    }
}

public struct MemberGraph: Codable, Equatable, Sendable {
    public var nodes: [GraphNode]
    public var edges: [GraphEdge]

    public init(nodes: [GraphNode], edges: [GraphEdge]) {
        self.nodes = nodes
        self.edges = edges
    }

    public func layout() -> [String: CGPoint] {
        let ids = Set(nodes.map(\.id))
        let links = edges.filter { ids.contains($0.from) && ids.contains($0.to) && $0.from != $0.to }
        if !links.isEmpty { return layered(links) }
        return grid()
    }

    func layered(_ links: [GraphEdge]) -> [String: CGPoint] {
        var depth = Dictionary(nodes.map { ($0.id, 0) }, uniquingKeysWith: { a, _ in a })
        for _ in 0..<nodes.count {
            var changed = false
            for e in links where depth[e.to]! < depth[e.from]! + 1 && depth[e.from]! + 1 < nodes.count {
                depth[e.to] = depth[e.from]! + 1
                changed = true
            }
            if !changed { break }
        }
        let levels = Dictionary(grouping: nodes, by: { depth[$0.id]! })
        let rows = (levels.keys.max() ?? 0) + 1
        var out: [String: CGPoint] = [:]
        for (level, members) in levels {
            for (i, n) in members.enumerated() {
                out[n.id] = CGPoint(x: (Double(i) + 0.5) / Double(members.count), y: (Double(level) + 0.5) / Double(rows))
            }
        }
        return out
    }

    func grid() -> [String: CGPoint] {
        let cols = max(1, Int(Double(nodes.count).squareRoot().rounded(.up)))
        let rows = max(1, (nodes.count + cols - 1) / cols)
        return Dictionary(nodes.enumerated().map { i, n in
            let r = i / cols, col = i % cols
            let shift = r.isMultiple(of: 2) ? 0 : 0.5
            return (n.id, CGPoint(x: (Double(col) + 0.5 + shift * 0.5) / Double(cols), y: (Double(r) + 0.5) / Double(rows)))
        }, uniquingKeysWith: { a, _ in a })
    }
}

public enum Radar {
    public static func points(_ values: [Double], center: CGPoint, radius: Double) -> [CGPoint] {
        let n = values.count
        guard n > 0 else { return [] }
        return values.enumerated().map { i, v in
            let a = angle(i, n)
            let r = radius * min(1, max(0, v))
            return CGPoint(x: center.x + r * cos(a), y: center.y + r * sin(a))
        }
    }

    public static func angle(_ i: Int, _ n: Int) -> Double {
        -Double.pi / 2 + 2 * Double.pi * Double(i) / Double(max(n, 1))
    }

    public static func smoothPath(_ pts: [CGPoint], tension: Double = 0.5) -> CGPath {
        let path = CGMutablePath()
        guard pts.count > 2 else {
            if let f = pts.first { path.move(to: f); pts.dropFirst().forEach { path.addLine(to: $0) }; path.closeSubpath() }
            return path
        }
        let n = pts.count
        path.move(to: pts[0])
        for i in 0..<n {
            let p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
            let k = tension / 3
            let c1 = CGPoint(x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k)
            let c2 = CGPoint(x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k)
            path.addCurve(to: p2, control1: c1, control2: c2)
        }
        path.closeSubpath()
        return path
    }
}

public enum GroupInvite {
    public static let alphabet = Set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
    public static let length = 10

    public static func code(_ raw: String) -> String? {
        let s = raw.uppercased()
            .filter { !$0.isWhitespace && $0 != "-" }
            .replacingOccurrences(of: "O", with: "0")
            .replacingOccurrences(of: "I", with: "1")
            .replacingOccurrences(of: "L", with: "1")
        guard s.count == length, s.allSatisfy(alphabet.contains) else { return nil }
        return s
    }

    public static func code(from url: URL) -> String? {
        guard let c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
        let parts = c.path.split(separator: "/").map(String.init)
        guard parts == ["s", "g"] else { return nil }
        return c.queryItems?.first { $0.name == "c" }?.value.flatMap(code)
    }
}

enum Field: Encodable {
    case text(String)
    case number(Int)
    case list([String])

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .text(let s): try c.encode(s)
        case .number(let n): try c.encode(n)
        case .list(let l): try c.encode(l)
        }
    }
}

struct Ignored: Decodable {
    init(from decoder: Decoder) throws {}
}

struct GroupReply: Decodable { let group: LearningGroup }
struct GroupsReply: Decodable { let groups: [LearningGroup] }
struct CheerReply: Decodable { let cheer: Cheer }
struct GoalReply: Decodable { let goal: GroupGoal? }
struct RotateReply: Decodable {
    let code: String?
    let group: LearningGroup?
}

extension BucketAPI {
    public func groups(token: String, tz: String = TimeZone.current.identifier) async throws -> [LearningGroup] {
        let r: GroupsReply = try await groupCall("api/academy/groups", query: ["tz": tz], token: token)
        return r.groups
    }

    public func createGroup(token: String, name: String, kind: GroupKind, displayName: String) async throws -> LearningGroup {
        let r: GroupReply = try await groupCall("api/academy/groups", token: token, body: ["name": .text(name), "kind": .text(kind.rawValue), "displayName": .text(displayName)])
        return r.group
    }

    public func joinGroup(token: String, code: String, displayName: String) async throws -> LearningGroup {
        let r: GroupReply = try await groupCall("api/academy/groups/join", token: token, body: ["code": .text(code), "displayName": .text(displayName)])
        return r.group
    }

    public func leaveGroup(token: String, groupId: String) async throws {
        let _: Ignored = try await groupCall("api/academy/groups/leave", token: token, body: ["groupId": .text(groupId)])
    }

    public func removeMember(token: String, groupId: String, userId: String) async throws {
        let _: Ignored = try await groupCall("api/academy/groups/remove", token: token, body: ["groupId": .text(groupId), "userId": .text(userId)])
    }

    public func rotateInvite(token: String, groupId: String) async throws -> String {
        let r: RotateReply = try await groupCall("api/academy/groups/rotate", token: token, body: ["groupId": .text(groupId)])
        guard let code = r.code ?? r.group?.code else { throw BucketError.decoding }
        return code
    }

    public func groupPreview(code: String) async throws -> GroupPreview {
        try await groupCall("api/academy/groups/preview", query: ["code": code], token: nil)
    }

    public func memberGraph(token: String, groupId: String, userId: String, branch: String) async throws -> MemberGraph {
        try await groupCall("api/academy/groups/member", query: ["groupId": groupId, "userId": userId, "branch": branch], token: token)
    }

    public func cheer(token: String, groupId: String, to userId: String, kind: CheerKind) async throws -> Cheer {
        let r: CheerReply = try await groupCall("api/academy/groups/cheer", token: token, body: ["groupId": .text(groupId), "to": .text(userId), "kind": .text(kind.rawValue), "tz": .text(TimeZone.current.identifier)])
        return r.cheer
    }

    public func markCheersSeen(token: String, ids: [String]) async throws {
        let _: Ignored = try await groupCall("api/academy/groups/cheers/seen", token: token, body: ["ids": .list(ids)])
    }

    public func setGoal(token: String, groupId: String, weekly: Int) async throws -> GroupGoal? {
        let r: GoalReply = try await groupCall("api/academy/groups/goal", token: token, body: ["groupId": .text(groupId), "weekly": .number(weekly), "tz": .text(TimeZone.current.identifier)])
        return r.goal
    }

    func groupCall<T: Decodable>(_ path: String, query: [String: String] = [:], token: String?, body: [String: Field]? = nil) async throws -> T {
        var c = URLComponents(url: base.appending(path: path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { c.queryItems = query.keys.sorted().map { URLQueryItem(name: $0, value: query[$0]) } }
        var r = URLRequest(url: c.url!)
        r.cachePolicy = .reloadIgnoringLocalCacheData
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        if let body {
            r.httpMethod = "POST"
            r.setValue("application/json", forHTTPHeaderField: "content-type")
            r.httpBody = try JSONEncoder().encode(body)
        }
        let (data, http) = try await transport.send(r)
        guard (200..<300).contains(http.statusCode) else { throw Self.groupError(status: http.statusCode, data: data) }
        return try decodeBody(data)
    }

    static func groupError(status: Int, data: Data) -> BucketError {
        let body = (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        switch (status, body["error"]) {
        case (401, _): return .revoked
        case (404, _): return .groupNotFound
        case (409, "owned_limit"): return .ownedLimit
        case (409, "joined_limit"): return .joinedLimit
        case (409, "cheer_limit"): return .cheerLimit
        case (409, "nudge_not_needed"): return .nudgeNotNeeded
        case (409, "group_full"): return .groupFull
        case (429, _): return .rateLimited(body["message"])
        default: return .server(status, body["message"] ?? body["error"])
        }
    }
}

@MainActor
@Observable
public final class GroupStore {
    public var groups: [LearningGroup] = [] {
        didSet { version += 1 }
    }
    public private(set) var loaded = false
    public private(set) var busy = false
    public private(set) var loadError: BucketError?

    let api: BucketAPI
    let token: @MainActor () async -> String?
    @ObservationIgnored var version = 0
    @ObservationIgnored var inFlight: Task<Void, Never>?

    public init(api: BucketAPI, token: @escaping @MainActor () async -> String?) {
        self.api = api
        self.token = token
    }

    public func group(_ id: String) -> LearningGroup? { groups.first { $0.id == id } }

    public func first(_ kind: GroupKind) -> LearningGroup? {
        groups.first { $0.kind == kind && $0.isOwner } ?? groups.first { $0.kind == kind }
    }

    public var me: GroupMember? { groups.lazy.compactMap(\.me).first }

    public var people: [(member: GroupMember, groupId: String)] {
        var seen = Set<String>()
        var out: [(GroupMember, String)] = []
        for g in groups {
            for m in g.members where !m.isMe && seen.insert(m.userId).inserted { out.append((m, g.id)) }
        }
        return out
    }

    public var goals: [(group: LearningGroup, goal: GroupGoal)] {
        groups.compactMap { g in g.goal.flatMap { $0.weekly > 0 ? (g, $0) : nil } }
    }

    public var incoming: [Cheer] {
        var seen = Set<String>()
        return groups.flatMap { g in g.cheers.filter { c in !c.seen && g.me?.userId == c.to } }
            .filter { seen.insert($0.id).inserted }
            .sorted { $0.at > $1.at }
    }

    public func load() async {
        if let inFlight { return await inFlight.value }
        let task = Task { await self.fetch() }
        inFlight = task
        await task.value
        inFlight = nil
    }

    func fetch() async {
        guard let t = await token() else { return }
        let start = version
        do {
            let fresh = try await api.groups(token: t)
            loadError = nil
            guard version == start else { return }
            groups = fresh
            loaded = true
        } catch {
            loadError = error as? BucketError ?? .server(0, nil)
        }
    }

    @discardableResult
    public func create(name: String, kind: GroupKind, displayName: String) async throws(BucketError) -> LearningGroup {
        upsert(try await run { try await self.api.createGroup(token: $0, name: name, kind: kind, displayName: displayName) })
    }

    @discardableResult
    public func join(code: String, displayName: String) async throws(BucketError) -> LearningGroup {
        upsert(try await run { try await self.api.joinGroup(token: $0, code: code, displayName: displayName) })
    }

    public func leave(_ groupId: String) async throws(BucketError) {
        try await run { try await self.api.leaveGroup(token: $0, groupId: groupId) }
        groups.removeAll { $0.id == groupId }
    }

    public func remove(_ userId: String, from groupId: String) async throws(BucketError) {
        try await run { try await self.api.removeMember(token: $0, groupId: groupId, userId: userId) }
        if let i = index(groupId) { groups[i].members.removeAll { $0.userId == userId } }
    }

    @discardableResult
    public func rotate(_ groupId: String) async throws(BucketError) -> String {
        let code = try await run { try await self.api.rotateInvite(token: $0, groupId: groupId) }
        if let i = index(groupId) { groups[i].code = code }
        return code
    }

    @discardableResult
    public func cheer(_ member: GroupMember, in groupId: String) async throws(BucketError) -> Cheer {
        let kind = member.cheerKind
        let c = try await run { try await self.api.cheer(token: $0, groupId: groupId, to: member.userId, kind: kind) }
        if let i = index(groupId) { groups[i].cheers.append(c) }
        return c
    }

    public func markSeen(_ ids: [String]) async {
        guard !ids.isEmpty else { return }
        let set = Set(ids)
        for i in groups.indices {
            for j in groups[i].cheers.indices where set.contains(groups[i].cheers[j].id) { groups[i].cheers[j].seen = true }
        }
        guard let t = await token() else { return }
        try? await api.markCheersSeen(token: t, ids: ids)
    }

    public func setGoal(_ groupId: String, weekly: Int) async throws(BucketError) {
        let reply = try await run { try await self.api.setGoal(token: $0, groupId: groupId, weekly: weekly) }
        if let i = index(groupId) { groups[i].goal = reply }
    }

    public func graph(_ groupId: String, _ userId: String, branch: String) async -> MemberGraph? {
        guard let t = await token() else { return nil }
        return try? await api.memberGraph(token: t, groupId: groupId, userId: userId, branch: branch)
    }

    public func clear() {
        groups = []
        loaded = false
        loadError = nil
    }

    func index(_ groupId: String) -> Int? { groups.firstIndex { $0.id == groupId } }

    func upsert(_ g: LearningGroup) -> LearningGroup {
        if let i = index(g.id) { groups[i] = g } else { groups.append(g) }
        return g
    }

    @discardableResult
    func run<T>(_ work: @escaping (String) async throws -> T) async throws(BucketError) -> T {
        busy = true
        defer { busy = false }
        guard let t = await token() else { throw .revoked }
        do { return try await work(t) } catch {
            throw error as? BucketError ?? .server(0, nil)
        }
    }
}
