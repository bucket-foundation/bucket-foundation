import CoreGraphics
import Foundation
import Testing
@testable import BucketKit

nonisolated(unsafe) let groupJSON: [String: Any] = [
    "id": "g1", "name": "Rossi family", "kind": "family", "code": "7K3M9QX2PD", "role": "owner",
    "members": [
        [
            "userId": "u1", "name": "Gia", "role": "owner", "isMe": true, "streak": 12, "todayReviews": 30,
            "lastActivity": "2026-10-28T09:15:00.000Z",
            "languages": [["lang": "it", "learned": 420, "mastered": 160], ["lang": "es", "learned": 90, "mastered": 12]],
            "subjects": [["branch": "01-mathematics", "title": "Mathematics", "started": 14, "mastered": 3]],
        ],
        [
            "userId": "u2", "name": "Nonna", "role": "member", "isMe": false, "streak": 0, "todayReviews": 0,
            "lastActivity": NSNull(), "languages": [], "subjects": [],
        ],
    ],
]

struct SlowListTransport: Transport {
    let listed: Data
    let joined: Data
    let released: LockedBox<Bool>

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let ok = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
        if request.httpMethod == "POST" { return (joined, ok) }
        while !released.value { try await Task.sleep(for: .milliseconds(10)) }
        return (listed, ok)
    }
}

func goalReply(_ r: URLRequest) -> Data {
    let o = (try? JSONSerialization.jsonObject(with: r.httpBody ?? Data()) as? [String: Any]) ?? [:]
    let weekly = o["weekly"] as? Int ?? 0
    return weekly > 0 ? json(["goal": ["weekly": weekly, "done": 150, "weekStart": "2026-10-26"]]) : json(["goal": NSNull()])
}

func body(_ r: URLRequest) -> [String: String] {
    guard let b = r.httpBody, let o = try? JSONSerialization.jsonObject(with: b) as? [String: String] else { return [:] }
    return o
}

@Suite struct GroupDecodingTests {
    @Test func groupDecodesMembersWithSummaries() throws {
        let g = try JSONDecoder().decode(LearningGroup.self, from: json(groupJSON))
        #expect(g.kind == .family && g.role == .owner && g.isOwner)
        #expect(g.members.count == 2)
        let me = try #require(g.members.first)
        #expect(me.isMe && me.streak == 12 && me.todayReviews == 30)
        #expect(me.languages.map(\.lang) == ["it", "es"])
        #expect(me.languages[0].mastered == 160)
        #expect(me.subjects.first?.title == "Mathematics")
        #expect(me.lastActive != nil)
        #expect(g.members[1].lastActivity == nil && g.members[1].lastActive == nil)
        #expect(!g.isFull)
    }

    @Test func previewCountsMembers() throws {
        let p = try JSONDecoder().decode(GroupPreview.self, from: json(["name": "Rossi family", "kind": "family", "members": 3, "owner": "Gia"]))
        #expect(p == GroupPreview(name: "Rossi family", kind: .family, members: 3, owner: "Gia"))
    }

    @Test func phaseOneRepliesDecodeWithPhaseTwoDefaults() throws {
        let g = try JSONDecoder().decode(LearningGroup.self, from: json(groupJSON))
        #expect(g.goal == nil && g.cheers.isEmpty)
        #expect(g.members[0].recentWords.isEmpty && g.members[0].sets.isEmpty && g.members[0].weekReviews == 0)
        #expect(g.members[0].languages[0].strength == nil)
        #expect(abs(g.members[0].languages[0].shownStrength - 160.0 / 420.0) < 1e-9)
    }

