import CoreGraphics

public enum PlayBoard {
    public static let most: CGFloat = 640
    public static let sideLeast: CGFloat = 200

    public static func height(room: CGFloat, chrome: CGFloat, least: CGFloat) -> CGFloat {
        min(max(least, room - chrome), max(least, most))
    }

    public static func side(width: CGFloat, wanted: CGFloat, board: CGFloat) -> CGFloat {
        max(sideLeast, min(wanted, width - board))
    }
}
