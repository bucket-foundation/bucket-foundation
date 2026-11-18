import CoreGraphics

public enum PlayBoard {
    public static let most: CGFloat = 640

    public static func height(room: CGFloat, chrome: CGFloat, least: CGFloat) -> CGFloat {
        min(max(least, room - chrome), max(least, most))
    }
}