    @Test func phaseTwoFieldsDecode() throws {
        var raw = groupJSON
        var me = (raw["members"] as! [[String: Any]])[0]
        me["weekReviews"] = 140
        me["languages"] = [["lang": "it", "learned": 420, "mastered": 160, "strength": 0.72]]
        me["subjects"] = [["branch": "01-mathematics", "title": "Mathematics", "started": 14, "mastered": 3, "strength": 0.4]]
        me["recentWords"] = [["lang": "it", "form": "notte", "gloss": "night", "learnedAt": "2026-10-28"]]
        me["sets"] = [["id": "s1", "name": "Romance", "root": "en", "targets": ["it", "es"]]]
        raw["members"] = [me]
        raw["goal"] = ["weekly": 200, "done": 150, "weekStart": "2026-10-26"]
        raw["cheers"] = [["id": "c1", "from": "u2", "fromName": "Marco", "to": "u1", "kind": "nudge", "at": "2026-10-28T09:00:00Z", "seen": false]]
        let g = try JSONDecoder().decode(LearningGroup.self, from: json(raw))
        let m = try #require(g.members.first)
        #expect(m.weekReviews == 140)
        #expect(m.languages[0].shownStrength == 0.72)
        #expect(m.subjects[0].strength == 0.4)
        #expect(m.recentWords.first?.form == "notte")
        #expect(m.recentWords.first?.learnedDay != nil)
        #expect(m.sets.first?.targets == ["it", "es"])
        #expect(g.goal?.progress == 0.75)
        #expect(g.cheers.first?.kind == .nudge && g.cheers.first?.fromName == "Marco")
    }

    @Test func graphDecodesAndLaysOutInLayers() throws {
        let g = try JSONDecoder().decode(MemberGraph.self, from: json(["nodes": [["id": "a", "title": "A", "strength": 0.2], ["id": "b", "title": "B", "strength": 0.9], ["id": "c", "title": "C", "strength": 0.4]], "edges": [["from": "a", "to": "b"], ["from": "b", "to": "c"], ["from": "a", "to": "c"]]]))
        #expect(g.edges.count == 3)
        let p = g.layout()
        #expect(p["a"]!.y < p["b"]!.y && p["b"]!.y < p["c"]!.y)
        let words = MemberGraph(nodes: (0..<9).map { GraphNode(id: "\($0)", title: "w", strength: 0.5) }, edges: [])
        let grid = words.layout()
        #expect(grid.count == 9)
        #expect(grid.values.allSatisfy { (0...1).contains($0.x) && (0...1).contains($0.y) })
        #expect(Set(grid.values.map { "\($0.x),\($0.y)" }).count == 9)
    }
}

@Suite struct GroupInviteTests {
    @Test func parsesTheShareLink() {
        #expect(GroupInvite.code(from: URL(string: "https://www.bucket.foundation/s/g?c=7K3M9QX2PD&n=Rossi%20family&k=family")!) == "7K3M9QX2PD")
        #expect(GroupInvite.code(from: URL(string: "https://www.bucket.foundation/s/g?n=x")!) == nil)
        #expect(GroupInvite.code(from: URL(string: "https://www.bucket.foundation/s/w?c=7K3M9QX2PD")!) == nil)
    }

    @Test func normalizesLikeTheServer() {
        #expect(GroupInvite.code(" 7k3m-9qx2-pd\n") == "7K3M9QX2PD")
        #expect(GroupInvite.code("7K3M9QX2PO") == "7K3M9QX2P0")
        #expect(GroupInvite.code("7K3M9QX2Pi") == "7K3M9QX2P1")
        #expect(GroupInvite.code("7K3M9QX2PL") == "7K3M9QX2P1")
        #expect(GroupInvite.code("7K3M9QX2P") == nil)
        #expect(GroupInvite.code("7K3M9QX2PU") == nil)
    }
}

