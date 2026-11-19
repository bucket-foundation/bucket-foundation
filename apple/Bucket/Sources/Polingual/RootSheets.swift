import SwiftUI

enum RootSheet: String, CaseIterable {
    case gate, saveProgress, ageRange, memberName, inviteSignIn, inviteJoin, knownLanguages
}

@MainActor
@Observable
final class RootSheets {
    static let shared = RootSheets()
    private(set) var open: Set<RootSheet> = []

    func set(_ sheet: RootSheet, _ on: Bool) {
        if on { open.insert(sheet) } else { open.remove(sheet) }
    }

    func covered(besides sheet: RootSheet) -> Bool {
        !open.subtracting([sheet]).isEmpty
    }
}

extension View {
    func rootSheet(_ sheet: RootSheet, open: Bool) -> some View {
        onChange(of: open, initial: true) { _, on in RootSheets.shared.set(sheet, on) }
    }
}
