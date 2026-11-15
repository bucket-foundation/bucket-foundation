import Foundation
import ImageIO
import Intents
import Testing
@testable import BucketKit

func member(_ id: String, _ name: String, me: Bool = false) -> [String: Any] {
    ["userId": id, "name": name, "role": me ? "owner" : "member", "isMe": me, "streak": 0, "todayReviews": 0, "languages": [], "subjects": []]
}

func groupDict(_ id: String, _ name: String, kind: String, members: [[String: Any]]) -> [String: Any] {
    ["id": id, "name": name, "kind": kind, "code": "7K3M9QX2PD", "role": "owner", "members": members]
}

func groups(_ dicts: [[String: Any]]) throws -> [LearningGroup] {
    try JSONDecoder().decode([LearningGroup].self, from: JSONSerialization.data(withJSONObject: dicts))
}

nonisolated(unsafe) let sampleGroups: [[String: Any]] = [
    groupDict("f1", "Climbing club", kind: "friends", members: [member("me", "Gia", me: true), member("u2", "Nonna"), member("u3", "Luca Rossi")]),
    groupDict("g1", "Rossi family", kind: "family", members: [member("me", "Gia", me: true), member("u2", "Nonna")]),
    groupDict("solo", "Just me", kind: "friends", members: [member("me", "Gia", me: true)]),
]

@MainActor
final class RecordingDonor: ShareDonor {
    var published: [([ShareTarget], Bool)] = []
    var donated: [ShareTarget] = []
    var forgot = 0

    func publish(_ targets: [ShareTarget], donate: Bool) { published.append((targets, donate)) }
    func donate(_ target: ShareTarget) { donated.append(target) }
    func forgetAll() { forgot += 1 }
}

@Suite struct ShareTargetTests {
    @Test func buildsFamilyFirstThenFriendsThenPeople() throws {
        let targets = ShareTargets.build(try groups(sampleGroups))
        #expect(targets.map(\.conversationId) == ["g1", "f1", "g1/u2", "f1/u3"])
        #expect(targets.map(\.kind) == [.family, .friends, .person, .person])
        #expect(targets[1].recipients == [ShareRecipient(userId: "u2", name: "Nonna"), ShareRecipient(userId: "u3", name: "Luca Rossi")])
        #expect(targets[3].recipients == [ShareRecipient(userId: "u3", name: "Luca Rossi")])
        #expect(targets[3].initials == "LR")
        #expect(!targets.contains { $0.groupId == "solo" })
        #expect(!targets.flatMap(\.recipients).contains { $0.userId == "me" })
    }

    @Test func respectsTheLimit() throws {
        #expect(ShareTargets.build(try groups(sampleGroups), limit: 2).count == 2)
    }

    @Test func conversationIdsRoundTrip() {
        #expect(ShareTargets.parse("g1")! == ("g1", nil))
        #expect(ShareTargets.parse("g1/u2")! == ("g1", "u2"))
        #expect(ShareTargets.parse("") == nil)
        #expect(ShareTargets.parse("g1/") == nil)
        #expect(ShareTargets.parse("a/b/c") == nil)
    }

    @Test func groupIntentNamesTheGroupAndListsMembers() throws {
        let t = try #require(ShareTargets.build(try groups(sampleGroups)).first { $0.conversationId == "f1" })
        let intent = ShareIntents.intent(for: t, avatar: ShareAvatar.png(initials: t.initials, seed: t.conversationId))
        #expect(intent.conversationIdentifier == "f1")
        #expect(intent.speakableGroupName?.spokenPhrase == "Climbing club")
        #expect(intent.recipients?.map(\.displayName) == ["Nonna", "Luca Rossi"])
        #expect(intent.recipients?.map { $0.personHandle?.value } == ["u2", "u3"])
        #if os(iOS)
        #expect(intent.image(forParameterNamed: \.speakableGroupName) != nil)
        #endif
        #expect(ShareIntents.target(of: intent, in: [t]) == t)
    }

    @Test func personIntentCarriesTheAvatarOnTheRecipient() throws {
        let t = try #require(ShareTargets.build(try groups(sampleGroups)).first { $0.conversationId == "g1/u2" })
        let intent = ShareIntents.intent(for: t, avatar: ShareAvatar.png(initials: "N", seed: "x"))
        #expect(intent.speakableGroupName == nil)
        #expect(intent.recipients?.count == 1)
        #expect(intent.recipients?.first?.image != nil)
        #expect(intent.conversationIdentifier == "g1/u2")
        let interaction = ShareIntents.interaction(for: t)
        #expect(interaction.direction == .outgoing && interaction.groupIdentifier == "g1/u2")
    }