@Suite struct GroupAPITests {
    @Test func listSendsTheTokenAndDecodes() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            return (200, json(["groups": [groupJSON]]))
        }, cacheDir: nil)
        let groups = try await api.groups(token: "tok")
        #expect(groups.first?.name == "Rossi family")
        let r = try #require(seen.value.first)
        #expect(r.url?.path == "/api/academy/groups")
        #expect(r.url?.query == "tz=\(TimeZone.current.identifier.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)")
        #expect(r.httpMethod == "GET")
        #expect(r.value(forHTTPHeaderField: "authorization") == "Bearer tok")
    }

    @Test func writesUseTheContractFieldNames() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            switch r.url!.path {
            case "/api/academy/groups/rotate": return (200, json(["code": "AAAAAAAAAA"]))
            case "/api/academy/groups/leave", "/api/academy/groups/remove": return (200, json(["ok": true]))
            default: return (200, json(["group": groupJSON]))
            }
        }, cacheDir: nil)
        _ = try await api.createGroup(token: "t", name: "Rossi family", kind: .family, displayName: "Gia")
        _ = try await api.joinGroup(token: "t", code: "7K3M9QX2PD", displayName: "Lu")
        try await api.leaveGroup(token: "t", groupId: "g1")
        try await api.removeMember(token: "t", groupId: "g1", userId: "u2")
        #expect(try await api.rotateInvite(token: "t", groupId: "g1") == "AAAAAAAAAA")
        let r = seen.value
        #expect(r.map { $0.url!.path } == ["/api/academy/groups", "/api/academy/groups/join", "/api/academy/groups/leave", "/api/academy/groups/remove", "/api/academy/groups/rotate"])
        #expect(r.allSatisfy { $0.httpMethod == "POST" })
        #expect(body(r[0]) == ["name": "Rossi family", "kind": "family", "displayName": "Gia"])
        #expect(body(r[1]) == ["code": "7K3M9QX2PD", "displayName": "Lu"])
        #expect(body(r[2]) == ["groupId": "g1"])
        #expect(body(r[3]) == ["groupId": "g1", "userId": "u2"])
        #expect(body(r[4]) == ["groupId": "g1"])
    }

    @Test func rotateAcceptsAGroupReply() async throws {
        let api = BucketAPI(transport: StubTransport { _ in (200, json(["group": groupJSON])) }, cacheDir: nil)
        #expect(try await api.rotateInvite(token: "t", groupId: "g1") == "7K3M9QX2PD")
    }

    @Test func previewNeedsNoToken() async throws {
        let seen = LockedBox<URLRequest?>(nil)
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0 = r }
            return (200, json(["name": "Rossi family", "kind": "family", "members": 2, "owner": "Gia"]))
        }, cacheDir: nil)
        let p = try await api.groupPreview(code: "7K3M9QX2PD")
        #expect(p.owner == "Gia")
        let r = try #require(seen.value)
        #expect(r.url?.path == "/api/academy/groups/preview")
        #expect(r.url?.query == "code=7K3M9QX2PD")
        #expect(r.value(forHTTPHeaderField: "authorization") == nil)
    }

    @Test(arguments: [
        (404, BucketError.groupNotFound),
        (401, BucketError.revoked),
        (403, BucketError.server(403, "owner_only")),
    ])
    func mapsRefusals(status: Int, expected: BucketError) async {
        let api = BucketAPI(transport: StubTransport { _ in (status, json(["error": "owner_only"])) }, cacheDir: nil)
        await #expect(throws: expected) { try await api.joinGroup(token: "t", code: "7K3M9QX2PD", displayName: "Lu") }
    }

    @Test(arguments: [
        ("group_full", BucketError.groupFull),
        ("owned_limit", BucketError.ownedLimit),
        ("joined_limit", BucketError.joinedLimit),
        ("cheer_limit", BucketError.cheerLimit),
        ("nudge_not_needed", BucketError.nudgeNotNeeded),
        ("something_new", BucketError.server(409, "something_new")),
    ])
    func mapsConflictCodes(code: String, expected: BucketError) {
        #expect(BucketAPI.groupError(status: 409, data: json(["error": code])) == expected)
    }

    @Test func socialCallsUseTheContract() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            switch r.url!.path {
            case "/api/academy/groups/cheer": return (200, json(["cheer": ["id": "c9", "from": "u1", "fromName": "Gia", "to": "u2", "kind": "cheer", "at": "2026-10-28T10:00:00Z", "seen": false]]))
            case "/api/academy/groups/member": return (200, json(["nodes": [["id": "a", "title": "A", "strength": 0.5]], "edges": []]))
            case "/api/academy/groups/goal": return (200, json(["goal": ["weekly": 200, "done": 0, "weekStart": "2026-10-26"]]))
            default: return (200, json(["ok": true]))
            }
        }, cacheDir: nil)
        let c = try await api.cheer(token: "t", groupId: "g1", to: "u2", kind: .cheer)
        #expect(c.id == "c9")
        try await api.markCheersSeen(token: "t", ids: ["c1", "c2"])
        #expect(try await api.setGoal(token: "t", groupId: "g1", weekly: 200)?.weekly == 200)
        let graph = try await api.memberGraph(token: "t", groupId: "g1", userId: "u2", branch: "02-physics")
        #expect(graph.nodes.count == 1)
        let r = seen.value
        let bodies = r.prefix(3).map { try! JSONSerialization.jsonObject(with: $0.httpBody!) as! NSDictionary }
        let tz = TimeZone.current.identifier
        #expect(bodies[0] == ["groupId": "g1", "to": "u2", "kind": "cheer", "tz": tz])
        #expect(bodies[1] == ["ids": ["c1", "c2"]])
        #expect(bodies[2] == ["groupId": "g1", "weekly": 200, "tz": tz])
        #expect(r[1].url?.path == "/api/academy/groups/cheers/seen")
        #expect(r[2].url?.path == "/api/academy/groups/goal")
        #expect(r[3].httpMethod == "GET")
        #expect(r[3].url?.query == "branch=02-physics&groupId=g1&userId=u2")
        #expect(r[3].value(forHTTPHeaderField: "authorization") == "Bearer t")
    }
}

