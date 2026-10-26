import Foundation
import Observation

public enum SaveResult: String, Sendable { case idle, saving, synced, localOnly, failed, needsProfile }

public protocol LangDisk: Sendable {
    func read(_ name: String) -> Data?
    func write(_ name: String, _ data: Data)
    func removeAll()
}

public struct FileLangDisk: LangDisk {
    let root: URL

    public init(root: URL? = nil) {
        self.root = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appending(path: "polingual", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: self.root, withIntermediateDirectories: true)
    }

    public func read(_ name: String) -> Data? { try? Data(contentsOf: root.appending(path: name)) }
    public func write(_ name: String, _ data: Data) { try? data.write(to: root.appending(path: name), options: .atomic) }

    public func removeAll() {
        let fm = FileManager.default
        for f in (try? fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? [] { try? fm.removeItem(at: f) }
    }
}

public final class MemoryLangDisk: LangDisk, @unchecked Sendable {
    private let lock = NSLock()
    private var files: [String: Data] = [:]
    public init() {}
    public func read(_ name: String) -> Data? { lock.withLock { files[name] } }
    public func write(_ name: String, _ data: Data) { lock.withLock { files[name] = data } }
    public func removeAll() { lock.withLock { files.removeAll() } }
    public var names: [String] { lock.withLock { Array(files.keys) } }
}

@MainActor
@Observable
public final class LangStore {
    public enum Status: Equatable { case idle, loading, ready, error }

    public static let systemsBranch = "lang-systems"
    public static let guestLessonMs: Double = 45 * 60 * 1000

    public private(set) var status = Status.idle
    public private(set) var corpus: LangCorpus?
    public private(set) var systems: [LangSystem] = []
    public private(set) var states: [String: EngineState] = [:]
    public private(set) var saveState = SaveResult.idle
    public private(set) var clips: [String: Set<String>] = [:]

    let api: BucketAPI
    let disk: LangDisk
    let cache: LangDisk
    let seed: @Sendable (String) -> Data?
    let token: @MainActor () async -> String?
    let now: @MainActor () -> Double
    @ObservationIgnored private var pushes: [String: Task<Void, Never>] = [:]
    @ObservationIgnored private var pending: [String: String] = [:]

    public init(api: BucketAPI, disk: LangDisk = FileLangDisk(), cache: LangDisk? = nil, seed: @escaping @Sendable (String) -> Data? = LangStore.bundled, token: @escaping @MainActor () async -> String?, now: @escaping @MainActor () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.api = api
        self.disk = disk
        self.cache = cache ?? FileLangDisk(root: BucketAPI.offlineDirectory("polingual-corpus") ?? FileManager.default.temporaryDirectory.appending(path: "polingual-corpus", directoryHint: .isDirectory))
        self.seed = seed
        self.token = token
        self.now = now
    }

    public static let bundled: @Sendable (String) -> Data? = { name in
        Bundle.main.url(forResource: (name as NSString).deletingPathExtension, withExtension: "json", subdirectory: "Corpus").flatMap { try? Data(contentsOf: $0) }
    }

    public func state(_ systemId: String) -> EngineState { states[systemId] ?? EngineState() }
    public func system(_ id: String) -> LangSystem? { systems.first { $0.id == id } }

    public func load(force: Bool = false) async {
        if status == .loading || (status == .ready && !force) { return }
        status = .loading
        async let c = loadCorpus()
        async let clipIndex = loadClips()
        let server = await pull()
        let list = loadSystems(server)
        var st: [String: EngineState] = [:]
        for s in list { st[s.id] = await loadBranch(progressBranch(s), server) }
        corpus = await c
        clips = await clipIndex
        systems = list
        states = st
        status = corpus == nil ? .error : .ready
    }

    func file(_ name: String) async -> Data? {
        let path = "academy-app/corpus/\(name)"
        if let local = cache.read(name) ?? seed(name) {
            let api = api
            let cache = cache
            Task.detached(priority: .background) { if let d = try? await api.raw(path) { cache.write(name, d) } }
            return local
        }
        if let d = try? await api.raw(path) {
            cache.write(name, d)
            return d
        }
        return nil
    }

