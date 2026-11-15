import BucketKit
import Foundation

enum AppTab: String, Hashable { case today, learn, games, account }

extension SharedLink {
    var tab: AppTab {
        switch self {
        case .word, .home: .today
        case .langs, .deck, .atom, .content, .voice: .learn
        case .group: .account
        }
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
