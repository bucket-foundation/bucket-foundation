import BucketKit
import Foundation
import Testing
@testable import Polingual

@MainActor
struct GroupSocialTests {
    func cheer(_ id: String) -> Cheer { Cheer(id: id, from: "u2", fromName: "Marco", to: "u1", kind: .cheer, at: "2026-10-28", seen: false) }

    @Test func notifiesEachCheerOnce() throws {
        let d = try #require(UserDefaults(suiteName: "group-social-tests"))
        d.removePersistentDomain(forName: "group-social-tests")
        #expect(CheerNotifier.fresh([cheer("a"), cheer("b")], defaults: d).map(\.id) == ["a", "b"])
        CheerNotifier.remember([cheer("a")], defaults: d)
        #expect(CheerNotifier.fresh([cheer("a"), cheer("b")], defaults: d).map(\.id) == ["b"])
        CheerNotifier.remember((0..<300).map { cheer("x\($0)") }, defaults: d)
        #expect((d.stringArray(forKey: CheerNotifier.key) ?? []).count == 200)
    }

    @Test func spokesUseStrengthOrTheMasteredShare() {
        let m = GroupMember(userId: "u", name: "Ada Lovelace", role: .member, isMe: false, streak: 0, todayReviews: 0, lastActivity: nil,
                            languages: [MemberLanguage(lang: "fr", learned: 10, mastered: 5), MemberLanguage(lang: "de", learned: 4, mastered: 1, strength: 0.9)],
                            subjects: [MemberSubject(branch: "02-physics", title: "Physics", started: 4, mastered: 1)])
        #expect(m.languageSpokes.map(\.strength) == [0.5, 0.9])
        #expect(m.subjectSpokes.first?.mark == .branch("02"))
        #expect(m.initials == "AL")
        #expect(m.cheerKind == .nudge)
    }

    @Test func groupPageCarriesTheInvite() {
        let g = LearningGroup(id: "g", name: "Club", kind: .friends, code: "AAAAAAAAAA", role: .member, members: [])
        let page = SharePage.group(g)
        #expect(page.url.absoluteString == "https://www.bucket.foundation/s/g?c=AAAAAAAAAA&n=Club&k=friends")
        #expect(SharedLink(page.url) == .group("AAAAAAAAAA"))
    }
}
