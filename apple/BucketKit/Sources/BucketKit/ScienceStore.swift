import Foundation
import Observation

public struct PreparedDeck: Sendable {
    public let branch: String
    public let atoms: [Atom]
    public let encompassing: [String: [EncEdge]]
    public let byId: [String: Atom]
    public let questionsFile: String

    public init(branch: String, atoms raw: [Atom], questionsFile: String? = nil) {
        self.branch = branch
        self.questionsFile = questionsFile ?? "corpus/questions/\(branch).json"
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
        let s = BucketKit.summary(state(deck.branch), deck.atoms, now: now())
        return ScienceSummary(total: s.total, introduced: s.introduced, mastered: s.mastered, dueCount: s.dueCount, xp: s.xp,
                              streak: liveStreak(state(deck.branch), now: now(), tz: tz()))
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

    var dirty: Set<String> {
        guard let d = disk.read("dirty.json"), let j = try? JSON.parse(d) else { return [] }
        return Set(j.stringArray ?? [])
    }

    func setDirty(_ all: Set<String>) {
        if all.isEmpty { disk.remove("dirty.json") } else { disk.write("dirty.json", JSON.data(.array(all.sorted().map(JSValue.string)))) }
    }

    func markSent(_ branch: String, _ sent: EngineState) {
        if readLocal(branch) == sent { mark(branch, clean: true) }
    }

    func mark(_ branch: String, clean: Bool) {
        var all = dirty
        if clean { all.remove(branch) } else { all.insert(branch) }
        setDirty(all)
    }

    public var unsyncedCount: Int { dirty.count }
    public var hasUnsyncedWork: Bool { !dirty.isEmpty }

    func remember(_ branch: String) {
        var all = localBranches()
        guard !all.contains(branch) else { return }
        all.append(branch)
        disk.write("branches.json", JSON.data(.array(all.map(JSValue.string))))
    }

    public func load(_ branches: [String]) async {
        while let running = loading {
            await running.value
            if loading == running { loading = nil }
        }
        let task = Task { await self.loadNow(branches) }
        loading = task
        await task.value
        if loading == task { loading = nil }
    }

    func loadNow(_ branches: [String]) async {
        let ep = epoch
        for b in branches where states[b] == nil { states[b] = readLocal(b) ?? EngineState() }
        guard let server = await pull(), epoch == ep else { return }
        for b in branches {
            guard let merged = await merge(b, server, epoch: ep), epoch == ep else { return }
            states[b] = merged
        }
        pulled = true
    }

    func merge(_ branch: String, _ server: JSObject, epoch ep: Int) async -> EngineState? {
        guard epoch == ep else { return nil }
        let local = readLocal(branch)
        guard let remoteJS = server[branch]?["data"] else { return local ?? EngineState() }
        let remote = EngineState(js: remoteJS)
        let merged = mergeState(local, remote)
        if local != merged {
            writeLocal(branch, merged)
            remember(branch)
        }
        if remote != merged {
            let t = await token()
            guard epoch == ep else { return nil }
            if let t, (200..<300).contains(await send(t, branch, merged.js, epoch: ep)), epoch == ep { markSent(branch, merged) }
            guard epoch == ep else { return nil }
        } else {
            markSent(branch, merged)
        }
        return merged
    }

    func send(_ token: String, _ branch: String, _ data: JSValue, epoch ep: Int) async -> Int {
        guard epoch == ep else { return 0 }
        return await api.progressPush(token: token, branch: branch, data: data)
    }

    public func grade(_ deck: PreparedDeck, id: String, rating: Rating, level: String) {
        let branch = deck.branch
        let next = BucketKit.grade(states[branch] ?? readLocal(branch) ?? EngineState(), encompassing: deck.encompassing, id: id, rating: rating, level: level, now: now(), tz: tz().identifier)
        states[branch] = next
        writeLocal(branch, next)
        remember(branch)
        mark(branch, clean: false)
        pushes[branch]?.cancel()
        pushes[branch] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled, let self else { return }
            await self.push(branch)
        }
    }

    public func flush() async {
        let ep = epoch
        let open = pushes
        pushes = [:]
        for (branch, task) in open {
            guard epoch == ep else { return }
            task.cancel()
            await push(branch)
        }
    }

    func push(_ branch: String) async {
        let ep = epoch
        let server = await pull()
        let t = await token()
        guard epoch == ep else { return }
        guard let server, let t else {
            saveState = .localOnly
            return
        }
        if Task.isCancelled { return }
        saveState = .saving
        let mine = state(branch)
        let merged = server[branch].map { mergeState(mine, EngineState(js: $0["data"])) } ?? mine
        if merged != mine {
            states[branch] = merged
            writeLocal(branch, merged)
        }
        let status = await send(t, branch, merged.js, epoch: ep)
        guard epoch == ep else { return }
        if Task.isCancelled && !(200..<300).contains(status) {
            saveState = .idle
            return
        }
        saveState = status == 403 ? .needsProfile : (200..<300).contains(status) ? .synced : .localOnly
        if (200..<300).contains(status) { markSent(branch, merged) }
    }

    @ObservationIgnored private(set) var epoch = 0

    public func detach() {
        for t in pushes.values { t.cancel() }
        pushes = [:]
        epoch += 1
    }

    public func clearLocal(keepUnsynced: Bool = false) {
        for t in pushes.values { t.cancel() }
        pushes = [:]
        epoch += 1
        let kept = keepUnsynced ? dirty.sorted().compactMap { b in disk.read(file(b)).map { (b, $0) } } : []
        disk.removeAll()
        for (b, data) in kept {
            disk.write(file(b), data)
            remember(b)
        }
        setDirty(Set(kept.map(\.0)))
        states = [:]
        pulled = false
        saveState = .idle
    }

    public func resync() async {
        guard await token() != nil, !localBranches().isEmpty else { return }
        let before = pulled
        pulled = false
        await syncAfterSignIn()
        if pulled, saveState == .localOnly { saveState = .synced }
        if !pulled { pulled = before }
    }

    public func syncAfterSignIn() async {
        let ep = epoch
        let server = await pull()
        let t = await token()
        guard epoch == ep, let server, let t else { return }
        for b in localBranches() {
            guard epoch == ep else { return }
            if server[b] != nil {
                guard let merged = await merge(b, server, epoch: ep), epoch == ep else { return }
                states[b] = merged
            } else if let local = readLocal(b) {
                if (200..<300).contains(await send(t, b, local.js, epoch: ep)), epoch == ep { markSent(b, local) }
            }
        }
        guard epoch == ep else { return }
        pulled = true
    }
}
