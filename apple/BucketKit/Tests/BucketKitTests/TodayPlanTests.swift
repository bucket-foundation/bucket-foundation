import Foundation
import Testing
@testable import BucketKit

@Suite struct TodayPlanTests {
    let lang = TodayItem(kind: .system, ref: "sys1", title: "Romance")
    let math = TodayItem(kind: .deck, ref: "01-math", title: "Mathematics")
    let flags = TodayItem(kind: .game, ref: "flags", title: "Flags")
    let read = TodayItem(kind: .content, ref: "Entropy", title: "Entropy")

    var cal: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        return c
    }

    func at(_ hour: Int, _ minute: Int = 0) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 10, day: 21, hour: hour, minute: minute))!
    }

    @Test func newUsersGetTheStarterAndOwnersGetTheirWork() {
        #expect(TodayPlan.defaults(systems: [], decks: [], starter: [math]) == [math])
        #expect(TodayPlan.defaults(systems: [lang], decks: [], starter: [math]) == [lang])
    }

    @Test func defaultsFollowUntilTheUserEdits() {
        var p = TodayPlan()
        p.adopt([lang])
        p.adopt([lang, math])
        #expect(p.items == [lang, math])
        #expect(!p.customized)
        p.add(flags, now: 5)
        p.adopt([lang])
        #expect(p.items == [lang, math, flags])
        #expect(p.customized && p.updatedAt == 5)
    }

    @Test func addingTwiceKeepsOne() {
        var p = TodayPlan()
        p.add(read, now: 1)
        p.add(read, now: 2)
        #expect(p.items == [read])
    }

    @Test func removeDropsTheItemAndItsDoneMark() {
        var p = TodayPlan()
        p.add(read, now: 1)
        p.setDone(read.id, true, day: "d", now: 2)
        p.remove(read.id, now: 3)
        #expect(p.items.isEmpty && !p.isDone(read.id, day: "d"))
    }

    @Test func orderKeepsUnlistedItemsAtTheEnd() {
        var p = TodayPlan()
        for i in [lang, math, flags, read] { p.add(i, now: 1) }
        p.order([flags.id, lang.id, flags.id, "gone"], now: 2)
        #expect(p.items == [flags, lang, math, read])
    }

    @Test func moveToTopAndBottom() {
        var p = TodayPlan()
        for i in [lang, math, flags] { p.add(i, now: 1) }
        p.move(flags.id, toTop: true, now: 2)
        #expect(p.items == [flags, lang, math])
        p.move(flags.id, toTop: false, now: 3)
        #expect(p.items == [lang, math, flags])
    }

    @Test func doneMarksLastOneDay() {
        var p = TodayPlan()
        p.setDone(read.id, true, day: "mon", now: 1)
        #expect(p.isDone(read.id, day: "mon"))
        #expect(!p.isDone(read.id, day: "tue"))
        p.setDone(lang.id, true, day: "tue", now: 2)
        #expect(p.doneToday("tue") == [lang.id])
        p.setDone(lang.id, false, day: "tue", now: 3)
        #expect(p.doneToday("tue").isEmpty)
    }

    @Test func mergeTakesTheNewestListAndUnitesTheSameDay() {
        var a = TodayPlan(), b = TodayPlan()
        a.add(lang, now: 1)
        b.add(math, now: 2)
        a.setDone(lang.id, true, day: "d", now: 3)
        b.setDone(math.id, true, day: "d", now: 1)
        let m = TodayPlan.merge(a, b)
        #expect(m.items == [math])
        #expect(Set(m.done) == [lang.id, math.id])
    }

    @Test func mergeTakesTheLaterDay() {
        var a = TodayPlan(), b = TodayPlan()
        a.setDone(lang.id, true, day: "mon", now: 1)
        b.setDone(math.id, true, day: "tue", now: 2)
        #expect(TodayPlan.merge(a, b).done == [math.id])
        #expect(TodayPlan.merge(b, a).doneDay == "tue")
    }

    @Test func jsonRoundTrip() {
        var p = TodayPlan()
        p.add(flags, now: 9)
        p.setDone(flags.id, true, day: "d", now: 10)
        #expect(TodayPlan(js: p.js) == p)
        #expect(TodayPlan(js: nil) == nil)
    }

    @Test func statusBeforeAnyStudy() {
        #expect(TodayStatus.evaluate(streak: 0, studiedToday: false, items: 0, itemsLeft: 0, now: at(9), calendar: cal) == .empty)
        #expect(TodayStatus.evaluate(streak: 0, studiedToday: false, items: 2, itemsLeft: 2, now: at(9), calendar: cal) == .start)
    }

    @Test func statusKeepsThenTurnsToRiskAtEight() {
        let keep = TodayStatus.evaluate(streak: 12, studiedToday: false, items: 2, itemsLeft: 2, now: at(9, 30), calendar: cal)
        #expect(keep == .keep(streak: 12, left: TimeLeft(until: at(23, 59).addingTimeInterval(60), from: at(9, 30))))
        guard case .atRisk(let streak, let left) = TodayStatus.evaluate(streak: 12, studiedToday: false, items: 2, itemsLeft: 2, now: at(20), calendar: cal) else {
            Issue.record("expected at risk")
            return
        }
        #expect(streak == 12 && left.hours == 4 && left.minutes == 0)
    }

    @Test func aMarkedListDoesNotSaveTheStreak() {
        let s = TodayStatus.evaluate(streak: 3, studiedToday: false, items: 1, itemsLeft: 0, now: at(21), calendar: cal)
        if case .atRisk = s {} else { Issue.record("expected at risk") }
    }

    @Test func statusAfterStudy() {
        #expect(TodayStatus.evaluate(streak: 4, studiedToday: true, items: 3, itemsLeft: 1, now: at(21), calendar: cal) == .secured(streak: 4, itemsLeft: 1))
        #expect(TodayStatus.evaluate(streak: 4, studiedToday: true, items: 3, itemsLeft: 0, now: at(21), calendar: cal) == .done(streak: 4))
    }

    @Test func timeLeftRoundsUpAndNeverGoesNegative() {
        #expect(TimeLeft(until: at(10).addingTimeInterval(30), from: at(10)).minutes == 1)
        #expect(TimeLeft(until: at(9), from: at(10)).hours == 0)
    }
}