    @Test func donationPlanForgetsGoneTargetsAndDonatesNewOnes() throws {
        let all = ShareTargets.build(try groups(sampleGroups))
        let now = Date(timeIntervalSince1970: 1_000_000)
        let fresh = ShareDonationPlan.make(old: all, new: Array(all.prefix(2)), lastDonated: now, now: now, donate: true)
        #expect(fresh.forget == ["g1/u2", "f1/u3"])
        #expect(fresh.donate.isEmpty)
        let grown = ShareDonationPlan.make(old: Array(all.prefix(2)), new: all, lastDonated: now, now: now.addingTimeInterval(60), donate: true)
        #expect(grown.donate.map(\.conversationId) == ["g1/u2", "f1/u3"])
        let stale = ShareDonationPlan.make(old: all, new: all, lastDonated: now, now: now.addingTimeInterval(ShareDonationPlan.refresh), donate: true)
        #expect(stale.donate == all)
        let quiet = ShareDonationPlan.make(old: all, new: [], lastDonated: nil, now: now, donate: false)
        #expect(quiet.donate.isEmpty && quiet.forget.count == 4)
    }

    @Test func cacheRoundTripsAndClears() throws {
        let suite = "share.tests.\(UUID().uuidString)"
        let cache = ShareTargetCache(suite: suite)
        let all = ShareTargets.build(try groups(sampleGroups))
        cache.save(all)
        cache.lastDonated = Date(timeIntervalSince1970: 5)
        #expect(cache.load() == all)
        cache.clear()
        #expect(cache.load().isEmpty && cache.lastDonated == nil)
        UserDefaults().removePersistentDomain(forName: suite)
    }
}

@Suite struct ShareSendTests {
    nonisolated(unsafe) static let item: [String: Any] = ["id": "i1", "groupId": "g1", "from": "me", "fromName": "Gia", "to": "u2", "kind": "url", "url": "https://polingual.com", "at": "2026-11-04T10:00:00Z", "mine": true]

    @Test func sendPathUsesTheContract() async throws {
        let seen = LockedBox<[URLRequest]>([])
        let api = BucketAPI(transport: StubTransport { r in
            seen.mutate { $0.append(r) }
            switch r.url!.path {
            case "/api/academy/groups/share" where r.httpMethod == "POST": return (200, json(["item": Self.item]))
            case "/api/academy/groups/share": return (200, json(["items": [Self.item]]))
            default: return (200, json(["ok": true]))
            }
        }, cacheDir: nil)
        let sent = try await api.share(token: "t", groupId: "g1", to: "u2", payload: .url(URL(string: "https://polingual.com")!, note: "  look "))
        #expect(sent.id == "i1" && sent.isDirect && sent.link?.host() == "polingual.com")
        _ = try await api.share(token: "t", groupId: "g1", payload: .text("ciao"))
        _ = try await api.share(token: "t", groupId: "g1", payload: .image(Data([0xff, 0xd8, 0xff]), note: nil))
        let list = try await api.sharedItems(token: "t", groupId: "g1")
        #expect(list.map(\.id) == ["i1"])
        try await api.reportItem(token: "t", itemId: "i1", reason: .spam)
        try await api.removeItem(token: "t", itemId: "i1")
        let r = seen.value
        #expect(body(r[0]) == ["groupId": "g1", "to": "u2", "kind": "url", "url": "https://polingual.com", "text": "look"])
        #expect(body(r[1]) == ["groupId": "g1", "kind": "text", "text": "ciao"])
        #expect(body(r[2]) == ["groupId": "g1", "kind": "image", "image": "/9j/"])
        #expect(r[3].httpMethod != "POST" && r[3].url!.query() == "groupId=g1&voice=1")
        #expect(r[4].url!.path == "/api/academy/groups/share/report" && body(r[4]) == ["itemId": "i1", "reason": "spam"])
        #expect(r[5].url!.path == "/api/academy/groups/share/remove" && body(r[5]) == ["itemId": "i1"])
        #expect(r.allSatisfy { $0.value(forHTTPHeaderField: "authorization") == "Bearer t" })
    }

    @Test func shareErrorsMapToMessages() async {
        func failure(_ status: Int, _ error: String) async -> BucketError? {
            let api = BucketAPI(transport: StubTransport { _ in (status, json(["error": error])) }, cacheDir: nil)
            do {
                _ = try await api.share(token: "t", groupId: "g1", payload: .text("x"))
                return nil
            } catch { return error as? BucketError }
        }
        #expect(await failure(429, "share_limit") == .shareLimit)
        #expect(await failure(422, "text_not_allowed") == .textNotAllowed)
        #expect(await failure(413, "image_too_large") == .imageTooLarge)
        #expect(await failure(404, "not_found") == .groupNotFound)
        #expect(await failure(429, "rate_limited") == .rateLimited(nil))
    }