    func loadCorpus() async -> LangCorpus? {
        async let core = file("lang-core.json")
        async let cog = file("lang-cognates.json")
        async let ph = file("lang-phrases.json")
        async let layers = file("lang-layers.json")
        guard let a = await core, let b = await cog, let p = await ph,
              let cj = try? JSON.parse(a), let gj = try? JSON.parse(b), let pj = try? JSON.parse(p) else { return nil }
        let lj = await layers.flatMap { try? JSON.parse($0) }
        let c = buildLangCorpus(core: cj, cognates: gj, phrases: pj, layers: lj)
        return c.items.isEmpty ? nil : c
    }

    func loadClips() async -> [String: Set<String>] {
        guard let d = try? await api.raw("\(LangAudio.base)/index.json"), let j = try? JSON.parse(d) else { return [:] }
        var out: [String: Set<String>] = [:]
        for (l, keys) in j.object?.entries ?? [] { out[l] = Set(keys.stringArray ?? []) }
        return out
    }

    public func hasClip(_ lang: String, _ text: String) -> Bool { clips[lang]?.contains(LangAudio.key(lang, text)) ?? false }
    public func clipURL(_ lang: String, _ text: String) -> URL { api.base.appending(path: LangAudio.path(lang, text)) }

    func pull() async -> JSObject? {
        guard let t = await token() else { return nil }
        return await api.progressPull(token: t)
    }

    func readLocalSystems() -> SystemsDoc { SystemsDoc(js: disk.read("systems.json").flatMap { try? JSON.parse($0) }) }
    func writeLocalSystems(_ doc: SystemsDoc) { disk.write("systems.json", JSON.data(doc.js)) }
    public var hasLocalSystems: Bool { disk.read("systems.json") != nil }

    func loadSystems(_ server: JSObject?) -> [LangSystem] {
        let merged = mergeSystems(readLocalSystems(), SystemsDoc(js: server?[Self.systemsBranch]?["data"]))
        writeLocalSystems(merged)
        return merged.systems
    }

    func readLocal(_ branch: String) -> EngineState? {
        guard let d = disk.read("branch-\(branch).json"), let j = try? JSON.parse(d) else { return nil }
        return EngineState(js: j)
    }

    func writeLocal(_ branch: String, _ s: EngineState) { disk.write("branch-\(branch).json", JSON.data(s.js)) }

    func loadBranch(_ branch: String, _ server: JSObject?) async -> EngineState {
        let local = readLocal(branch)
        guard let remoteJS = server?[branch]?["data"] else { return local ?? EngineState() }
        let remote = EngineState(js: remoteJS)
        let merged = mergeState(local, remote)
        if local != merged { writeLocal(branch, merged) }
        if remote != merged, let t = await token() { _ = await api.progressPush(token: t, branch: branch, data: merged.js) }
        return merged
    }

    public func persistSystems(upsert: LangSystem? = nil, remove: String? = nil) async {
        saveState = .saving
        let delta = SystemsDoc(systems: upsert.map { [$0] } ?? [], removed: remove.map { [$0: now()] } ?? [:])
        var doc = mergeSystems(readLocalSystems(), delta)
        writeLocalSystems(doc)
        systems = doc.systems
        for wait in [0.0, 0.8, 2.5] {
            if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
            guard let server = await pull(), let t = await token() else {
                saveState = .localOnly
                return
            }
            doc = mergeSystems(mergeSystems(doc, SystemsDoc(js: server[Self.systemsBranch]?["data"])), delta)
            writeLocalSystems(doc)
            systems = doc.systems
            let status = await api.progressPush(token: t, branch: Self.systemsBranch, data: doc.js)
            if status == 401 { saveState = .localOnly; return }
            if status == 403 { saveState = .needsProfile; return }
            if (200..<300).contains(status) { saveState = .synced; return }
        }
        saveState = .failed
    }

    public func create(root: String, targets: [String]) async throws -> LangSystem {
        let s = try createSystem(root, targets, systems, now: now())
        systems.append(s)
        states[s.id] = EngineState()
        await persistSystems(upsert: s)
        return s
    }

