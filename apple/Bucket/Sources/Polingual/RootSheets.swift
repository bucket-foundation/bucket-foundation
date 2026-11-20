import SwiftUI

enum RootSheet: String, CaseIterable {
    case gate, saveProgress, paywall, ageRange, memberName, inviteSignIn, inviteJoin, knownLanguages, progressChoice
}

@MainActor
@Observable
final class RootSheets {
    static let shared = RootSheets()
    private(set) var open: Set<RootSheet> = []
    private(set) var held: Set<RootSheet> = []

    func set(_ sheet: RootSheet, _ on: Bool) {
        if on {
            open.insert(sheet)
            held.remove(sheet)
        } else {
            open.remove(sheet)
        }
    }

    func claim(_ sheet: RootSheet) -> Bool {
        guard !covered(besides: sheet) else { return false }
        set(sheet, true)
        return true
    }

    func hold(_ sheet: RootSheet, _ on: Bool) {
        if on, !open.contains(sheet) { held.insert(sheet) } else { held.remove(sheet) }
    }

    static func attempts(_ spent: Int, claimed: Bool) -> Int {
        claimed ? spent + 1 : spent
    }

    func covered(besides sheet: RootSheet) -> Bool {
        !open.subtracting([sheet]).isEmpty
    }
}

extension View {
    func rootSheet(_ sheet: RootSheet, open: Bool) -> some View {
        onChange(of: open, initial: true) { _, on in RootSheets.shared.set(sheet, on) }
            .onDisappear {
                RootSheets.shared.set(sheet, false)
                RootSheets.shared.hold(sheet, false)
            }
    }

    func rootSheetProbe() -> some View {
        #if DEBUG
        overlay(alignment: .topLeading) {
            if Launch.flag("-rootSheetProbe") {
                Color.clear
                    .frame(width: 1, height: 1)
                    .accessibilityElement()
                    .accessibilityIdentifier("rootSheetsHeld")
                    .accessibilityValue(Text(verbatim: RootSheets.shared.held.map(\.rawValue).sorted().joined(separator: ",")))
            }
        }
        #else
        self
        #endif
    }
}
