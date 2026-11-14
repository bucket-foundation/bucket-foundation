import Testing
@testable import BucketKit

struct LangPickerTests {
    let all = ["en", "es", "fr", "de", "ja", "zh", "ar"]

    @Test func recentComesFirstThenSuggestedThenTheRest() {
        let s = LangPicker.sections(query: "", recent: ["ja"], suggested: ["es", "ja", "fr"], all: all)
        #expect(s.map(\.group) == [.recent, .suggested, .all])
        #expect(s[0].codes == ["ja"])
        #expect(s[1].codes == ["es", "fr"])
        #expect(s[2].codes == ["en", "de", "zh", "ar"])
    }

    @Test func recentDropsCodesTheCorpusLacks() {
        let s = LangPicker.sections(query: "", recent: ["xx", "de"], suggested: [], all: all)
        #expect(s.first?.codes == ["de"])
    }

    @Test func searchMatchesEnglishAndNativeNamesAndCodes() {
        #expect(LangPicker.sections(query: "Deu", recent: [], suggested: [], all: all).flatMap(\.codes) == ["de"])
        #expect(LangPicker.sections(query: "german", recent: [], suggested: [], all: all).flatMap(\.codes) == ["de"])
        #expect(LangPicker.sections(query: "日本", recent: [], suggested: [], all: all).flatMap(\.codes) == ["ja"])
        #expect(LangPicker.sections(query: "espanol", recent: [], suggested: [], all: all).flatMap(\.codes) == ["es"])
        #expect(LangPicker.sections(query: "zh", recent: [], suggested: [], all: all).flatMap(\.codes) == ["zh"])
    }

    @Test func searchMatchesTheInterfaceLanguageName() {
        let s = LangPicker.sections(query: "Alemán", recent: [], suggested: [], all: all, alias: { $0 == "de" ? "alemán" : "" })
        #expect(s.flatMap(\.codes) == ["de"])
    }

    @Test func searchKeepsRecentAndSuggestedOrderInOneList() {
        let s = LangPicker.sections(query: "e", recent: ["fr"], suggested: ["es"], all: all)
        #expect(s.count == 1)
        #expect(s[0].group == .all)
        #expect(Array(s[0].codes.prefix(2)) == ["fr", "es"])
    }

    @Test func emptySearchResultHasNoSections() {
        #expect(LangPicker.sections(query: "qqq", recent: ["fr"], suggested: ["es"], all: all).isEmpty)
    }

    @Test func rememberMovesToFrontAndCaps() {
        #expect(LangPicker.remember("de", in: ["fr", "de", "es", "ja", "zh"]) == ["de", "fr", "es", "ja"])
    }

    @Test func swapTradesSourceWithFirstTarget() {
        let r = LangPicker.swap(from: "en", detected: nil, targets: ["es", "fr"])
        #expect(r?.from == "es")
        #expect(r?.targets == ["en", "fr"])
    }

    @Test func swapUsesDetectedWhenSourceIsAuto() {
        let r = LangPicker.swap(from: nil, detected: "de", targets: ["en"])
        #expect(r?.from == "en")
        #expect(r?.targets == ["de"])
    }

    @Test func swapDropsDuplicateSourceAlreadyInTargets() {
        let r = LangPicker.swap(from: "en", detected: nil, targets: ["es", "en", "fr"])
        #expect(r?.targets == ["en", "fr"])
    }

    @Test func swapNeedsASourceAndADifferentTarget() {
        #expect(LangPicker.swap(from: nil, detected: nil, targets: ["es"]) == nil)
        #expect(LangPicker.swap(from: "es", detected: nil, targets: ["es"]) == nil)
        #expect(LangPicker.swap(from: "es", detected: nil, targets: []) == nil)
    }

    @Test func everyLanguageHasANativeName() {
        #expect(Lang.codes.allSatisfy { LangPicker.native[$0] != nil })
    }
}
