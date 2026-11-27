import BucketKit
import Testing
@testable import Polingual

@MainActor
struct GamesSetStartTests {
    @Test func presetsDropTheRootLanguage() {
        let presets = GamesSetStart.presets(root: "es")
        #expect(presets.allSatisfy { !$0.targets.contains("es") })
        #expect(presets.first { $0.name == "Romance" }?.targets == ["fr", "it"])
    }

    @Test func presetsLeftEmptyAreHidden() {
        let presets = GamesSetStart.presets(root: "en")
        #expect(presets.allSatisfy { !$0.targets.isEmpty })
        #expect(presets.count == LanguageSections.presets.count)
    }

    @Test func everyPresetMakesAValidFirstSet() {
        for root in ["en", "es", "ja", "ru"] {
            for p in GamesSetStart.presets(root: root) {
                #expect(validateSystem(root, p.targets, []) == nil, "\(root) \(p.name)")
            }
        }
    }

    @Test func onboardingOffersEveryLanguageGroup() {
        let picks = KnownPicks(device: "en")
        let presets = picks.presets(LanguageSections.presets)
        let shown = presets.map(\.name)
        #expect(shown.count > Lang.presets.count)
        #expect(["Slavic", "Middle Eastern", "South Asian", "Classical"].allSatisfy(shown.contains))
        #expect(presets.allSatisfy { !$0.targets.contains(picks.root) })
    }
}
