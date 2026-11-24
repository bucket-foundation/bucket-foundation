import CoreGraphics

public enum NightTiles {
    public struct Fit: Sendable, Equatable {
        public let side: CGFloat
        public let row: Bool
    }

    public static func fit(width: CGFloat, height: CGFloat, compact: Bool) -> Fit {
        let rowSide = min((width - 48) / 4, height - (compact ? 16 : 48), 96)
        let gridSide = min((width - 16) / 2, (height - 44) / 2, 170)
        let row = compact || rowSide > gridSide
        return Fit(side: max(row ? rowSide : gridSide, 0), row: row)
    }
}
