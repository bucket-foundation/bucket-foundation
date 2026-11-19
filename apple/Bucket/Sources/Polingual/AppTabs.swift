import BucketKit
import SwiftUI

enum AppTab: String, Hashable { case today, learn, games, account }

extension SharedLink {
    var tab: AppTab {
        switch self {
        case .word, .home, .share: .today
        case .langs, .deck, .atom, .content, .voice: .learn
        case .group: .account
        }
    }
}

extension AppTab {
    static func following(_ link: SharedLink?, current: AppTab) -> AppTab {
        link?.tab ?? current
    }
}

extension View {
    func linkTabs(_ tab: Binding<AppTab>) -> some View {
        onChange(of: DeepLink.shared.pending, initial: true) { _, link in
            tab.wrappedValue = AppTab.following(link, current: tab.wrappedValue)
            if link == .home { DeepLink.shared.pending = nil }
        }
    }
}

enum SessionChange: Equatable {
    case signedIn, endedByUser, none

    static func of(old: Account.Stage, new: Account.Stage, endedByUser: Bool) -> SessionChange {
        if new == .signedIn && old != .signedIn { return .signedIn }
        if new == .signedOut && old == .signedIn && endedByUser { return .endedByUser }
        return .none
    }

    @MainActor @discardableResult
    func mergeGuest(_ lobbies: LobbyStore) -> Task<Void, Never>? {
        guard self == .signedIn else { return nil }
        return Task { await lobbies.mergeGuest() }
    }
}

enum Launch {
    static func value(_ flag: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: flag), i + 1 < args.count else { return nil }
        return args[i + 1]
    }

    static func flag(_ name: String) -> Bool { ProcessInfo.processInfo.arguments.contains(name) }
}