    public func remove(_ id: String) async {
        systems.removeAll { $0.id == id }
        await persistSystems(remove: id)
    }

    public func edit(_ id: String, targets: [String]) async throws {
        guard let s = system(id) else { return }
        let next = try editSystem(s, targets, now: now())
        replace(next)
        await persistSystems(upsert: next)
    }

    func replace(_ s: LangSystem) {
        if let i = systems.firstIndex(where: { $0.id == s.id }) { systems[i] = s }
    }

    public func grade(_ systemId: String, lang: String, itemId: String, rating: Rating) {
        guard let s = system(systemId) else { return }
        commit(s, gradeCard(state(systemId), lang, itemId, rating, now: now(), tz: TimeZone.current.identifier))
    }

    public func flagMisses(_ systemId: String, lang: String) -> Int { FlagMisses.count(state(systemId), lang) }

    public func recordFlagMiss(_ systemId: String, lang: String) {
        guard let s = system(systemId) else { return }
        commit(s, FlagMisses.recording(state(systemId), lang))
    }

    public func showsFlagName(_ systemId: String, lang: String) -> Bool { FlagMisses.showsName(state(systemId), lang) }

    public func gradeMatchFlags(_ systemId: String, _ pairs: [LangWord], _ assign: [String: String]) -> [(lang: String, rating: Rating?)] {
        guard let s = system(systemId) else { return gradeMatch(pairs, assign).map { ($0.lang, $0.correct ? 3 : 1) } }
        let out = FlagMisses.gradeMatch(pairs, assign, state(systemId))
        commit(s, FlagMisses.merging(out.state, into: state(systemId)))
        return out.ratings
    }

    public func place(_ systemId: String, lang: String, tier: Double) async {
        guard var s = system(systemId), let corpus else { return }
        s.placement[lang] = tier
        replace(s)
        commit(s, applyPlacement(state(systemId), s, corpus, lang, tier, now: now()))
        await persistSystems(upsert: s)
    }

    func commit(_ s: LangSystem, _ next: EngineState) {
        let branch = progressBranch(s)
        states[s.id] = next
        writeLocal(branch, next)
        pushes[branch]?.cancel()
        pending[branch] = s.id
        pushes[branch] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled, let self else { return }
            await self.push(s.id, branch)
        }
    }

    func push(_ systemId: String, _ branch: String) async {
        guard let server = await pull(), let t = await token() else { return }
        let mine = state(systemId)
        let merged = server[branch].map { mergeState(mine, EngineState(js: $0["data"])) } ?? mine
        if merged != mine {
            states[systemId] = merged
            writeLocal(branch, merged)
        }
        let status = await api.progressPush(token: t, branch: branch, data: merged.js)
        if status == 403 { saveState = .needsProfile } else if !(200..<300).contains(status) { saveState = .localOnly }
    }

    public func syncAfterSignIn() async {
        if hasLocalSystems { await persistSystems() }
        guard let server = await pull(), let t = await token() else { return }
        for s in systems {
            let branch = progressBranch(s)
            if server[branch] != nil {
                states[s.id] = await loadBranch(branch, server)
            } else if let local = readLocal(branch) {
                _ = await api.progressPush(token: t, branch: branch, data: local.js)
            }
        }
        disk.write("guest-lesson.json", Data())
    }

    public func flush() async {
        let open = pending
        for t in pushes.values { t.cancel() }
        pushes = [:]
        pending = [:]
        for (branch, systemId) in open { await push(systemId, branch) }
    }

    public func clearLocal() {
        for t in pushes.values { t.cancel() }
        pushes = [:]
        pending = [:]
        disk.removeAll()
        systems = []
        states = [:]
        saveState = .idle
    }

    public func guestMayStudy(_ systemId: String) -> Bool {
        let t = now()
        if let d = disk.read("guest-lesson.json"), let j = try? JSON.parse(d), let at = j["at"]?.number {
            return j["system"]?.string == systemId && t - at < Self.guestLessonMs
        }
        disk.write("guest-lesson.json", JSON.data(.object(JSObject([("system", .string(systemId)), ("at", .number(t))]))))
        return true
    }
}