@Suite struct RadarTests {
    @Test func spokesStartAtTopAndGoClockwise() {
        let p = Radar.points([1, 1, 1, 1], center: .zero, radius: 10)
        #expect(abs(p[0].x) < 1e-9 && abs(p[0].y + 10) < 1e-9)
        #expect(abs(p[1].x - 10) < 1e-9 && abs(p[1].y) < 1e-9)
        #expect(abs(p[2].y - 10) < 1e-9)
    }

    @Test func strengthIsClampedToTheCircle() {
        let p = Radar.points([2, -1, 0.5], center: CGPoint(x: 5, y: 5), radius: 4)
        #expect(abs(hypot(p[0].x - 5, p[0].y - 5) - 4) < 1e-9)
        #expect(abs(hypot(p[1].x - 5, p[1].y - 5)) < 1e-9)
        #expect(abs(hypot(p[2].x - 5, p[2].y - 5) - 2) < 1e-9)
    }

    @Test func smoothShapePassesThroughEveryPoint() {
        let pts = Radar.points([0.8, 0.3, 0.6, 0.9, 0.5], center: .zero, radius: 100)
        let path = Radar.smoothPath(pts)
        #expect(!path.isEmpty)
        let box = path.boundingBoxOfPath
        for q in pts { #expect(box.insetBy(dx: -0.01, dy: -0.01).contains(q)) }
    }
}

@MainActor
@Suite struct GroupStoreTests {
    @Test func joinLeaveRemoveAndRotateUpdateTheList() async throws {
        let api = BucketAPI(transport: StubTransport { r in
            switch r.url!.path {
            case "/api/academy/groups/rotate": (200, json(["code": "BBBBBBBBBB"]))
            case "/api/academy/groups/leave", "/api/academy/groups/remove": (200, json(["ok": true]))
            case "/api/academy/groups/join": (200, json(["group": groupJSON]))
            default: (200, json(["groups": []]))
            }
        }, cacheDir: nil)
        let store = GroupStore(api: api, token: { "tok" })
        await store.load()
        #expect(store.loaded && store.groups.isEmpty)
        try await store.join(code: "7K3M9QX2PD", displayName: "Gia")
        try await store.join(code: "7K3M9QX2PD", displayName: "Gia")
        #expect(store.groups.count == 1)
        #expect(store.first(.family)?.id == "g1")
        #expect(store.first(.friends) == nil)
        try await store.remove("u2", from: "g1")
        #expect(store.group("g1")?.members.count == 1)
        #expect(try await store.rotate("g1") == "BBBBBBBBBB")
        #expect(store.group("g1")?.code == "BBBBBBBBBB")
        try await store.leave("g1")
        #expect(store.groups.isEmpty)
    }