@MainActor
@Suite struct TodayPlanStoreTests {
    let item = TodayItem(kind: .game, ref: "flags", title: "Flags")

    @Test func keepsThePlanOnDiskWithoutAnAccount() async {
        let server = ProgressServer()
        let disk = MemoryLangDisk()
        let store = TodayPlanStore(api: BucketAPI(transport: server.transport), disk: disk, now: { 10 })
        store.add(item)
        store.setDone(item.id, true)
        await store.flush()
        #expect(server.posts.value.isEmpty)
        let again = TodayPlanStore(api: BucketAPI(transport: server.transport), disk: disk, now: { 10 })
        #expect(again.contains(item.id) && again.isDone(item.id))
    }

    @Test func pushesEditsToTheProgressBranch() async {
        let server = ProgressServer()
        let store = TodayPlanStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), token: { "t" }, now: { 10 })
        store.add(item)
        await store.flush()
        #expect(server.posts.value == [TodayPlanStore.branch])
        #expect(TodayPlan(js: server.branches.value[TodayPlanStore.branch])?.items == [item])
    }

    @Test func pullMergesTheServerPlan() async {
        let server = ProgressServer()
        var remote = TodayPlan()
        remote.add(item, now: 20)
        server.branches.mutate { $0[TodayPlanStore.branch] = remote.js }
        let store = TodayPlanStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), token: { "t" }, now: { 10 })
        await store.pull()
        #expect(store.contains(item.id))
        #expect(server.posts.value.isEmpty)
    }

    @Test func untouchedDefaultsNeverReachTheServer() async {
        let server = ProgressServer()
        let store = TodayPlanStore(api: BucketAPI(transport: server.transport), disk: MemoryLangDisk(), token: { "t" }, now: { 10 })
        store.adopt([item])
        await store.pull()
        #expect(server.posts.value.isEmpty)
    }

    @Test func clearLocalForgetsThePlan() {
        let store = TodayPlanStore(api: BucketAPI(transport: ProgressServer().transport), disk: MemoryLangDisk(), now: { 10 })
        store.add(item)
        store.clearLocal()
        #expect(!store.contains(item.id))
    }
}
