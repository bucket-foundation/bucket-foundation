public enum PLGlyph: String, CaseIterable, Sendable {
    case share
    case mic
    case plus
    case check
    case search
    case close
    case chevronDown
    case speaker
    case play
    case stop

    public var path: String {
        switch self {
        case .share: "M8 10H6V20H18V10H16M12 3V14M8 7L12 3L16 7"
        case .mic: "M9 6C9 2.5 15 2.5 15 6V11C15 14.5 9 14.5 9 11ZM5 11C5 19 19 19 19 11M12 17V21M8 21H16"
        case .plus: "M12 5V19M5 12H19"
        case .check: "M5 12.5L10 17.5L19 7"
        case .search: "M10.5 4C14.1 4 17 6.9 17 10.5C17 14.1 14.1 17 10.5 17C6.9 17 4 14.1 4 10.5C4 6.9 6.9 4 10.5 4ZM15.5 15.5L20 20"
        case .close: "M6 6L18 18M18 6L6 18"
        case .chevronDown: "M6 9L12 15L18 9"
        case .speaker: "M4 9H8L13 5V19L8 15H4ZM16 9C17.5 10.5 17.5 13.5 16 15M18.5 6.5C21.5 9.5 21.5 14.5 18.5 17.5"
        case .play: "M8 5L19 12L8 19Z"
        case .stop: "M7 7H17V17H7Z"
        }
    }
}
