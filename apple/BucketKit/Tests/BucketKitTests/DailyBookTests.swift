import Foundation
import Testing
@testable import BucketKit

struct DailyBookTests {
    static func entry(_ game: String, _ day: String, at: Double, pattern: String = "101") -> DailyEntry {
        DailyEntry.result(game: game, day: day, score: 2, total: 3, pattern: pattern, savedAt: at)
    }

    @Test func theFirstResultOfADayWinsOnEveryDevice() {
        let phone = [DailyBook.key("mini", "2026-11-24"): Self.entry("mini", "2026-11-24", at: 100)]
        let web = [DailyBook.key("mini", "2026-11-24"): Self.entry("mini", "2026-11-24", at: 50, pattern: "111")]
        #expect(DailyBook.merge(phone, web)[DailyBook.key("mini", "2026-11-24")]?.pattern == "111")
        #expect(DailyBook.merge(web, phone)[DailyBook.key("mini", "2026-11-24")]?.savedAt == 50)
    }

    @Test func aWebResultReadsOnIphoneAndKeepsItsWords() throws {
        let json = #"{"polingual-daily":{"data":{"results":{"daily-set|2026-11-24":{"game":"daily-set","day":"2026-11-24","score":5,"total":6,"pattern":"111110","savedAt":1764000000000,"words":[{"lang":"es","itemId":"cat","form":"gato","gloss":"cat","right":true}]}}}}}"#
        let branches = try #require(try JSON.parse(json).object)
        let book = DailyBook.fromBranches(branches)
        #expect(DailyBook.played(book, game: "daily-set", day: "2026-11-24"))
        #expect(!DailyBook.played(book, game: "mini", day: "2026-11-24"))
        #expect(DailyBook.encode(book)["daily-set|2026-11-24"]?["words"]?.array?.count == 1)
    }

    @Test func iphoneGameNamesMatchTheWebBook() {
        #expect(DailyBook.wire == ["daily": "daily-set", "mini": "mini", "wordGroups": "word-groups", "match": "speed-match", "voice": "which-voice", "letters": "letter-sprint"])
    }

    @Test func theBookKeepsTheNewest120() {
        var book: DailyBook.Book = [:]
        for i in 0..<130 { book[DailyBook.key("mini", "d\(i)")] = Self.entry("mini", "d\(i)", at: Double(i)) }
        let kept = DailyBook.merge(book, [:])
        #expect(kept.count == DailyBook.keep)
        #expect(kept[DailyBook.key("mini", "d0")] == nil)
        #expect(kept[DailyBook.key("mini", "d129")] != nil)
    }

    @Test func syncPushesALocalResultAndStopsWhenTheServerAgrees() async {
        let local = [DailyBook.key("mini", "2026-11-24"): Self.entry("mini", "2026-11-24", at: 10)]
        var server: DailyBook.Book = [:]
        var pushes = 0
        let out = await DailyBook.sync(local, pull: { server }, push: { server = $0; pushes += 1; return true })
        #expect(out.map { DailyBook.same($0, local) } == true)
        #expect(pushes == 1)
        #expect(DailyBook.played(server, game: "mini", day: "2026-11-24"))
    }

    @Test func syncGivesUpWhenThePullFails() async {
        let out = await DailyBook.sync([:], pull: { nil }, push: { _ in true })
        #expect(out == nil)
    }

    @Test func localStorageRoundTrips() {
        let defaults = UserDefaults(suiteName: "daily-book-\(UUID().uuidString)")!
        let book = [DailyBook.key("letter-sprint", "2026-11-24"): Self.entry("letter-sprint", "2026-11-24", at: 7)]
        DailyBook.writeLocal(book, defaults)
        #expect(DailyBook.same(DailyBook.readLocal(defaults), book))
    }
}
