import Foundation

public enum InputExperiment {
    public static let experimentId = "ci14-share-v1"
    public static let armIds = ["s50", "s70", "s90"]
    public static let armShares: [String: Double] = ["s50": 0.5, "s70": 0.7, "s90": 0.9]
    public static let notFilledSuffix = "-x"
    public static let fillShare = 0.9

    public struct ExperimentMix: Equatable, Sendable {
        public var mix: SessionMix.InputMix
        public var arm: String?
    }

    public static func on(_ flag: String?) -> Bool { flag == "1" }

    public static func stratum(_ tier: Int) -> String { tier <= SessionMix.a2TopTier ? "to-a2" : "past-a2" }

    public static func fnv1a32(_ s: String) -> UInt32 {
        var h: UInt32 = 0x811c9dc5
        for b in s.utf8 {
            h ^= UInt32(b)
            h = h &* 0x01000193
        }
        return h
    }

    public static func assignArm(_ userKey: String, tier: Int) -> String {
        armIds[Int(fnv1a32("\(experimentId):\(stratum(tier)):\(userKey)") % UInt32(armIds.count))]
    }

    public static func canFill(cards: Int, eligibleUnitSeconds: [Double]) -> Bool {
        let eligible = eligibleUnitSeconds.filter { $0 > 0 }.reduce(0, +)
        let cardTime = Double(max(0, cards)) * SessionMix.cardSeconds
        return eligible > 0 && (cardTime == 0 || eligible / (eligible + cardTime) >= fillShare)
    }

    public static func mix(on: Bool, userKey: String?, tier: Int, cards: Int, eligibleUnitSeconds: [Double]) -> ExperimentMix {
        guard on, let key = userKey, !key.isEmpty else { return ExperimentMix(mix: SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligibleUnitSeconds), arm: nil) }
        let arm = assignArm(key, tier: tier)
        guard canFill(cards: cards, eligibleUnitSeconds: eligibleUnitSeconds) else {
            return ExperimentMix(mix: SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligibleUnitSeconds), arm: arm + notFilledSuffix)
        }
        return ExperimentMix(mix: SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligibleUnitSeconds, targetShare: armShares[arm]), arm: arm)
    }
}
