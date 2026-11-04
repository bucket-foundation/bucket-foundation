import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

@MainActor
public protocol ShareDonor: AnyObject {
    func publish(_ targets: [ShareTarget], donate: Bool)
    func donate(_ target: ShareTarget)
    func forgetAll()
}

public enum ShareAvatar {
    static let palette: [(CGFloat, CGFloat, CGFloat)] = [
        (0.16, 0.50, 0.38), (0.80, 0.33, 0.20), (0.20, 0.36, 0.62), (0.62, 0.42, 0.12), (0.45, 0.28, 0.58), (0.12, 0.47, 0.55),
    ]

    public static func colorIndex(_ seed: String) -> Int {
        Int(seed.unicodeScalars.reduce(UInt32(5381)) { ($0 &* 33) &+ $1.value } % UInt32(palette.count))
    }

    public static func png(initials: String, seed: String, size: Int = 180) -> Data? {
        let space = CGColorSpaceCreateDeviceRGB()
        guard let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        let (r, g, b) = palette[colorIndex(seed)]
        ctx.setFillColor(CGColor(red: r, green: g, blue: b, alpha: 1))
        ctx.fillEllipse(in: CGRect(x: 0, y: 0, width: size, height: size))
        let font = CTFontCreateWithName("HelveticaNeue-Bold" as CFString, CGFloat(size) * 0.4, nil)
        let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font, NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 1, blue: 1, alpha: 1)]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: String(initials.prefix(2)), attributes: attrs))
        let bounds = CTLineGetImageBounds(line, ctx)
        ctx.textPosition = CGPoint(x: (CGFloat(size) - bounds.width) / 2 - bounds.minX, y: (CGFloat(size) - bounds.height) / 2 - bounds.minY)
        CTLineDraw(line, ctx)
        guard let image = ctx.makeImage() else { return nil }
        let out = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(out, UTType.png.identifier as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, image, nil)
        return CGImageDestinationFinalize(dest) ? out as Data : nil
    }
}

public enum ShareImage {
    public static let maxBytes = 1_400_000

    public static func jpeg(_ data: Data, maxPixel: Int = 1600) -> Data? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        let opts: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: maxPixel]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, opts as CFDictionary) else { return nil }
        for quality in [0.8, 0.65, 0.5, 0.35] {
            let out = NSMutableData()
            guard let dest = CGImageDestinationCreateWithData(out, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
            CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
            guard CGImageDestinationFinalize(dest) else { return nil }
            if out.length <= maxBytes { return out as Data }
        }
        return maxPixel > 600 ? jpeg(data, maxPixel: maxPixel / 2) : nil
    }
}

#if os(iOS) || os(macOS)
import Intents

public enum ShareIntents {
    public static func intent(for target: ShareTarget, avatar: Data? = nil) -> INSendMessageIntent {
        let image = avatar.map { INImage(imageData: $0) }
        let recipients = target.recipients.map { r in
            INPerson(personHandle: INPersonHandle(value: r.userId, type: .unknown), nameComponents: nil, displayName: r.name, image: target.isGroup ? nil : image, contactIdentifier: nil, customIdentifier: r.userId)
        }
        let intent = INSendMessageIntent(
            recipients: recipients,
            outgoingMessageType: .outgoingMessageText,
            content: nil,
            speakableGroupName: target.isGroup ? INSpeakableString(spokenPhrase: target.name) : nil,
            conversationIdentifier: target.conversationId,
            serviceName: nil,
            sender: nil,
            attachments: nil
        )
        #if os(iOS)
        if target.isGroup, let image { intent.setImage(image, forParameterNamed: \.speakableGroupName) }
        #endif
        return intent
    }

    public static func interaction(for target: ShareTarget) -> INInteraction {
        let i = INInteraction(intent: intent(for: target, avatar: ShareAvatar.png(initials: target.initials, seed: target.conversationId)), response: nil)
        i.direction = .outgoing
        i.groupIdentifier = target.conversationId
        return i
    }

    public static func target(of intent: INSendMessageIntent, in targets: [ShareTarget]) -> ShareTarget? {
        intent.conversationIdentifier.flatMap { ShareTargets.find($0, in: targets) }
    }
}

@MainActor
public final class IntentShareDonor: ShareDonor {
    public let cache: ShareTargetCache
    let now: () -> Date

    public init(appGroup: String?, now: @escaping () -> Date = { .now }) {
        cache = ShareTargetCache(suite: appGroup)
        self.now = now
    }

    public func publish(_ targets: [ShareTarget], donate: Bool) {
        let plan = ShareDonationPlan.make(old: cache.load(), new: targets, lastDonated: cache.lastDonated, now: now(), donate: donate)
        cache.save(targets)
        for id in plan.forget { INInteraction.delete(with: id, completion: nil) }
        guard !plan.donate.isEmpty else { return }
        if plan.donate.count == targets.count { cache.lastDonated = now() }
        for t in plan.donate { ShareIntents.interaction(for: t).donate(completion: nil) }
    }

    public func donate(_ target: ShareTarget) {
        ShareIntents.interaction(for: target).donate(completion: nil)
    }

    public func forgetAll() {
        cache.clear()
        INInteraction.deleteAll(completion: nil)
    }
}
#endif
