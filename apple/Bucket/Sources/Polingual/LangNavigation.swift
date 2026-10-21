import BucketKit
import SwiftUI

@MainActor
@Observable
final class Gate {
    let account: Account
    var asking = false
    @ObservationIgnored private var pending: (() -> Void)?

    init(account: Account) { self.account = account }

    var guest: Bool { account.stage != .signedIn }

    func require(_ action: @escaping () -> Void) {
        if !guest {
            action()
            return
        }
        pending = action
        asking = true
    }

    func signedIn() {
        asking = false
        let run = pending
        pending = nil
        run?()
    }

    func dismissed() {
        pending = nil
    }
}

struct LangSystemRow: View {
    @Environment(LangStore.self) private var store
    let system: LangSystem

    var body: some View {
        let sum = store.corpus.map { systemSummary(system, $0, store.state(system.id), now: Date().timeIntervalSince1970 * 1000) }
        VStack(alignment: .leading, spacing: 3) {
            Text(system.name).font(.serif(.headline)).foregroundStyle(Palette.ink)
            if let sum {
                Text("\(sum.due) due · \(sum.started) of \(sum.total) cards · \(Int(sum.streak)) day streak")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                    .monospacedDigit()
            }
        }
        .padding(.vertical, 6)
    }
}

extension View {
    func langDestinations(path: Binding<NavigationPath>) -> some View {
        navigationDestination(for: LangRoute.self) { route in
            switch route {
            case .home: LanguagesHome(path: path)
            case .system(let id): SystemView(path: path, systemId: id)
            case .study(let id): StudyView(path: path, systemId: id)
            case .place(let id, let lang): PlacementView(path: path, systemId: id, requested: lang)
            }
        }
    }
}

struct GateSheet: View {
    @Environment(Gate.self) private var gate
    @Environment(Account.self) private var account

    var body: some View {
        AccountView()
            .onChange(of: account.stage) { _, stage in
                if stage == .signedIn { gate.signedIn() }
            }
    }
}
