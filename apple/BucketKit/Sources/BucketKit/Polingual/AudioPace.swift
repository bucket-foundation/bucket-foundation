public struct VoiceLine: Sendable, Equatable {
    public let lang: String
    public let text: String

    public init(lang: String, text: String) {
        self.lang = lang
        self.text = text
    }
}

public enum AudioPace {
    public static let every = 5
    public static let maxVoices = 4

    public static func due(_ offers: Int) -> Bool { offers % every == 0 }

    public static func chorus(lead: VoiceLine, targets: [String], root: String, form: (String) -> String?) -> [VoiceLine] {
        let others = targets.filter { $0 != lead.lang }.compactMap { l in form(l).map { VoiceLine(lang: l, text: $0) } }
        var lines = [lead] + others
        if lines.count < 2, root != lead.lang, let word = form(root) { lines.append(VoiceLine(lang: root, text: word)) }
        return Array(lines.prefix(maxVoices))
    }
}
