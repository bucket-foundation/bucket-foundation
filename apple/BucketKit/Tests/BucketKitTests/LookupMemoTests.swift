import Testing
@testable import BucketKit

struct LookupMemoTests {
    @Test func recordsAskedLanguagesAndFoundForms() {
        var memo = LookupMemo(capacity: 4)
        memo.record(word: "Haus", lang: "de", asked: ["es", "en"], rows: ["es": "casa", "en": "house"])
        memo.record(word: "Haus", lang: "de", asked: ["fr", "ja"], rows: ["fr": "maison"])
        let entry = memo.entry(word: "Haus", lang: "de")
        #expect(entry.asked == ["es", "en", "fr", "ja"])
        #expect(entry.found == ["es": "casa", "en": "house", "fr": "maison"])
        #expect(memo.entry(word: "Haus", lang: "nl") == LookupMemo.Entry())
        #expect(memo.entry(word: "haus", lang: "de") == LookupMemo.Entry())
    }

    @Test func keepsTheFirstFormFound() {
        var memo = LookupMemo(capacity: 2)
        memo.record(word: "dog", lang: "en", asked: ["es"], rows: ["es": "perro"])
        memo.record(word: "dog", lang: "en", asked: ["es"], rows: ["es": "can"])
        #expect(memo.entry(word: "dog", lang: "en").found["es"] == "perro")
    }

    @Test func dropsTheLeastRecentWordPastCapacity() {
        var memo = LookupMemo(capacity: 2)
        memo.record(word: "a", lang: "en", asked: ["es"], rows: [:])
        memo.record(word: "b", lang: "en", asked: ["es"], rows: [:])
        memo.record(word: "a", lang: "en", asked: ["fr"], rows: [:])
        memo.record(word: "c", lang: "en", asked: ["es"], rows: [:])
        #expect(memo.entry(word: "a", lang: "en").asked == ["es", "fr"])
        #expect(memo.entry(word: "b", lang: "en").asked.isEmpty)
        #expect(memo.entry(word: "c", lang: "en").asked == ["es"])
    }

    @Test func aSecondViewJoinsLanguagesAlreadyBeingLookedUp() {
        var runs = LookupRuns<Int>()
        runs.start(1, word: "Haus", lang: "de", targets: ["es", "fr"])
        runs.start(2, word: "Haus", lang: "de", targets: ["ja"])
        #expect(runs.running(word: "Haus", lang: "de") == ["es": 1, "fr": 1, "ja": 2])
        #expect(runs.running(word: "Haus", lang: "nl").isEmpty)
        let batches = LangReference.lookupBatches(lang: "de", mine: ["es", "fr", "ja", "it"], all: false, size: 8, asked: Set(runs.running(word: "Haus", lang: "de").keys))
        #expect(batches.flatMap { $0 } == ["it", "en"])
    }

    @Test func finishingARunFreesOnlyItsLanguages() {
        var runs = LookupRuns<Int>()
        runs.start(1, word: "Haus", lang: "de", targets: ["es", "fr"])
        runs.start(2, word: "Haus", lang: "de", targets: ["ja"])
        runs.finish(1, word: "Haus", lang: "de")
        #expect(runs.running(word: "Haus", lang: "de") == ["ja": 2])
        runs.finish(2, word: "Haus", lang: "de")
        #expect(runs.running(word: "Haus", lang: "de").isEmpty)
        runs.finish(2, word: "Haus", lang: "de")
        #expect(runs.running(word: "Haus", lang: "de").isEmpty)
    }
}
