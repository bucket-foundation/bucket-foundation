public enum AccountStatusSlot: Equatable, Sendable {
    case signInSection, signInSheet, page

    public static func slot(stage: Account.Stage, emailing: Bool) -> Self {
        if stage == .signedIn { return .page }
        return emailing ? .signInSheet : .signInSection
    }
}
