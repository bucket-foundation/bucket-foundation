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

    @Test func starterTargetsSkipKnownLanguagesAndTheRoot() {
        #expect(KnownLanguages.starter.allSatisfy(Lang.codes.contains))
        #expect(KnownLanguages(["en"]).starterTargets(root: "en") == ["fr", "es", "it"])
        #expect(KnownLanguages(["en", "es", "fr"]).starterTargets(root: "es") == ["it", "de", "pt"])
        let all = KnownLanguages(KnownLanguages.starter + ["en"])
        let rest = all.starterTargets(root: "en")
        #expect(rest.count == 3)
        #expect(rest.allSatisfy { !all.codes.contains($0) && !KnownLanguages.classical.contains($0) })
    }
}

@Suite struct KnownPicksTests {
    @Test func aNewLearnerStartsWithTheDeviceLanguage() {
        let picks = KnownPicks(device: "en")
        #expect(picks.known.codes == ["en"])
        #expect(picks.root == "en")
        #expect(picks.targets == ["fr", "es", "it"])
        #expect(picks.ready)
    }

    @Test func aStoredListReplacesTheDeviceDefault() {
        let picks = KnownPicks(device: "en", stored: KnownLanguages(["es", "pt"], at: 4))
        #expect(picks.known.codes == ["es", "pt"])
        #expect(picks.root == "es")
        #expect(!picks.targets.contains("es"))
        #expect(!picks.targets.contains("pt"))
    }

    @Test func pickingSpanishAndEnglishWithSpanishAsBaseDropsBothFromTargets() {
        var picks = KnownPicks(device: "en")
        picks.toggle("es", at: 10)
        #expect(picks.root == "en")
        #expect(picks.bases == ["en", "es"])
        picks.choose(base: "es")
        #expect(picks.root == "es")
        #expect(picks.targets == ["fr", "it"])
        #expect(picks.known.at == 10)
    }

    @Test func droppingTheChosenBaseFallsBackToTheDeviceRule() {
        var picks = KnownPicks(device: "en")
        picks.toggle("fr", at: 1)
        picks.choose(base: "fr")
        picks.toggle("fr", at: 2)
        #expect(picks.known.codes == ["en"])
        #expect(picks.root == "en")
    }

    @Test func theLastKnownLanguageStaysSelected() {
        var picks = KnownPicks(device: "de")
        picks.toggle("de", at: 1)
        #expect(picks.known.codes == ["de"])
    }

    @Test func aBaseOutsideTheKnownListIsRefused() {
        var picks = KnownPicks(device: "en")
        picks.choose(base: "ja")
        #expect(picks.root == "en")
        #expect(picks.chosenBase == nil)
    }

    @Test func anUntouchedDefaultNeverReplacesAStoredList() {
        let stored = KnownLanguages(["es", "pt"], at: 4)
        let untouched = KnownPicks(device: "en")
        #expect(!untouched.touched)
        #expect(untouched.codesToSave(over: stored) == nil)
        #expect(untouched.codesToSave(over: KnownLanguages([])) == ["en"])
        var edited = untouched
        edited.toggle("fr", at: 9)
        #expect(edited.touched)
        #expect(edited.codesToSave(over: stored) == ["en", "fr"])
    }

    @Test func targetsRefillWhenEveryPickBecomesKnown() {
        var picks = KnownPicks(device: "en")
        picks.pick(["es", "pt"])
        picks.toggle("es", at: 1)
        #expect(picks.targets == ["pt"])
        picks.toggle("pt", at: 2)
        #expect(picks.targets == ["fr", "it", "de"])
    }

    @Test func presetsLoseKnownLanguagesEmptyOnesAndRepeats() {
        var picks = KnownPicks(device: "en")
        picks.toggle("es", at: 1)
        picks.toggle("pt", at: 2)
        let shown = picks.presets(Lang.presets)
        #expect(shown.map(\.name) == ["Romance", "East Asian", "Germanic"])
        #expect(shown[0].targets == ["fr", "it"])
        picks.pick(Lang.presets[0].targets)
        #expect(picks.targets == ["fr", "it"])
    }

    func set(_ root: String, at: Double) -> LangSystem { LangSystem(id: "s\(Int(at))", name: root, root: root, targets: ["fr"], createdAt: at) }

    @Test func thePromptWaitsForALoadedLearnerWithASetAndNoAnswer() {
        let blank = KnownLanguages([])
        let sets = [set("en", at: 1)]
        #expect(KnownPrompt.due(known: blank, systems: sets, ready: true, signedIn: false, pulled: false, asked: false))
        #expect(KnownPrompt.due(known: blank, systems: sets, ready: true, signedIn: true, pulled: true, asked: false))
        #expect(!KnownPrompt.due(known: blank, systems: sets, ready: true, signedIn: true, pulled: false, asked: false))
        #expect(!KnownPrompt.due(known: blank, systems: sets, ready: false, signedIn: false, pulled: false, asked: false))
        #expect(!KnownPrompt.due(known: blank, systems: [], ready: true, signedIn: false, pulled: false, asked: false))
        #expect(!KnownPrompt.due(known: blank, systems: sets, ready: true, signedIn: false, pulled: false, asked: true))
        #expect(!KnownPrompt.due(known: KnownLanguages(["en"], at: 1), systems: sets, ready: true, signedIn: false, pulled: false, asked: false))
    }

    @Test func thePromptStartsFromTheNewestSetsRoot() {
        let picks = KnownPrompt.seed(systems: [set("en", at: 1), set("es", at: 9), set("fr", at: 4)], device: "en")
        #expect(picks.known.codes == ["es"])
        #expect(picks.root == "es")
        #expect(!picks.touched)
        #expect(picks.codesToSave(over: KnownLanguages([])) == ["es"])
    }

    @Test func thePromptFallsBackToTheDeviceLanguage() {
        #expect(KnownPrompt.seed(systems: [], device: "de").known.codes == ["de"])
        #expect(KnownPrompt.seed(systems: [set("la", at: 3)], device: "de").known.codes == ["de"])
    }

    @Test func theSettingsRowListsSpokenLanguagesDeviceFirst() {
        let name = { (c: String) in c.uppercased() }
        #expect(KnownPrompt.summary(KnownLanguages(["es", "en", "ja"], at: 1), device: "es", name: name) == "ES, EN, JA")
        #expect(KnownPrompt.summary(KnownLanguages([]), device: "fr", name: name) == "FR")
    }
}
