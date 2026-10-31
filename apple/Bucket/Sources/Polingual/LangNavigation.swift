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
        let now = Date().timeIntervalSince1970 * 1000
        let state = store.state(system.id)
        let sum = store.corpus.map { systemSummary(system, $0, state, now: now) }
        let fresh = langNewLeft(system, state, now: now)
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(system.name).font(.headline).foregroundStyle(Palette.ink).lineLimit(2).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 6) {
                    HStack(spacing: 3) {
                        ForEach(system.targets.prefix(4), id: \.self) { FlagTile(lang: $0, size: 18) }
                    }
                    if let sum {
                        Text("\(sum.started) of \(sum.total) · \(StreakGoal(streak: liveStreak(state, now: now)).day) day streak").font(.caption).foregroundStyle(Palette.muted).monospacedDigit()
                            .lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
            }
            Spacer(minLength: 0)
            CountPills(due: sum?.due ?? 0, new: fresh)
        }
        .padding(.vertical, 6)
    }
}

func langNewLeft(_ system: LangSystem, _ state: EngineState, now: Double) -> Int {
    system.targets.reduce(0) { $0 + max(0, Int(state.newPerDay) - newToday(state, $1, now: now)) }
}

struct CountPills: View {
    let due: Int
    let new: Int

    var body: some View {
        HStack(spacing: 6) {
            if due > 0 { pill("\(due) due", D8.vermilion) }
            if new > 0 { pill("\(new) new", D8.lapis) }
            if due == 0 && new == 0 {
                Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(D8.malachite).accessibilityLabel("Done for today")
            }
        }
    }

    func pill(_ t: String, _ c: Color) -> some View {
        Text(t).font(.system(size: 13, weight: .heavy, design: .rounded)).foregroundStyle(.white).monospacedDigit()
            .padding(.horizontal, 9).padding(.vertical, 4).background(c, in: .capsule)
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
            case .alphabet(let id, let lang): AlphabetStudy(systemId: id, lang: lang)
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
