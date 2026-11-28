import Foundation

public struct SpokenWord: Equatable, Sendable {
    public let lang: String
    public let word: String
    public let ipa: String
    public let accepts: [String]

    public func heard(_ alts: [String]) -> Bool {
        ([word] + accepts).contains { LetterSounds.heard(alts, say: $0) }
    }
}

public enum SpokenWin {
    public static let words: [String: SpokenWord] = [
        "en": SpokenWord(lang: "en", word: "hello", ipa: "həˈloʊ", accepts: ["hallo", "hullo"]),
        "es": SpokenWord(lang: "es", word: "hola", ipa: "ˈola", accepts: []),
        "fr": SpokenWord(lang: "fr", word: "bonjour", ipa: "bɔ̃ʒuʁ", accepts: []),
        "it": SpokenWord(lang: "it", word: "ciao", ipa: "ˈtʃao", accepts: []),
        "pt": SpokenWord(lang: "pt", word: "olá", ipa: "oˈla", accepts: []),
        "de": SpokenWord(lang: "de", word: "hallo", ipa: "ˈhalo", accepts: []),
        "nl": SpokenWord(lang: "nl", word: "hallo", ipa: "ˈɦɑloː", accepts: []),
        "sv": SpokenWord(lang: "sv", word: "hej", ipa: "hɛj", accepts: []),
        "pl": SpokenWord(lang: "pl", word: "cześć", ipa: "t͡ʂɛɕt͡ɕ", accepts: []),
        "fi": SpokenWord(lang: "fi", word: "hei", ipa: "hei̯", accepts: []),
        "ru": SpokenWord(lang: "ru", word: "привет", ipa: "prʲɪˈvʲet", accepts: []),
        "el": SpokenWord(lang: "el", word: "γεια", ipa: "ʝa", accepts: ["γειά", "γεια σου"]),
        "ar": SpokenWord(lang: "ar", word: "مرحبا", ipa: "marħaban", accepts: ["مرحباً"]),
        "hi": SpokenWord(lang: "hi", word: "नमस्ते", ipa: "nəməsteː", accepts: []),
        "ja": SpokenWord(lang: "ja", word: "こんにちは", ipa: "koɲɲitɕiwa", accepts: ["今日は", "こんにちわ"]),
        "zh": SpokenWord(lang: "zh", word: "你好", ipa: "nǐ hǎo", accepts: []),
        "ko": SpokenWord(lang: "ko", word: "안녕하세요", ipa: "annjʌŋhasejo", accepts: ["안녕"]),
        "he": SpokenWord(lang: "he", word: "שלום", ipa: "ʃaˈlom", accepts: []),
        "fa": SpokenWord(lang: "fa", word: "سلام", ipa: "sæˈlɒːm", accepts: []),
        "tr": SpokenWord(lang: "tr", word: "merhaba", ipa: "ˈmeɾhaba", accepts: []),
        "cs": SpokenWord(lang: "cs", word: "ahoj", ipa: "ˈaɦoj", accepts: []),
        "id": SpokenWord(lang: "id", word: "halo", ipa: "ˈhalo", accepts: []),
        "vi": SpokenWord(lang: "vi", word: "xin chào", ipa: "sin t͡ɕaːw˨˩", accepts: ["chào"]),
        "th": SpokenWord(lang: "th", word: "สวัสดี", ipa: "sà.wàt.dīː", accepts: []),
        "ta": SpokenWord(lang: "ta", word: "வணக்கம்", ipa: "ʋaɳakkam", accepts: []),
        "la": SpokenWord(lang: "la", word: "salve", ipa: "ˈsalwe", accepts: []),
    ]

    public static func shown(_ targets: [String]) -> [SpokenWord] {
        targets.compactMap { words[$0] }
    }

    public static func spoken(_ targets: [String], canHear: (String) -> Bool) -> SpokenWord? {
        shown(targets).first { canHear($0.lang) }
    }
}
