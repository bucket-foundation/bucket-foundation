import Foundation
import NaturalLanguage

public enum SentenceLanguage {
    public static func appleCode(_ lang: String) -> String {
        switch lang {
        case "zh": "zh-Hans"
        default: lang
        }
    }

    public static func isSentence(_ text: String) -> Bool {
        text.split(whereSeparator: \.isWhitespace).count > 1
    }

    public static func detect(_ text: String, among langs: [String]) -> String? {
        let recognizer = NLLanguageRecognizer()
        let allowed = langs.map { NLLanguage(rawValue: appleCode($0)) }
        if !allowed.isEmpty { recognizer.languageConstraints = allowed }
        recognizer.processString(text)
        guard let best = recognizer.dominantLanguage else { return nil }
        return langs.first { appleCode($0) == best.rawValue }
    }
}
