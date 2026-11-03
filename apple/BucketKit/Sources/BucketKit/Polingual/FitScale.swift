public enum FitScale {
    public static let minTarget = 44.0
    public static let naturalTarget = 50.0
    public static let floor = 0.88

    public static func scale(content: Double, available: Double) -> Double {
        guard content > 0, available > 0 else { return 1 }
        return max(floor, min(1, available / content))
    }

    public static func overflows(content: Double, available: Double, scale: Double) -> Bool {
        content * scale > available + 0.5
    }
}
