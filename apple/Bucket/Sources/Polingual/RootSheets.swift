import SwiftUI

enum RootSheet: String, CaseIterable {
    case gate, saveProgress, paywall, ageRange, memberName, inviteSignIn, inviteJoin, knownLanguages
}

@MainActor
@Observable
final class RootSheets {
    static let shared = RootSheets()
    private(set) var open: Set<RootSheet> = []

    func set(_ sheet: RootSheet, _ on: Bool) {
        if on { open.insert(sheet) } else { open.remove(sheet) }
    }

    func claim(_ sheet: RootSheet) -> Bool {
        guard !covered(besides: sheet) else { return false }
        open.insert(sheet)
        return true
    }

    func covered(besides sheet: RootSheet) -> Bool {
        !open.subtracting([sheet]).isEmpty
    }
}

extension View {
    func rootSheet(_ sheet: RootSheet, open: Bool) -> some View {
        onChange(of: open, initial: true) { _, on in RootSheets.shared.set(sheet, on) }
            .onDisappear { RootSheets.shared.set(sheet, false) }
    }
}
