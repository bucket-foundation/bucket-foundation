import Foundation
import Testing
@testable import BucketKit

@Suite struct KnownLanguagesTests {
    @Test func unknownCodesAndDuplicatesAreDropped() {
        let known = KnownLanguages(["es", "xx", "en", "es", "", "EN"], at: 5)
        #expect(known.codes == ["en", "es"])
        #expect(known.at == 5)
    }

    @Test func codesAreSortedSoTwoDevicesWriteTheSameDocument() {
        #expect(KnownLanguages(["pt", "en", "ar"]) == KnownLanguages(["ar", "pt", "en"]))
    }

    @Test func speakListLeavesOutClassicalLanguages() {
        let list = KnownLanguages.speakable(device: "en")
        #expect(KnownLanguages.classical.isDisjoint(with: list))
        #expect(list.count == Lang.codes.count - KnownLanguages.classical.count)
        #expect(Set(list).count == list.count)
    }

    @Test func speakListLeadsWithTheDeviceLanguageThenCommonThenByName() {
        let list = KnownLanguages.speakable(device: "de")
        #expect(Array(list.prefix(8)) == ["de", "en", "es", "fr", "pt", "zh", "hi", "ar"])
        let rest = list.dropFirst(8).map(Lang.name)
        #expect(rest == rest.sorted())
        #expect(Array(KnownLanguages.speakable(device: "es").prefix(3)) == ["es", "en", "fr"])
    }

    @Test func classicalOrUnknownDeviceLanguageDoesNotJoinTheSpeakList() {
        #expect(KnownLanguages.speakable(device: "la").first == "en")
        #expect(KnownLanguages.speakable(device: "xx").first == "en")
    }

    @Test func baseIsTheDeviceLanguageWhenPicked() {
        #expect(KnownLanguages.base(device: "es", picks: ["en", "es", "fr"]) == "es")
        #expect(KnownLanguages(["en", "es", "fr"]).base(device: "es") == "es")
    }

    @Test func baseIsTheFirstPickWhenTheDeviceLanguageIsNotPicked() {
        #expect(KnownLanguages.base(device: "en", picks: ["pt", "ar"]) == "pt")
        #expect(KnownLanguages.base(device: "en", picks: ["xx", "ar"]) == "ar")
        #expect(KnownLanguages(["tr", "pt"]).base(device: "en") == "pt")
    }

    @Test func baseFallsBackToTheDeviceLanguageThenEnglishWithNoPick() {
        #expect(KnownLanguages.base(device: "fr", picks: []) == "fr")
        #expect(KnownLanguages.base(device: "xx", picks: []) == "en")
    }

    @Test func toggleAddsAndRemovesAndKeepsAtLeastOne() {
        let one = KnownLanguages(["en"], at: 1)
        let two = one.toggled("es", at: 2)
        #expect(two.codes == ["en", "es"])
        #expect(two.at == 2)
        #expect(two.toggled("en", at: 3).codes == ["es"])
        #expect(one.toggled("en", at: 9) == one)
        #expect(one.toggled("xx", at: 9) == one)
    }

    @Test func knownLanguagesLeaveTheTargetPicks() {
        #expect(KnownLanguages(["es", "en"]).learnable(["fr", "es", "it", "de"]) == ["fr", "it", "de"])
    }

    @Test func mergeTakesTheLaterDocument() {
        let old = KnownLanguages(["en"], at: 100)
        let new = KnownLanguages(["en", "hi"], at: 200)
        #expect(KnownLanguages.merged(old, new) == new)
        #expect(KnownLanguages.merged(new, old) == new)
    }

    @Test func mergeNeverLetsABlankDocumentReplaceAStoredOne() {
        let stored = KnownLanguages(["en", "hi"], at: 100)
        let blank = KnownLanguages([], at: 900)
        #expect(blank.isBlank)
        #expect(KnownLanguages.merged(stored, blank) == stored)
        #expect(KnownLanguages.merged(blank, stored) == stored)
    }

    @Test func eventCodesHoldAtMostEightCodesInTheIngestFormat() throws {
        let known = KnownLanguages(["en", "es", "fr", "pt", "zh", "hi", "ar", "de", "nl", "grc"])
        #expect(known.codes.count == 10)
        #expect(known.eventCodes.split(separator: ",").count == 8)
        let pattern = try Regex("^[a-z]{2,3}(,[a-z]{2,3}){0,7}$")
        #expect(known.eventCodes.wholeMatch(of: pattern) != nil)
        #expect(KnownLanguages(["ang"]).eventCodes == "ang")
    }
}
