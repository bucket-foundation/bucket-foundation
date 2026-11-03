import Foundation
import Testing
@testable import BucketKit

struct WordLookupTests {
    static let top = [
        TopWord(rank: 1, word: "bien", meaning: "good", ipa: "/ˈbjen/", band: "A1"),
        TopWord(rank: 2, word: "eau", meaning: "water", band: "A1"),
    ]

    @Test func topWordGivesMeaningAndIPA() {
        let d = WordLookup.detail("Bien", lang: "es", corpus: nil, top: Self.top)
        #expect(d.gloss == "good")
        #expect(d.reading?.ipa == "ˈbjen")
    }

    @Test func elidedArticleFindsTheNoun() {
        #expect(WordLookup.detail("l'eau", lang: "fr", corpus: nil, top: Self.top).gloss == "water")
        #expect(WordLookup.detail("L’eau", lang: "fr", corpus: nil, top: Self.top).gloss == "water")
    }

    @Test func unknownWordKeepsTheTappedText() {
        let d = WordLookup.detail("zzz", lang: "es", corpus: nil, top: Self.top)
        #expect(d.word == "zzz")
        #expect(d.gloss == nil)
        #expect(d.reading == nil)
    }

    @Test func meaningEqualToTheWordIsDropped() {
        let top = [TopWord(rank: 1, word: "water", meaning: "water", band: "A1")]
        #expect(WordLookup.detail("water", lang: "en", corpus: nil, top: top).gloss == nil)
    }

    @Test func sameWordInTwoLanguagesHasTwoIds() {
        let a = WordLookup.detail("no", lang: "es", corpus: nil, top: [])
        let b = WordLookup.detail("no", lang: "it", corpus: nil, top: [])
        #expect(a.id != b.id)
    }
}
