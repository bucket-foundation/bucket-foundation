import Foundation
import Testing
@testable import BucketKit

@MainActor
@Suite struct SetSortTests {
    func set(_ id: String, _ name: String, _ targets: [String], at: Double = 0) -> LangSystem {
        LangSystem(id: id, name: name, root: "en", targets: targets, createdAt: at)
    }

    @Test func recentPutsTheLatestStudyDayFirstAcrossMonths() {
        let a = set("a", "A", ["nl"])
        let b = set("b", "B", ["de"])
        var sa = EngineState()
        sa.lastStudyDay = "2026-11-9"
        var sb = EngineState()
        sb.lastStudyDay = "2026-11-28"
        let recent = ["a": setRecency(a, sa), "b": setRecency(b, sb)]
        let out = sortSystems([a, b], by: .recent, recent: recent, mastery: [:], title: \.name)
        #expect(out.map(\.id) == ["b", "a"])
    }

    @Test func recentFallsBackToReviewTimeThenEditTime() {
        let a = set("a", "A", ["nl"], at: 5)
        let b = set("b", "B", ["nl"], at: 9)
        let c = set("c", "C", ["de"], at: 1)
        let shared = gradeCard(EngineState(), "nl", "wife", 3, now: 1_000, tz: "UTC")
        let later = gradeCard(EngineState(), "de", "wife", 3, now: 2_000, tz: "UTC")
        var sa = shared
        var sb = shared
        var sc = later
        sa.lastStudyDay = "2026-11-1"
        sb.lastStudyDay = "2026-11-1"
        sc.lastStudyDay = "2026-11-1"
        let recent = ["a": setRecency(a, sa), "b": setRecency(b, sb), "c": setRecency(c, sc)]
        let out = sortSystems([a, b, c], by: .recent, recent: recent, mastery: [:], title: \.name)
        #expect(out.map(\.id) == ["c", "b", "a"])
    }

    @Test func recencyIgnoresCardsOutsideTheSetLanguages() {
        let a = set("a", "A", ["nl"])
        let state = gradeCard(EngineState(), "de", "wife", 3, now: 7_000, tz: "UTC")
        #expect(setRecency(a, state).review == 0)
    }

    @Test func masterySortsBothWaysWithRecentBreakingTies() {
        let a = set("a", "A", ["nl"], at: 1)
        let b = set("b", "B", ["de"], at: 2)
        let c = set("c", "C", ["it"], at: 3)
        let recent = ["a": setRecency(a, EngineState()), "b": setRecency(b, EngineState()), "c": setRecency(c, EngineState())]
        let mastery = ["a": 0.5, "b": 0.1, "c": 0.5]
        #expect(sortSystems([a, b, c], by: .masteryHigh, recent: recent, mastery: mastery, title: \.name).map(\.id) == ["c", "a", "b"])
        #expect(sortSystems([a, b, c], by: .masteryLow, recent: recent, mastery: mastery, title: \.name).map(\.id) == ["b", "c", "a"])
    }

    @Test func nameSortUsesTheShownTitleInNaturalOrder() {
        let a = set("a", "Set 10", ["nl"])
        let b = set("b", "set 2", ["de"])
        let c = set("c", "Alpha", ["it"])
        let out = sortSystems([a, b, c], by: .name, recent: [:], mastery: [:], title: \.name)
        #expect(out.map(\.id) == ["c", "b", "a"])
    }

    @Test func renameTrimsCapsAndResetsWhenEmpty() {
        let s = set("a", systemName("en", ["nl"]), ["nl"])
        let named = renameSystem(s, "  Dutch at work  ", now: 50)
        #expect(named.name == "Dutch at work")
        #expect(named.updatedAt == 50)
        #expect(hasCustomName(named))
        #expect(renameSystem(s, String(repeating: "x", count: 90), now: 1).name.count == maxSetNameLength)
        #expect(renameSystem(named, "   ", now: 2).name == systemName("en", ["nl"]))
    }

    @Test func editingLanguagesKeepsACustomName() throws {
        let s = renameSystem(set("a", systemName("en", ["nl"]), ["nl"]), "Work", now: 1)
        #expect(try editSystem(s, ["nl", "de"], now: 2).name == "Work")
        let plain = set("b", systemName("en", ["nl"]), ["nl"])
        #expect(try editSystem(plain, ["nl", "de"], now: 2).name == systemName("en", ["nl", "de"]))
    }

    @Test func storeRenameReachesTheServerAndSkipsNoChange() async throws {
        let server = LangServer()
        let clock = LockedBox<Double>(3_000)
        let s = LangStore(api: server.api, disk: MemoryLangDisk(), cache: MemoryLangDisk(), seed: { _ in nil }, token: { "t" }, now: { clock.value })
        let made = try await s.create(root: "en", targets: ["nl"])
        clock.mutate { $0 = 4_000 }
        await s.rename(made.id, to: "Evening Dutch")
        #expect(s.system(made.id)?.name == "Evening Dutch")
        #expect(SystemsDoc(js: server.branches.value[LangStore.systemsBranch]).systems.first?.name == "Evening Dutch")
        let posts = server.posts.value.count
        await s.rename(made.id, to: " Evening Dutch ")
        #expect(server.posts.value.count == posts)
    }

    @Test func renamingToTheDefaultNameFollowsLaterLanguageEdits() throws {
        let s = renameSystem(set("a", "Work", ["nl"]), systemName("en", ["nl"]), now: 1)
        #expect(!hasCustomName(s))
        #expect(try editSystem(s, ["nl", "de"], now: 2).name == systemName("en", ["nl", "de"]))
    }

    @Test func recencyTreatsAMissingStudyDayAsOldest() {
        let a = set("a", "A", ["nl"], at: 9)
        let b = set("b", "B", ["de"], at: 1)
        var sb = EngineState()
        sb.lastStudyDay = "2026-1-1"
        let recent = ["a": setRecency(a, EngineState()), "b": setRecency(b, sb)]
        #expect(sortSystems([a, b], by: .recent, recent: recent, mastery: [:], title: \.name).map(\.id) == ["b", "a"])
        #expect(dayNumber(nil) == 0)
        #expect(dayNumber("bad") == 0)
    }
}
