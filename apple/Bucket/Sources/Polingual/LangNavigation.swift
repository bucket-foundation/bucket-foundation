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

extension NavigationPath {
    mutating func replaceTop<V: Hashable>(with route: V) {
        if !isEmpty { removeLast() }
        append(route)
    }
}

extension View {
    func langDestinations(path: Binding<NavigationPath>) -> some View {
        navigationDestination(for: LangRoute.self) { route in
            switch route {
            case .system(let id): SystemView(path: path, systemId: id)
            case .study(let id): StudyView(path: path, systemId: id).fullHeightSession().id(id)
            case .place(let id, let lang): PlacementView(path: path, systemId: id, requested: lang).fullHeightSession()
            case .alphabet(let id, let lang): AlphabetStudy(systemId: id, lang: lang).fullHeightSession()
            case .reference(let lang): LanguageReference(lang: lang)
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
