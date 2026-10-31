public enum FitScale {
    public static func scale(content: Double, available: Double) -> Double {
        guard content > 0, available > 0 else { return 1 }
        return min(1, available / content)
    }
}
