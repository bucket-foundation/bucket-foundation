import SwiftUI

public enum PL {
    public static let colorHex: [String: UInt32] = [
        "paper": 0xF6EEDC,
        "paper-2": 0xEFE3C8,
        "paper-3": 0xE3D6B8,
        "card": 0xFFF8EA,
        "white": 0xFFFFFF,
        "ink": 0x231F20,
        "ink-2": 0x3A0F2F,
        "ink-dim": 0x5D5650,
        "ink-faint": 0x8A8076,
        "tyrian": 0x5B1A4A,
        "tyrian-deep": 0x3A0F2F,
        "vermilion": 0xD9381E,
        "vermilion-deep": 0x8E2312,
        "lapis": 0x26428B,
        "lapis-deep": 0x172A5C,
        "lapis-soft": 0xC9D3EA,
        "ochre": 0xE9A23B,
        "ochre-deep": 0xA9701F,
        "malachite": 0x1E7A5A,
        "malachite-deep": 0x124B37,
        "maya": 0x6FB7C2,
        "hairline": 0x231F20,
        "hairline-2": 0x231F20,
        "paper-dim": 0xC9BFAE,
        "error": 0x9B2414,
        "dot": 0x231F20,
        "lip-soft": 0x231F20,
        "cream-veil": 0xF6EEDC,
        "gloss": 0xFFFFFF,
        "shadow": 0x000000,
    ]

    public static let colorAlpha: [String: Double] = [
        "paper": 1,
        "paper-2": 1,
        "paper-3": 1,
        "card": 1,
        "white": 1,
        "ink": 1,
        "ink-2": 1,
        "ink-dim": 1,
        "ink-faint": 1,
        "tyrian": 1,
        "tyrian-deep": 1,
        "vermilion": 1,
        "vermilion-deep": 1,
        "lapis": 1,
        "lapis-deep": 1,
        "lapis-soft": 1,
        "ochre": 1,
        "ochre-deep": 1,
        "malachite": 1,
        "malachite-deep": 1,
        "maya": 1,
        "hairline": 0.12,
        "hairline-2": 0.22,
        "paper-dim": 1,
        "error": 1,
        "dot": 0.07,
        "lip-soft": 0.08,
        "cream-veil": 0.92,
        "gloss": 0.45,
        "shadow": 0.35,
    ]

    public static let paper = Color(plHex: 0xF6EEDC, alpha: 1)
    public static let paper2 = Color(plHex: 0xEFE3C8, alpha: 1)
    public static let paper3 = Color(plHex: 0xE3D6B8, alpha: 1)
    public static let card = Color(plHex: 0xFFF8EA, alpha: 1)
    public static let white = Color(plHex: 0xFFFFFF, alpha: 1)
    public static let ink = Color(plHex: 0x231F20, alpha: 1)
    public static let ink2 = Color(plHex: 0x3A0F2F, alpha: 1)
    public static let inkDim = Color(plHex: 0x5D5650, alpha: 1)
    public static let inkFaint = Color(plHex: 0x8A8076, alpha: 1)
    public static let tyrian = Color(plHex: 0x5B1A4A, alpha: 1)
    public static let tyrianDeep = Color(plHex: 0x3A0F2F, alpha: 1)
    public static let vermilion = Color(plHex: 0xD9381E, alpha: 1)
    public static let vermilionDeep = Color(plHex: 0x8E2312, alpha: 1)
    public static let lapis = Color(plHex: 0x26428B, alpha: 1)
    public static let lapisDeep = Color(plHex: 0x172A5C, alpha: 1)
    public static let lapisSoft = Color(plHex: 0xC9D3EA, alpha: 1)
    public static let ochre = Color(plHex: 0xE9A23B, alpha: 1)
    public static let ochreDeep = Color(plHex: 0xA9701F, alpha: 1)
    public static let malachite = Color(plHex: 0x1E7A5A, alpha: 1)
    public static let malachiteDeep = Color(plHex: 0x124B37, alpha: 1)
    public static let maya = Color(plHex: 0x6FB7C2, alpha: 1)
    public static let hairline = Color(plHex: 0x231F20, alpha: 0.12)
    public static let hairline2 = Color(plHex: 0x231F20, alpha: 0.22)
    public static let paperDim = Color(plHex: 0xC9BFAE, alpha: 1)
    public static let error = Color(plHex: 0x9B2414, alpha: 1)
    public static let dot = Color(plHex: 0x231F20, alpha: 0.07)
    public static let lipSoft = Color(plHex: 0x231F20, alpha: 0.08)
    public static let creamVeil = Color(plHex: 0xF6EEDC, alpha: 0.92)
    public static let gloss = Color(plHex: 0xFFFFFF, alpha: 0.45)
    public static let shadow = Color(plHex: 0x000000, alpha: 0.35)

    public static let type: [String: PLTypeSpec] = [
        "hero": PLTypeSpec(family: .display, size: 52, weight: 700, line: 1.05),
        "title": PLTypeSpec(family: .display, size: 36, weight: 700, line: 1.1),
        "heading": PLTypeSpec(family: .display, size: 24, weight: 600, line: 1.15),
        "body": PLTypeSpec(family: .body, size: 17, weight: 500, line: 1.5),
        "small": PLTypeSpec(family: .body, size: 14, weight: 600, line: 1.4),
        "label": PLTypeSpec(family: .mono, size: 11, weight: 700, line: 1.3),
        "word": PLTypeSpec(family: .display, size: 44, weight: 600, line: 1),
    ]

    public static let hero = type["hero"]!
    public static let title = type["title"]!
    public static let heading = type["heading"]!
    public static let body = type["body"]!
    public static let small = type["small"]!
    public static let label = type["label"]!
    public static let word = type["word"]!

    public enum Radius {
        public static let all: [String: CGFloat] = ["sm": 10, "md": 14, "lg": 20, "xl": 24, "pill": 999]
        public static let sm: CGFloat = 10
        public static let md: CGFloat = 14
        public static let lg: CGFloat = 20
        public static let xl: CGFloat = 24
        public static let pill: CGFloat = 999
    }

    public enum Space {
        public static let all: [String: CGFloat] = ["1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 28, "7": 40, "8": 64]
        public static let s1: CGFloat = 4
        public static let s2: CGFloat = 8
        public static let s3: CGFloat = 12
        public static let s4: CGFloat = 16
        public static let s5: CGFloat = 20
        public static let s6: CGFloat = 28
        public static let s7: CGFloat = 40
        public static let s8: CGFloat = 64
    }

    public enum Lip {
        public static let all: [String: CGFloat] = ["sm": 2, "md": 4, "lg": 6]
        public static let sm: CGFloat = 2
        public static let md: CGFloat = 4
        public static let lg: CGFloat = 6
    }

    public enum Motion {
        public static let millis: [String: Int] = ["press": 100, "pop": 220, "settle": 420]
        public static let press: Double = 0.1
        public static let pop: Double = 0.22
        public static let settle: Double = 0.42
        public static let ease: [Double] = [0.2, 0.9, 0.3, 1.2]
    }
}