    @Test func imagesShrinkToJpegUnderTheCap() throws {
        let png = try #require(ShareAvatar.png(initials: "GR", seed: "g1", size: 900))
        let jpeg = try #require(ShareImage.jpeg(png, maxPixel: 400))
        #expect(jpeg.count <= ShareImage.maxBytes)
        #expect(jpeg.prefix(3) == Data([0xff, 0xd8, 0xff]))
        let source = try #require(CGImageSourceCreateWithData(jpeg as CFData, nil))
        let props = try #require(CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])
        #expect(props[kCGImagePropertyPixelWidth] as? Int == 400)
        #expect(ShareImage.jpeg(Data("not an image".utf8)) == nil)
    }

    @Test func avatarColorIsStable() {
        #expect(ShareAvatar.colorIndex("g1") == ShareAvatar.colorIndex("g1"))
        #expect((0..<6).contains(ShareAvatar.colorIndex("anything")))
    }
}

@Suite @MainActor struct ShareStoreTests {
    func store(_ routes: @escaping @Sendable (URLRequest) -> (Int, Data)) -> (GroupStore, RecordingDonor) {
        let s = GroupStore(api: BucketAPI(transport: StubTransport(routes: routes), cacheDir: nil), token: { "t" })
        let d = RecordingDonor()
        s.donor = d
        return (s, d)
    }

    @Test func loadingGroupsDonatesTargets() async throws {
        let (s, d) = store { r in
            r.url!.path == "/api/academy/groups" ? (200, json(["groups": sampleGroups])) : (200, json(["blocks": []]))
        }
        await s.load()
        #expect(d.published.count == 1)
        #expect(d.published[0].1)
        #expect(d.published[0].0.map(\.conversationId) == ["g1", "f1", "g1/u2", "f1/u3"])
    }

    @Test func leavingBlockingAndSigningOutForgetTargets() async throws {
        let (s, d) = store { r in r.httpMethod == "POST" ? (200, json(["ok": true])) : (200, json(["blocks": []])) }
        s.groups = try groups(sampleGroups)
        try await s.leave("f1")
        #expect(d.published.last.map { $0.1 } == false)
        #expect(d.published.last?.0.map(\.conversationId) == ["g1", "g1/u2"])
        s.groups = try groups(sampleGroups)
        try await s.block(groupId: "f1", userId: "u3")
        #expect(d.published.last?.0.contains { $0.userId == "u3" } == false)
        s.clear()
        #expect(d.forgot == 1)
    }

    @Test func cheeringAndSharingDonateThePerson() async throws {
        let (s, d) = store { r in
            switch r.url!.path {
            case "/api/academy/groups/cheer": (200, json(["cheer": ["id": "c1", "from": "me", "fromName": "Gia", "to": "u2", "kind": "nudge", "at": "2026-11-04T10:00:00Z", "seen": false]]))
            default: (200, json(["item": ShareSendTests.item]))
            }
        }
        s.groups = try groups(sampleGroups)
        let nonna = try #require(s.groups[1].members.first { $0.userId == "u2" })
        try await s.cheer(nonna, in: "g1")
        #expect(d.donated.map(\.conversationId) == ["g1/u2"])
        let target = try #require(s.shareTargets.first { $0.conversationId == "f1" })
        try await s.share(.text("ciao"), to: target)
        #expect(d.donated.last == target)
        #expect(s.items["f1"]?.map(\.id) == ["i1"])
    }

    @Test func reportingAndBlockingHideItems() async throws {
        let (s, _) = store { r in r.httpMethod == "POST" ? (200, json(["ok": true])) : (200, json(["blocks": []])) }
        s.groups = try groups(sampleGroups)
        let a = SharedItem(id: "a", groupId: "f1", from: "u2", fromName: "Nonna", kind: .text, text: "hi", at: "", mine: false)
        let b = SharedItem(id: "b", groupId: "f1", from: "u3", fromName: "Luca", kind: .text, text: "yo", at: "", mine: false)
        s.items["f1"] = [a, b]
        try await s.reportItem(a, reason: .harassment)
        #expect(s.items["f1"]?.map(\.id) == ["b"])
        try await s.block(groupId: "f1", userId: "u3")
        #expect(s.items["f1"]?.isEmpty == true)
    }
}
