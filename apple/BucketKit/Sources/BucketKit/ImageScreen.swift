import Foundation
import ImageIO

public protocol ImageScreen: Sendable {
    func flagged(_ image: Data) async -> Bool
}

#if canImport(SensitiveContentAnalysis) && (os(iOS) || os(macOS))
import SensitiveContentAnalysis

public struct SensitiveImageScreen: ImageScreen {
    public init() {}

    public func flagged(_ image: Data) async -> Bool {
        let analyzer = SCSensitivityAnalyzer()
        guard analyzer.analysisPolicy != .disabled else { return false }
        guard let source = CGImageSourceCreateWithData(image as CFData, nil), let cg = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return true }
        do {
            return try await analyzer.analyzeImage(cg).isSensitive
        } catch {
            return true
        }
    }
}
#endif
