import Foundation

public enum WebGame: String, CaseIterable, Sendable {
    case polyword, flagTiles = "flag-tiles", babel = "babel-match", shift, snake = "word-snake", atlas = "voice-atlas", forehead, iSpy = "ispy", sameWord = "same-word"

    public var route: String { rawValue }

    public var title: String {
        switch self {
        case .polyword: "Polyword"
        case .flagTiles: "Flag Tiles"
        case .babel: "Babel Match"
        case .shift: "Shift"
        case .snake: "Word Snake"
        case .atlas: "Voice Atlas"
        case .forehead: "Forehead"
        case .iSpy: "I Spy"
        case .sameWord: "Same Word"
        }
    }

    public var blurb: String {
        switch self {
        case .polyword: "One word a day. Every miss shows its meaning in another language."
        case .flagTiles: "Solo daily run. A word falls; tap the flag of its language."
        case .babel: "Match-3 with words. Three that mean the same thing clear."
        case .shift: "Daily letter board. Slide columns to spell words in two languages."
        case .snake: "Arena with bot snakes. Eat words in your language, dodge the decoys."
        case .atlas: "Five words a day. Hear one, pin where its language is spoken."
        case .forehead: "Party mode on one phone. Friends give clues, you tilt to score."
        case .iSpy: "Spot the thing, say it in the language of the round."
        case .sameWord: "One meaning across languages. A live room with friends."
        }
    }

    public var art: String {
        switch self {
        case .polyword: "streak-flame"
        case .flagTiles: "kente"
        case .babel: "blocks"
        case .shift: "torn-label"
        case .snake: "brush"
        case .atlas: "azulejo"
        case .forehead: "ticket"
        case .iSpy: "star"
        case .sameWord: "seal"
        }
    }

    public var tilt: Double {
        switch self {
        case .polyword: 6
        case .flagTiles: -10
        case .babel: -8
        case .shift: 5
        case .snake: -6
        case .atlas: 8
        case .forehead: 6
        case .iSpy: -12
        case .sameWord: -7
        }
    }
}

public enum WebGames {
    public static let ready: Set<String> = ["polyword", "flag-tiles", "babel-match", "shift", "word-snake", "voice-atlas", "forehead", "ispy", "same-word"]
}
