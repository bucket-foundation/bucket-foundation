import CoreGraphics

public enum PLArt: String, CaseIterable, Sendable {
    case ticket = "ticket"
    case tornLabel = "torn-label"
    case seal = "seal"
    case kente = "kente"
    case pebble = "pebble"
    case azulejo = "azulejo"
    case azulejoGrid = "azulejo-grid"
    case girih = "girih"
    case flagBand = "flag-band"
    case streakFlame = "streak-flame"
    case streakPot = "streak-pot"
    case star = "star"
    case blocks = "blocks"
    case brush = "brush"
    case bunting = "bunting"
    case scriptRu = "script-ru"
    case scriptKo = "script-ko"
    case scriptHe = "script-he"
    case calligraphyAin = "calligraphy-ain"
    case calligraphyYong = "calligraphy-yong"
    case inkDot = "ink-dot"
    case skKente = "sk-kente"
    case skAzulejo = "sk-azulejo"
    case skGirih = "sk-girih"
    case skSeal = "sk-seal"
    case skPaisley = "sk-paisley"
    case skMudcloth = "sk-mudcloth"

    public var label: String {
        switch self {
        case .ticket: "Ticket stamp"
        case .tornLabel: "Torn label"
        case .seal: "Red seal"
        case .kente: "Kente strip"
        case .pebble: "Red pebble"
        case .azulejo: "Azulejo tile"
        case .azulejoGrid: "Azulejo rings"
        case .girih: "Girih lattice"
        case .flagBand: "Flag band"
        case .streakFlame: "Streak flame"
        case .streakPot: "Streak pot"
        case .star: "Star piece"
        case .blocks: "Puzzle blocks"
        case .brush: "Brush stroke"
        case .bunting: "Pennant bunting"
        case .scriptRu: "Script сто"
        case .scriptKo: "Script 백"
        case .scriptHe: "Script מאה"
        case .calligraphyAin: "Calligraphy ع"
        case .calligraphyYong: "Calligraphy 永"
        case .inkDot: "Ink dot"
        case .skKente: "Kente swatch"
        case .skAzulejo: "Azulejo swatch"
        case .skGirih: "Girih swatch"
        case .skSeal: "Seal swatch"
        case .skPaisley: "Paisley swatch"
        case .skMudcloth: "Mudcloth swatch"
        }
    }

    public var size: CGSize {
        switch self {
        case .ticket: CGSize(width: 260, height: 120)
        case .tornLabel: CGSize(width: 220, height: 110)
        case .seal: CGSize(width: 150, height: 150)
        case .kente: CGSize(width: 300, height: 90)
        case .pebble: CGSize(width: 110, height: 150)
        case .azulejo: CGSize(width: 170, height: 170)
        case .azulejoGrid: CGSize(width: 160, height: 160)
        case .girih: CGSize(width: 180, height: 180)
        case .flagBand: CGSize(width: 600, height: 18)
        case .streakFlame: CGSize(width: 34, height: 44)
        case .streakPot: CGSize(width: 100, height: 184)
        case .star: CGSize(width: 150, height: 140)
        case .blocks: CGSize(width: 170, height: 150)
        case .brush: CGSize(width: 600, height: 200)
        case .bunting: CGSize(width: 300, height: 110)
        case .scriptRu: CGSize(width: 80, height: 60)
        case .scriptKo: CGSize(width: 80, height: 60)
        case .scriptHe: CGSize(width: 80, height: 60)
        case .calligraphyAin: CGSize(width: 200, height: 200)
        case .calligraphyYong: CGSize(width: 200, height: 200)
        case .inkDot: CGSize(width: 40, height: 40)
        case .skKente: CGSize(width: 48, height: 48)
        case .skAzulejo: CGSize(width: 48, height: 48)
        case .skGirih: CGSize(width: 48, height: 48)
        case .skSeal: CGSize(width: 48, height: 48)
        case .skPaisley: CGSize(width: 48, height: 48)
        case .skMudcloth: CGSize(width: 48, height: 48)
        }
    }

    public var dark: Bool {
        switch self {
        case .ticket: false
        case .tornLabel: false
        case .seal: false
        case .kente: false
        case .pebble: false
        case .azulejo: false
        case .azulejoGrid: false
        case .girih: false
        case .flagBand: false
        case .streakFlame: false
        case .streakPot: false
        case .star: false
        case .blocks: false
        case .brush: false
        case .bunting: false
        case .scriptRu: true
        case .scriptKo: true
        case .scriptHe: true
        case .calligraphyAin: true
        case .calligraphyYong: true
        case .inkDot: true
        case .skKente: false
        case .skAzulejo: false
        case .skGirih: false
        case .skSeal: false
        case .skPaisley: false
        case .skMudcloth: false
        }
    }
}