    @Test func cheersGoalsAndPeople() async throws {
        var raw = groupJSON
        raw["cheers"] = [
            ["id": "c1", "from": "u2", "fromName": "Nonna", "to": "u1", "kind": "nudge", "at": "2026-10-28T09:00:00Z", "seen": false],
            ["id": "c0", "from": "u2", "fromName": "Nonna", "to": "u1", "kind": "cheer", "at": "2026-10-27T09:00:00Z", "seen": true],
            ["id": "c2", "from": "u1", "fromName": "Gia", "to": "u2", "kind": "cheer", "at": "2026-10-28T09:30:00Z", "seen": false],
        ]
        let listed = json(["groups": [raw]])
        let api = BucketAPI(transport: StubTransport { r in
            switch r.url!.path {
            case "/api/academy/groups/goal": (200, goalReply(r))
            case "/api/academy/groups/cheer": (200, json(["cheer": ["id": "c3", "from": "u1", "fromName": "Gia", "to": "u2", "kind": "nudge", "at": "2026-10-28T11:00:00Z", "seen": false]]))
            case "/api/academy/groups": (200, listed)
            default: (200, json(["ok": true]))
            }
        }, cacheDir: nil)
        let store = GroupStore(api: api, token: { "tok" })
        await store.load()
        #expect(store.me?.userId == "u1")
        #expect(store.people.map(\.member.userId) == ["u2"])
        #expect(store.incoming.map(\.id) == ["c1"])
        let nonna = try #require(store.people.first?.member)
        #expect(nonna.cheerKind == .nudge)
        #expect(try await store.cheer(nonna, in: "g1").kind == .nudge)
        #expect(store.group("g1")?.cheers.count == 4)
        await store.markSeen(["c1"])
        #expect(store.incoming.isEmpty)
        #expect(store.goals.isEmpty)
        try await store.setGoal("g1", weekly: 200)
        #expect(store.goals.first?.goal == GroupGoal(weekly: 200, done: 150, weekStart: "2026-10-26"))
        try await store.setGoal("g1", weekly: 0)
        #expect(store.group("g1")?.goal == nil)
    }

    @Test func refusalLeavesTheListAndThrows() async {
        let store = GroupStore(api: BucketAPI(transport: StubTransport { _ in (409, json(["error": "group_full"])) }, cacheDir: nil), token: { "tok" })
        await #expect(throws: BucketError.groupFull) { try await store.join(code: "7K3M9QX2PD", displayName: "Gia") }
        #expect(store.groups.isEmpty)
    }

    @Test func aLoadThatStartedBeforeAnUpsertDoesNotOverwriteIt() async throws {
        let gate = LockedBox<Bool>(false)
        let listed = json(["groups": []])
        let joined = json(["group": groupJSON])
        let api = BucketAPI(transport: SlowListTransport(listed: listed, joined: joined, released: gate), cacheDir: nil)
        let store = GroupStore(api: api, token: { "tok" })
        let loading = Task { await store.load() }
        try await Task.sleep(for: .milliseconds(50))
        try await store.join(code: "7K3M9QX2PD", displayName: "Gia")
        gate.mutate { $0 = true }
        await loading.value
        #expect(store.groups.map(\.id) == ["g1"])
    }

    @Test func signedOutAsksToSignIn() async {
        let store = GroupStore(api: BucketAPI(transport: StubTransport { _ in (200, json([:])) }, cacheDir: nil), token: { nil })
        await #expect(throws: BucketError.revoked) { try await store.create(name: "x", kind: .friends, displayName: "y") }
    }
}

@Suite struct QueueNewTests {
    @Test func aQueuedWordComesUpAsNewWithoutHistory() throws {
        let corpus = try translateCorpus()
        let system = LangSystem(id: "s", name: "es", root: "en", targets: ["es"], createdAt: 0)
        let item = try #require(corpus.items.last { $0.form("es") != nil && $0.form("en") != nil })
        let now = 1_800_000_000_000.0
        let state = queueNew(EngineState(), "es", item.id, now: now)
        #expect(state.history.count == 0)
        #expect(!state.cards.started(cardId("es", item.id)))
        #expect(newToday(state, "es", now: now) == 0)
        #expect(planSession(system, corpus, state, now: now).contains { $0.itemId == item.id && $0.lang == "es" })
        let graded = gradeCard(state, "es", item.id, 3, now: now)
        #expect(graded.cards.started(cardId("es", item.id)))
        #expect(queueNew(graded, "es", item.id, now: now + 1) == graded)
    }
}
