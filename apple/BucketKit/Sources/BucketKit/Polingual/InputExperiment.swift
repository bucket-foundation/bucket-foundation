import Foundation

public enum InputExperiment {
    public static let experimentId = "ci14-share-v1"
    public static let armIds = ["s50", "s70", "s90"]
    public static let armShares: [String: Double] = ["s50": 0.5, "s70": 0.7, "s90": 0.9]
    public static let notFilledSuffix = "-x"
    public static let fillShare = 0.9

    public struct Consent: Equatable, Sendable {
        public var flag: Bool
        public var uploadOpen: Bool
        public var disclosed: Bool
        public var optedOut: Bool
        public init(flag: Bool, uploadOpen: Bool, disclosed: Bool, optedOut: Bool) {
            self.flag = flag; self.uploadOpen = uploadOpen; self.disclosed = disclosed; self.optedOut = optedOut
        }
    }

    public struct Enrolment: Equatable, Sendable, Codable {
        public var experiment: String
        public var key: String
        public var arm: String
        public var stratum: String
        public var at: Double
    }

    public struct ExperimentMix: Equatable, Sendable {
        public var mix: SessionMix.InputMix
        public var arm: String?
        public var enrolment: Enrolment?
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

    public static func enrolmentKey(account: String?, device: String) -> String {
        if let a = account, !a.isEmpty { return "acct:\(a)" }
        return "dev:\(device)"
    }

    public static func assignArm(_ key: String) -> String {
        armIds[Int(fnv1a32("\(experimentId):\(key)") % UInt32(armIds.count))]
    }

    public static func canFill(cards: Int, eligibleUnitSeconds: [Double]) -> Bool {
        let eligible = eligibleUnitSeconds.filter { $0 > 0 }.reduce(0, +)
        let cardTime = Double(max(0, cards)) * SessionMix.cardSeconds
        return eligible > 0 && (cardTime == 0 || eligible / (eligible + cardTime) >= fillShare)
    }

    public static func mayTakePart(_ c: Consent) -> Bool { c.flag && c.uploadOpen && c.disclosed && !c.optedOut }

    public static func mix(consent: Consent, enrolment: Enrolment?, key: String?, tier: Int, cards: Int, eligibleUnitSeconds: [Double], now: Double) -> ExperimentMix {
        let plain = SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligibleUnitSeconds)
        guard mayTakePart(consent) else { return ExperimentMix(mix: plain, arm: nil, enrolment: enrolment) }
        let filled = canFill(cards: cards, eligibleUnitSeconds: eligibleUnitSeconds)
        let e: Enrolment
        if let existing = enrolment { e = existing } else {
            guard filled, let k = key, !k.isEmpty else { return ExperimentMix(mix: plain, arm: nil, enrolment: nil) }
            let s = stratum(tier)
            e = Enrolment(experiment: experimentId, key: k, arm: assignArm(k), stratum: s, at: now)
        }
        guard filled else { return ExperimentMix(mix: plain, arm: e.arm + notFilledSuffix, enrolment: e) }
        return ExperimentMix(mix: SessionMix.planInputMix(tier: tier, cards: cards, eligibleUnitSeconds: eligibleUnitSeconds, targetShare: armShares[e.arm]), arm: e.arm, enrolment: e)
    }

    public static func parseEnrolment(_ data: Data?) -> Enrolment? {
        guard let data, let e = try? JSONDecoder().decode(Enrolment.self, from: data), e.experiment == experimentId, !e.key.isEmpty,
              armShares[e.arm] != nil, e.stratum == "to-a2" || e.stratum == "past-a2" else { return nil }
        return e
    }

    public static func heldOutWords(_ forms: [String: [YesNoTest.TestItem]]?) -> Set<String> {
        Set((forms ?? [:]).values.flatMap { $0 }.filter(\.real).map(\.word))
    }
}
