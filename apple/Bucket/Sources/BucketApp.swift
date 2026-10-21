import BucketKit
import SwiftUI

@main
struct BucketApp: App {
    @State private var account: Account
    @State private var library = Library(api: BucketAPI())
    @State private var langs: LangStore
    @State private var science: ScienceStore
    @State private var gate: Gate

    init() {
        let account = Account(api: BucketAPI(), store: KeychainSessionStore(accessGroup: "QQ6D6A2LLS.foundation.bucket.shared"))
        let langs = LangStore(api: BucketAPI(), token: { await account.freshToken() })
        LangVoice.shared.store = langs
        _account = State(initialValue: account)
        _langs = State(initialValue: langs)
        let shift = (Launch.value("-clockDays").flatMap(Double.init) ?? 0) * DAY_MS
        _science = State(initialValue: ScienceStore(api: BucketAPI(), token: { await account.freshToken() }, now: { Date().timeIntervalSince1970 * 1000 + shift }))
        _gate = State(initialValue: Gate(account: account))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(account)
                .environment(library)
                .environment(langs)
                .environment(science)
                .environment(gate)
                .tint(Palette.green)
        }
    }
}

enum AppTab: String, Hashable { case learn, practice, canon, account }

enum Launch {
    static func value(_ flag: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: flag), i + 1 < args.count else { return nil }
        return args[i + 1]
    }

    static func flag(_ name: String) -> Bool { ProcessInfo.processInfo.arguments.contains(name) }
}

struct RootView: View {
    @Environment(Library.self) private var library
    @Environment(LangStore.self) private var langs
    @Environment(ScienceStore.self) private var science
    @Environment(Gate.self) private var gate
    @Environment(Account.self) private var account
    @State private var tab = Launch.value("-startTab").flatMap(AppTab.init(rawValue:)) ?? .learn

    var body: some View {
        TabView(selection: $tab) {
            Tab("Learn", systemImage: "book.closed", value: .learn) { LearnView() }
            Tab("Practice", systemImage: "rectangle.on.rectangle.angled", value: .practice) { PracticeHome() }
            Tab("Account", systemImage: "person.crop.circle", value: AppTab.account) { AccountView() }
        }
        .task { await library.loadIndex() }
        .sheet(isPresented: Binding(get: { gate.asking }, set: { if !$0 { gate.asking = false; gate.dismissed() } })) { GateSheet() }
        .onChange(of: account.stage) { old, new in
            if new == .signedIn && old != .signedIn {
                Task { await langs.syncAfterSignIn() }
                Task { await science.syncAfterSignIn() }
            }
        }
    }
}
