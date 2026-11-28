import Testing
@testable import BucketKit

@Test func spokenWinCoversEveryModernLanguage() {
    let modern = Lang.info.keys.filter { !["grc", "sa", "ang"].contains($0) }
    let missing = modern.filter { SpokenWin.words[$0] == nil }.sorted()
    #expect(missing.isEmpty, "\(missing)")
    #expect(SpokenWin.words.allSatisfy { $0.key == $0.value.lang && !$0.value.word.isEmpty })
}

@Test func spokenWinPicksTheFirstTargetTheDeviceCanHear() {
    #expect(SpokenWin.spoken(["fr", "es"], canHear: { _ in true })?.lang == "fr")
    #expect(SpokenWin.spoken(["fr", "es"], canHear: { $0 == "es" })?.lang == "es")
    #expect(SpokenWin.spoken(["sa", "grc"], canHear: { _ in true }) == nil)
    #expect(SpokenWin.spoken(["fr"], canHear: { _ in false }) == nil)
    #expect(SpokenWin.shown(["sa", "ja", "de"]).map(\.lang) == ["ja", "de"])
}

@Test func spokenWordAcceptsItsWordOrAnAlternateSpelling() {
    let ja = SpokenWin.words["ja"]!
    #expect(ja.heard(["今日は"]))
    #expect(ja.heard(["こんにちは。"]))
    #expect(!ja.heard(["こんばんは"]))
    let es = SpokenWin.words["es"]!
    #expect(es.heard(["Hola, buenos días"]))
    #expect(!es.heard(["ola"]))
    #expect(!es.heard([]))
    #expect(SpokenWin.words["vi"]!.heard(["Xin chào"]))
}
