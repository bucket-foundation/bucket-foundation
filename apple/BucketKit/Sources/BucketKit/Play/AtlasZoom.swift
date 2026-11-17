import CoreGraphics

public struct AtlasZoom: Sendable, Equatable {
    public static let most: CGFloat = 8
    public static let step: CGFloat = 2

    public var scale: CGFloat
    public var offset: CGSize

    public init(scale: CGFloat = 1, offset: CGSize = .zero) {
        self.scale = scale
        self.offset = offset
    }

    public var zoomed: Bool { scale > 1 }

    public func content(_ p: CGPoint) -> CGPoint {
        CGPoint(x: (p.x - offset.width) / scale, y: (p.y - offset.height) / scale)
    }

    public func screen(_ p: CGPoint) -> CGPoint {
        CGPoint(x: p.x * scale + offset.width, y: p.y * scale + offset.height)
    }

    public func scaled(to next: CGFloat, around anchor: CGPoint, in size: CGSize) -> AtlasZoom {
        let s = min(max(next, 1), Self.most)
        let held = content(anchor)
        return AtlasZoom(scale: s, offset: CGSize(width: anchor.x - held.x * s, height: anchor.y - held.y * s)).clamped(in: size)
    }

    public func moved(by t: CGSize, in size: CGSize) -> AtlasZoom {
        AtlasZoom(scale: scale, offset: CGSize(width: offset.width + t.width, height: offset.height + t.height)).clamped(in: size)
    }

    public func clamped(in size: CGSize) -> AtlasZoom {
        let s = min(max(scale, 1), Self.most)
        return AtlasZoom(scale: s, offset: CGSize(width: min(0, max(offset.width, size.width * (1 - s))), height: min(0, max(offset.height, size.height * (1 - s)))))
    }
}
