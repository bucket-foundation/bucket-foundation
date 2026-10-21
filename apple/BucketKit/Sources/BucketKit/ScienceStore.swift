import Foundation
import Observation

public struct PreparedDeck: Sendable {
    public let branch: String
    public let atoms: [Atom]
    public let encompassing: [String: [EncEdge]]
    public let byId: [String: Atom]

    public init(branch: String, atoms raw: [Atom]) {
        self.branch = branch
        atoms = withLeverage(raw)
        encompassing = buildEncompassingMap(atoms)
        byId = Dictionary(atoms.map { ($0.id, $0) }, uniquingKeysWith: { _, b in b })
    }
}

@MainActor
@Observable
public final class ScienceStore {
    public private(set) var states: [String: EngineState] = [:]
    public private(set) var saveState = SaveResult.idle
    public private(set) var pulled = false

    let api: BucketAPI
    let disk: LangDisk
    let token: @MainActor () async -> String?
    let now: @MainActor () -> Double
    let tz: @MainActor () -> TimeZone
    @ObservationIgnored private var pushes: [String: Task<Void, Never>] = [:]
    @ObservationIgnored private var loading: Task<Void, Never>?

    public static func defaultDisk() -> LangDisk {
        FileLangDisk(root: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appending(path: "academy", directoryHint: .isDirectory))
    }

    public init(api: BucketAPI, disk: LangDisk? = nil, token: @escaping @MainActor () async -> String?, now: @escaping @MainActor () -> Double = { Date().timeIntervalSince1970 * 1000 }, tz: @escaping @MainActor () -> TimeZone = { .current }) {
        self.api = api
        self.disk = disk ?? Self.defaultDisk()
        self.token = token
        self.now = now
        self.tz = tz
    }

    public func state(_ branch: String) -> EngineState { states[branch] ?? EngineState() }

    public func route(_ deck: PreparedDeck) -> [RouteItem] {
        BucketKit.route(state(deck.branch), deck.atoms, now: now(), tz: tz())
    }

    public func summary(_ deck: PreparedDeck) -> ScienceSummary {
        BucketKit.summary(state(deck.branch), deck.atoms, now: now())
    }

    public func mastery(_ branch: String, _ id: String) -> Double { masteryFor(state(branch), id) }

    func pull() async -> JSObject? {
        guard let t = await token() else { return nil }
        return await api.progressPull(token: t)
    }

    func file(_ branch: String) -> String { "branch-\(branch).json" }

    func readLocal(_ branch: String) -> EngineState? {
        guard let d = disk.read(file(branch)), let j = try? JSON.parse(d) else { return nil }
        return EngineState(js: j)
    }

    func writeLocal(_ branch: String, _ s: EngineState) { disk.write(file(branch), JSON.data(s.js)) }

    func localBranches() -> [String] {
        guard let i = disk.read("branches.json"), let j = try? JSON.parse(i) else { return [] }
        return j.stringArray ?? []
    }

    func remember(_ branch: String) {
        var all = localBranches()
        guard !all.contains(branch) else { return }
        all.append(branch)
        disk.write("branches.json", JSON.data(.array(all.map(JSValue.string))))
    }

    public func load(_ branches: [String]) async {
        if let loading { return await loading.value }
        let task = Task { await self.loadNow(branches) }
        loading = task
        await task.value
        loading = nil
    }

    func loadNow(_ branches: [String]) async {
        for b in branches where states[b] == nil { states[b] = readLocal(b) ?? EngineState() }
        guard let server = await pull() else { return }
        for b in branches { states[b] = await merge(b, server) }
        pulled = true
    }

    func merge(_ branch: String, _ server: JSObject) async -> EngineState {
        let local = readLocal(branch)
        guard let remoteJS = server[branch]?["data"] else { return local ?? EngineState() }
        let remote = EngineState(js: remoteJS)
        let merged = mergeState(local, remote)
        if local != merged {
            writeLocal(branch, merged)
            remember(branch)
        }
        if remote != merged, let t = await token() { _ = await api.progressPush(token: t, branch: branch, data: merged.js) }
        return merged
    }

    public func grade(_ deck: PreparedDeck, id: String, rating: Rating, level: String) {
        let branch = deck.branch
        let next = BucketKit.grade(states[branch] ?? readLocal(branch) ?? EngineState(), encompassing: deck.encompassing, id: id, rating: rating, level: level, now: now(), tz: tz().identifier)
        states[branch] = next
        writeLocal(branch, next)
        remember(branch)
        pushes[branch]?.cancel()
        pushes[branch] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled, let self else { return }
            await self.push(branch)
        }
    }

    public func flush() async {
        let open = pushes
        pushes = [:]
        for (branch, task) in open {
            task.cancel()
            await push(branch)
        }
    }

    func push(_ branch: String) async {
        guard let server = await pull(), let t = await token() else {
            saveState = .localOnly
            return
        }
        saveState = .saving
        let mine = state(branch)
        let merged = server[branch].map { mergeState(mine, EngineState(js: $0["data"])) } ?? mine
        if merged != mine {
            states[branch] = merged
            writeLocal(branch, merged)
        }
        let status = await api.progressPush(token: t, branch: branch, data: merged.js)
        saveState = status == 403 ? .needsProfile : (200..<300).contains(status) ? .synced : .localOnly
    }

    public func syncAfterSignIn() async {
        guard let server = await pull(), let t = await token() else { return }
        for b in localBranches() {
            if server[b] != nil {
                states[b] = await merge(b, server)
            } else if let local = readLocal(b) {
                _ = await api.progressPush(token: t, branch: b, data: local.js)
            }
        }
        pulled = true
    }
}
