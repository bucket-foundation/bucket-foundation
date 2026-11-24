import Foundation
import Observation

public enum SaveResult: String, Sendable { case idle, saving, synced, localOnly, offline, failed, needsProfile, refused }

public enum ProgressKeep: String, Sendable { case both, device, account }

public protocol LangDisk: Sendable {
    func read(_ name: String) -> Data?
    func write(_ name: String, _ data: Data)
    func remove(_ name: String)
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

    public func remove(_ name: String) { try? FileManager.default.removeItem(at: root.appending(path: name)) }

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
    public func remove(_ name: String) { lock.withLock { files[name] = nil } }
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

    public static func topWords(_ lang: String, bundle: Bundle = .main) -> [TopWord]? {
        guard let url = bundle.url(forResource: lang, withExtension: "json", subdirectory: "Corpus/top1000"), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode([TopWord].self, from: data)
    }
    public private(set) var systems: [LangSystem] = []
    public private(set) var known = KnownLanguages([])
    public private(set) var pulled = false
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
    @ObservationIgnored private var generation: [String: Int] = [:]
    @ObservationIgnored private(set) var epoch = 0
    @ObservationIgnored private var inFlight: [String: Int] = [:]
    @ObservationIgnored private var refusedUntil: [String: (at: Double, wait: Double)] = [:]
    public static let heldTTL: Double = 30 * 24 * 3600 * 1000
    public static let unknownOwner = "unknown-owner"
    @ObservationIgnored private var reloadAfter = false
    @ObservationIgnored private(set) var replacing: Set<String> = [] { didSet { if replacing != oldValue { saveReplacing() } } }

    public init(api: BucketAPI, disk: LangDisk = FileLangDisk(), cache: LangDisk? = nil, seed: @escaping @Sendable (String) -> Data? = LangStore.bundled, token: @escaping @MainActor () async -> String?, now: @escaping @MainActor () -> Double = { Date().timeIntervalSince1970 * 1000 }) {
        self.api = api
        self.disk = disk
        self.cache = cache ?? FileLangDisk(root: BucketAPI.offlineDirectory("polingual-corpus") ?? FileManager.default.temporaryDirectory.appending(path: "polingual-corpus", directoryHint: .isDirectory))
        self.seed = seed
        self.token = token
        self.now = now
        self.pending = Self.readPending(disk)
        self.replacing = Self.readReplacing(disk)
    }

    static func readPending(_ disk: LangDisk) -> [String: String] {
        guard let d = disk.read("pending.json"), let j = try? JSON.parse(d), let o = j.object else { return [:] }
        var out: [String: String] = [:]
        for (k, v) in o.entries { if let id = v.string { out[k] = id } }
        return out
    }

    static func readReplacing(_ disk: LangDisk) -> Set<String> {
        guard let d = disk.read("replacing.json"), let a = (try? JSON.parse(d))?.array else { return [] }
        return Set(a.compactMap(\.string))
    }

    func saveReplacing() {
        if replacing.isEmpty { disk.remove("replacing.json") } else { disk.write("replacing.json", JSON.data(.array(replacing.sorted().map(JSValue.string)))) }
    }

    func savePending() {
        disk.write("pending.json", JSON.data(.object(JSObject(pending.keys.sorted().map { ($0, .string(pending[$0]!)) }))))
    }

    public var hasUnsyncedWork: Bool { !pending.isEmpty }

    static func isBlank(_ branch: String, _ data: JSValue?) -> Bool {
        guard let data else { return true }
        if branch == systemsBranch {
            let doc = SystemsDoc(js: data)
            return doc.systems.isEmpty && doc.removed.isEmpty
        }
        if branch == KnownLanguages.branch { return KnownLanguages(js: data).isBlank }
        let s = EngineState(js: data)
        return s.cards.count + s.prof.count + s.history.count == 0 && s.xp == 0
    }

    func send(_ token: String, _ branch: String, _ data: JSValue, over server: JSObject, epoch ep: Int) async -> Int {
        guard epoch == ep else { return 0 }
        if Self.isBlank(branch, data) && !Self.isBlank(branch, server[branch]?["data"]) { return 409 }
        return await api.progressPush(token: token, branch: branch, data: data)
    }

    public static let bundled: @Sendable (String) -> Data? = { name in
        Bundle.main.url(forResource: (name as NSString).deletingPathExtension, withExtension: "json", subdirectory: "Corpus").flatMap { try? Data(contentsOf: $0) }
    }

    public func state(_ systemId: String) -> EngineState { states[systemId] ?? EngineState() }
    public func system(_ id: String) -> LangSystem? { systems.first { $0.id == id } }

    public func load(force: Bool = false) async {
        if status == .loading {
            if force { reloadAfter = true }
            return
        }
        if status == .ready && !force { return }
        status = .loading
        reloadAfter = false
        let mine = epoch
        async let c = loadCorpus()
        async let clipIndex = loadClips()
        let server = await pull()
        guard epoch == mine else { return }
        let list = loadSystems(server)
        known = loadKnown(server)
        var st: [String: EngineState] = [:]
        for s in list {
            guard epoch == mine, let state = await loadBranch(progressBranch(s), server, epoch: mine) else { return }
            st[s.id] = state
        }
        let loadedCorpus = await c
        let loadedClips = await clipIndex
        guard epoch == mine else { return }
        corpus = loadedCorpus
        clips = loadedClips
        systems = list
        states = st
        pulled = pulled || server != nil
        status = corpus == nil ? .error : .ready
        adoptAllSiblings()
        if server != nil {
            await healPlacements(epoch: mine)
            guard epoch == mine else { return }
            await retryPending()
            guard epoch == mine else { return }
        }
        if reloadAfter {
            reloadAfter = false
            status = .idle
            await load(force: true)
        }
    }

    public func retryPending() async {
        let ep = epoch
        for (branch, systemId) in pending where pushes[branch] == nil {
            guard epoch == ep else { return }
            if let r = refusedUntil[branch], now() < r.at { continue }
            await deliver(systemId, branch, epoch: ep)
        }
    }

    func deliver(_ systemId: String, _ branch: String, epoch ep: Int) async {
        if branch == Self.systemsBranch { await persistSystems(epoch: ep) }
        else if branch == KnownLanguages.branch { await persistKnown(epoch: ep) }
        else { await push(systemId, branch) }
    }

    func waitForLoad() async {
        while status == .loading { try? await Task.sleep(for: .milliseconds(20)) }
    }

    func healPlacements(epoch ep: Int) async {
        for s in systems {
            guard epoch == ep, let corpus else { return }
            let stale = stalePlacements(s, state(s.id), corpus)
            guard !stale.isEmpty else { continue }
            var next = s
            for l in stale {
                next.placement[l] = 0
                next.placedAt = (next.placedAt ?? [:]).merging([l: now()]) { _, n in n }
            }
            next.updatedAt = now()
            replace(next)
            await persistSystems(upsert: next, epoch: ep)
        }
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
        let fresh = try? await api.raw("\(LangAudio.base)/index.json")
        if let fresh { cache.write("clip-index.json", fresh) }
        guard let d = fresh ?? cache.read("clip-index.json"), let j = try? JSON.parse(d) else { return [:] }
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

    func readLocalKnown() -> KnownLanguages { KnownLanguages(js: disk.read("known.json").flatMap { try? JSON.parse($0) }) }
    func writeLocalKnown(_ k: KnownLanguages) { disk.write("known.json", JSON.data(k.js)) }

    func loadKnown(_ server: JSObject?) -> KnownLanguages {
        let stored = readLocalKnown()
        let remote = KnownLanguages(js: server?[KnownLanguages.branch]?["data"])
        let merged = KnownLanguages.merged(stored, remote)
        if merged != stored { writeLocalKnown(merged) }
        if server != nil, !merged.isBlank, merged != remote, pending[KnownLanguages.branch] == nil {
            pending[KnownLanguages.branch] = KnownLanguages.branch
            savePending()
        }
        return merged
    }

    public func setKnown(_ codes: [String]) async {
        let next = KnownLanguages(codes, at: now())
        guard !next.isBlank, next.codes != known.codes else { return }
        known = next
        writeLocalKnown(next)
        let branch = KnownLanguages.branch
        pending[branch] = branch
        generation[branch, default: 0] += 1
        savePending()
        if let r = refusedUntil[branch], now() < r.at { return }
        await persistKnown()
    }

    func persistKnown(epoch given: Int? = nil) async {
        let mine = given ?? epoch
        let branch = KnownLanguages.branch
        guard epoch == mine, inFlight[branch] == nil else { return }
        inFlight[branch] = mine
        defer { if inFlight[branch] == mine { inFlight[branch] = nil } }
        while epoch == mine {
            let gen = generation[branch, default: 0]
            let server = await pull()
            let t = await token()
            guard epoch == mine else { return }
            guard let server, let t else {
                saveState = t == nil ? .localOnly : .offline
                return
            }
            let remote = KnownLanguages(js: server[branch]?["data"])
            let merged = KnownLanguages.merged(readLocalKnown(), remote)
            if merged != known {
                known = merged
                writeLocalKnown(merged)
            }
            let status = merged == remote ? 200 : await send(t, branch, merged.js, over: server, epoch: mine)
            guard epoch == mine else { return }
            if status == 409 {
                let wait = min((refusedUntil[branch]?.wait ?? 15_000) * 2, 3_600_000)
                refusedUntil[branch] = (now() + wait, wait)
                saveState = .refused
                return
            }
            guard (200..<300).contains(status) else {
                saveState = Self.failure(status)
                return
            }
            refusedUntil[branch] = nil
            saveState = .synced
            if generation[branch, default: 0] == gen {
                pending[branch] = nil
                savePending()
                return
            }
        }
    }

    func readLocal(_ branch: String) -> EngineState? {
        guard let d = disk.read("branch-\(branch).json"), let j = try? JSON.parse(d) else { return nil }
        return EngineState(js: j)
    }

    func writeLocal(_ branch: String, _ s: EngineState) { disk.write("branch-\(branch).json", JSON.data(s.js)) }

    func loadBranch(_ branch: String, _ server: JSObject?, epoch mine: Int) async -> EngineState? {
        guard epoch == mine else { return nil }
        let stored = readLocal(branch)
        let local = stored.map { spreadingUntouchedPlaced($0, now: now()) }
        guard let remoteJS = server?[branch]?["data"] else {
            if let local, local != stored { writeLocal(branch, local) }
            return local ?? EngineState()
        }
        if replacing.contains(branch), let local {
            if stored != local { writeLocal(branch, local) }
            if let server, let t = await token() {
                guard epoch == mine else { return nil }
                let status = await send(t, branch, local.js, over: server, epoch: mine)
                guard epoch == mine else { return nil }
                if (200..<300).contains(status) {
                    replacing.remove(branch)
                    pending[branch] = nil
                    savePending()
                }
            }
            return local
        }
        let remote = EngineState(js: remoteJS)
        let merged = mergeState(local, spreadingUntouchedPlaced(remote, now: now()))
        if stored != merged { writeLocal(branch, merged) }
        if remote != merged, let server {
            let t = await token()
            guard epoch == mine else { return nil }
            if let t { _ = await send(t, branch, merged.js, over: server, epoch: mine) }
            guard epoch == mine else { return nil }
        }
        return merged
    }

    public func persistSystems(upsert: LangSystem? = nil, remove: String? = nil, epoch given: Int? = nil) async {
        let mine = given ?? epoch
        guard epoch == mine else { return }
        saveState = .saving
        let delta = SystemsDoc(systems: upsert.map { [$0] } ?? [], removed: remove.map { [$0: now()] } ?? [:])
        var doc = mergeSystems(readLocalSystems(), delta)
        writeLocalSystems(doc)
        systems = doc.systems
        let branch = Self.systemsBranch
        pending[branch] = branch
        generation[branch, default: 0] += 1
        savePending()
        let gen = generation[branch, default: 0]
        for wait in [0.0, 0.8, 2.5] {
            if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
            guard epoch == mine else { return }
            let server = await pull()
            let t = await token()
            guard epoch == mine else { return }
            guard let server, let t else {
                saveState = t == nil ? .localOnly : .offline
                return
            }
            doc = mergeSystems(mergeSystems(doc, SystemsDoc(js: server[Self.systemsBranch]?["data"])), delta)
            writeLocalSystems(doc)
            systems = doc.systems
            let status = await send(t, Self.systemsBranch, doc.js, over: server, epoch: mine)
            guard epoch == mine else { return }
            if status == 409 {
                let wait = min((refusedUntil[branch]?.wait ?? 15_000) * 2, 3_600_000)
                refusedUntil[branch] = (now() + wait, wait)
                saveState = .refused
                print("LangStore: server refused a blank systems overwrite")
                return
            }
            if status == 401 { saveState = .localOnly; return }
            if status == 403 { saveState = .needsProfile; return }
            if (200..<300).contains(status) {
                refusedUntil[branch] = nil
                if generation[branch, default: 0] == gen {
                    pending[branch] = nil
                    savePending()
                }
                saveState = .synced
                return
            }
        }
        saveState = .failed
    }

    public func create(root: String, targets: [String]) async throws -> LangSystem {
        let s = try createSystem(root, targets, systems, now: now())
        systems.append(s)
        states[s.id] = EngineState()
        adoptSiblings(s.id)
        await persistSystems(upsert: s)
        return s
    }

    public func adoptSiblings(_ systemId: String) {
        guard let s = system(systemId) else { return }
        let siblings = systems.filter { $0.id != systemId }.compactMap { states[$0.id] }
        let mine = state(systemId)
        let next = adoptSiblingCards(mine, langs: s.targets, from: siblings)
        if next != mine { store(s, next) }
    }

    public func remove(_ id: String) async {
        systems.removeAll { $0.id == id }
        await persistSystems(remove: id)
    }

    public func edit(_ id: String, targets: [String]) async throws {
        guard let s = system(id) else { return }
        let next = try editSystem(s, targets, now: now())
        replace(next)
        adoptSiblings(id)
        await persistSystems(upsert: next)
    }

    func replace(_ s: LangSystem) {
        if let i = systems.firstIndex(where: { $0.id == s.id }) { systems[i] = s }
    }

    public func grade(_ systemId: String, lang: String, itemId: String, rating: Rating, counted: Bool = true) {
        guard let s = system(systemId) else { return }
        commit(s, gradeCard(state(systemId), lang, itemId, rating, now: now(), tz: TimeZone.current.identifier, counted: counted))
    }

    public func queue(_ systemId: String, lang: String, itemId: String) {
        guard let s = system(systemId) else { return }
        commit(s, queueNew(state(systemId), lang, itemId, now: now()))
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

    public func finishGame(_ systemId: String, _ game: GameResult) {
        guard let s = system(systemId) else { return }
        commit(s, GameLedger.finishing(state(systemId), game, now: now(), tz: TimeZone.current.identifier))
    }

    public func gameBest(_ game: String) -> Int? {
        systems.compactMap { GameLedger(state($0.id)).best[game] }.max()
    }

    public func gameDayCredit() -> Int {
        systems.map { GameLedger(state($0.id)).days[dayKey(now())] ?? 0 }.max() ?? 0
    }

    public func gameDaily(_ systemId: String) -> String? {
        GameLedger(state(systemId)).daily[dayKey(now())]
    }

    public func place(_ systemId: String, lang: String, tier: Double, only: [String]? = nil, level: String? = nil) async {
        guard var s = system(systemId), let corpus else { return }
        s.placement[lang] = tier
        s.updatedAt = now()
        s.placedAt = (s.placedAt ?? [:]).merging([lang: now()]) { _, n in n }
        if let level { s.levels = (s.levels ?? [:]).merging([lang: level]) { _, n in n } }
        replace(s)
        commit(s, applyPlacement(state(systemId), s, corpus, lang, tier, now: now(), only: only.map(Set.init)))
        await persistSystems(upsert: s)
    }

    public static let unknownLevel = "A0"

    public func unplace(_ systemId: String, lang: String) async {
        guard var s = system(systemId) else { return }
        s.placement[lang] = 0
        s.updatedAt = now()
        s.placedAt = (s.placedAt ?? [:]).merging([lang: now()]) { _, n in n }
        s.levels = (s.levels ?? [:]).merging([lang: Self.unknownLevel]) { _, n in n }
        replace(s)
        commit(s, BucketKit.unplace(state(systemId), lang, now: now()))
        await persistSystems(upsert: s)
    }

    func commit(_ s: LangSystem, _ next: EngineState) {
        let before = states[s.id]
        store(s, next)
        for (sibling, shared) in sharedCards(from: s, before: before, next: next) { store(sibling, shared) }
    }

    func sharedCards(from s: LangSystem, before: EngineState?, next: EngineState) -> [(LangSystem, EngineState)] {
        let changed = next.cards.entries.filter { isStarted($0.value) && before?.cards[$0.key] != $0.value }
        guard !changed.isEmpty else { return [] }
        return systems.filter { $0.id != s.id }.compactMap { sibling in
            let langs = Set(sibling.targets)
            let mine = state(sibling.id)
            var out = mine
            for (id, card) in changed where langs.contains(parseCardId(id).lang) && adopts(card, over: out.cards[id]) {
                out.cards[id] = card
                out.prof[id] = next.prof[id]
            }
            return out == mine ? nil : (sibling, out)
        }
    }

    public func adoptAllSiblings() {
        for s in systems { adoptSiblings(s.id) }
    }

    func store(_ s: LangSystem, _ next: EngineState) {
        let branch = progressBranch(s)
        states[s.id] = next
        writeLocal(branch, next)
        pushes[branch]?.cancel()
        pending[branch] = s.id
        generation[branch, default: 0] += 1
        savePending()
        pushes[branch] = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled, let self else { return }
            self.pushes[branch] = nil
            await self.push(s.id, branch)
        }
    }

    func push(_ systemId: String, _ branch: String) async {
        let ep = epoch
        guard inFlight[branch] == nil else { return }
        inFlight[branch] = ep
        defer { if inFlight[branch] == ep { inFlight[branch] = nil } }
        var id = systemId
        while await pushOnce(id, branch, epoch: ep), epoch == ep, let next = pending[branch] {
            id = next
        }
    }

    func pushOnce(_ systemId: String, _ branch: String, epoch ep: Int) async -> Bool {
        let gen = generation[branch, default: 0]
        let server = await pull()
        let t = await token()
        guard epoch == ep else { return false }
        guard let server, let t else {
            saveState = t == nil ? .localOnly : .offline
            return false
        }
        let mine = state(systemId)
        let merged = replacing.contains(branch) ? mine : server[branch].map { mergeState(mine, spreadingUntouchedPlaced(EngineState(js: $0["data"]), now: now())) } ?? mine
        if merged != mine {
            states[systemId] = merged
            writeLocal(branch, merged)
            if let s = system(systemId) {
                for (sibling, shared) in sharedCards(from: s, before: mine, next: merged) { store(sibling, shared) }
            }
        }
        let status = await send(t, branch, merged.js, over: server, epoch: ep)
        guard epoch == ep else { return false }
        if status == 409 {
            let wait = min((refusedUntil[branch]?.wait ?? 15_000) * 2, 3_600_000)
            refusedUntil[branch] = (now() + wait, wait)
            saveState = .refused
            print("LangStore: server refused a blank overwrite of \(branch)")
            return false
        }
        if (200..<300).contains(status) {
            refusedUntil[branch] = nil
            replacing.remove(branch)
            let settled = generation[branch, default: 0] == gen
            if settled && pending[branch] == systemId {
                pending[branch] = nil
                savePending()
            }
            saveState = .synced
            return !settled
        }
        saveState = Self.failure(status)
        return false
    }

    static func failure(_ status: Int) -> SaveResult {
        switch status {
        case 401: .localOnly
        case 403: .needsProfile
        case 0: .offline
        case 409: .refused
        default: .failed
        }
    }

    func heldOwners() -> [String] {
        disk.read("held-index.json").flatMap { try? JSON.parse($0) }?.stringArray ?? []
    }

    func writeHeldOwners(_ owners: [String]) {
        disk.write("held-index.json", JSON.data(.array(owners.map(JSValue.string))))
    }

    func holdPending() -> [(String, Data)] {
        var kept = heldOwners().compactMap { o in disk.read("held-\(o).json").map { ("held-\(o).json", $0) } }
        guard !pending.isEmpty else { return kept }
        let owner = disk.read("owner.json").flatMap({ String(data: $0, encoding: .utf8) }).flatMap { $0.isEmpty ? nil : $0 } ?? Self.unknownOwner
        var branches = JSObject()
        for b in pending.keys.sorted() where b != KnownLanguages.branch { if let st = readLocal(b) { branches[b] = st.js } }
        let prior = disk.read("held-\(owner).json").flatMap { try? JSON.parse($0) }
        var priorBranches = prior?["branches"]?.object ?? JSObject()
        for (k, v) in branches.entries { priorBranches[k] = mergeState(EngineState(js: priorBranches[k]), EngineState(js: v)).js }
        var pend = prior?["pending"]?.object ?? JSObject()
        for (k, v) in pending { pend[k] = .string(v) }
        let systems = mergeSystems(SystemsDoc(js: prior?["systems"]), readLocalSystems())
        let heldKnown = KnownLanguages.merged(KnownLanguages(js: prior?["known"]), pending[KnownLanguages.branch] == nil ? KnownLanguages([]) : readLocalKnown())
        let heldReplacing = Set((prior?["replacing"]?.array ?? []).compactMap(\.string)).union(replacing)
        let blob = JSON.data(.object(JSObject([("systems", systems.js), ("branches", .object(priorBranches)), ("pending", .object(pend)), ("known", heldKnown.js), ("replacing", .array(heldReplacing.sorted().map(JSValue.string))), ("at", .number(now()))])))
        kept.removeAll { $0.0 == "held-\(owner).json" }
        kept.append(("held-\(owner).json", blob))
        return kept
    }

    func pruneHeld() {
        for o in heldOwners() {
            let at = disk.read("held-\(o).json").flatMap { try? JSON.parse($0) }?["at"]?.number ?? 0
            if now() - at > Self.heldTTL { dropHeld(o) }
        }
    }

    func dropHeld(_ account: String) {
        disk.remove("held-\(account).json")
        writeHeldOwners(heldOwners().filter { $0 != account })
    }

    public func wipeHeld(account: String) { dropHeld(account) }

    public func setOwner(_ account: String) {
        disk.write("owner.json", Data(account.utf8))
    }

    public func connectivityChanged(online: Bool) async {
        if online { await retryPending() }
    }

    func restoreHeld(_ account: String) {
        guard account != Self.unknownOwner else { return }
        pruneHeld()
        guard let d = disk.read("held-\(account).json"), let j = try? JSON.parse(d) else { return }
        writeLocalSystems(mergeSystems(readLocalSystems(), SystemsDoc(js: j["systems"])))
        for (b, v) in j["branches"]?.object?.entries ?? [] { writeLocal(b, mergeState(readLocal(b), EngineState(js: v))) }
        let heldKnown = KnownLanguages.merged(readLocalKnown(), KnownLanguages(js: j["known"]))
        if !heldKnown.isBlank { writeLocalKnown(heldKnown) }
        for (b, v) in j["pending"]?.object?.entries ?? [] { if let id = v.string { pending[b] = id } }
        savePending()
        replacing.formUnion((j["replacing"]?.array ?? []).compactMap(\.string))
        dropHeld(account)
    }

    func deviceBranches() -> [String: (system: String, state: EngineState)] {
        var out: [String: (system: String, state: EngineState)] = [:]
        for s in readLocalSystems().systems {
            let b = progressBranch(s)
            if let st = readLocal(b), st.cards.count > 0 { out[b] = (s.id, st) }
        }
        return out
    }

    public func deviceCards(account: String) -> Int {
        let owner = disk.read("owner.json").flatMap { String(data: $0, encoding: .utf8) } ?? ""
        guard owner != account else { return 0 }
        return deviceBranches().values.reduce(0) { $0 + $1.state.cards.count }
    }

    public func accountCards() async -> Int? {
        guard let server = await pull() else { return nil }
        return SystemsDoc(js: server[Self.systemsBranch]?["data"]).systems.reduce(0) { n, s in
            n + (server[progressBranch(s)]?["data"].map { EngineState(js: $0).cards.count } ?? 0)
        }
    }

    func dropDeviceProgress() {
        for s in readLocalSystems().systems {
            let b = progressBranch(s)
            disk.remove("branch-\(b).json")
            pending[b] = nil
        }
        disk.remove("systems.json")
        pending[Self.systemsBranch] = nil
        savePending()
        systems = []
        states = [:]
    }

    public func syncAfterSignIn(account: String, keep: ProgressKeep = .both) async {
        let ep = epoch
        let device = keep == .device ? deviceBranches() : [:]
        if keep == .account { dropDeviceProgress() }
        restoreHeld(account)
        for (b, d) in device {
            writeLocal(b, d.state)
            pending[b] = d.system
            replacing.insert(b)
        }
        if !device.isEmpty { savePending() }
        setOwner(account)
        if hasLocalSystems { await persistSystems(epoch: ep) }
        guard epoch == ep else { return }
        await waitForLoad()
        guard epoch == ep else { return }
        status = .idle
        await load(force: true)
        guard epoch == ep else { return }
        let server = await pull()
        let t = await token()
        guard epoch == ep, let server, let t else { return }
        for s in systems {
            let branch = progressBranch(s)
            if server[branch] == nil, let local = readLocal(branch) {
                _ = await send(t, branch, local.js, over: server, epoch: ep)
                guard epoch == ep else { return }
            }
        }
        disk.write("guest-lesson.json", Data())
    }

    public func resync() async {
        let mine = epoch
        guard status != .loading, let server = await pull(), let t = await token(), epoch == mine else { return }
        let remoteDoc = SystemsDoc(js: server[Self.systemsBranch]?["data"])
        let doc = mergeSystems(readLocalSystems(), remoteDoc)
        writeLocalSystems(doc)
        systems = doc.systems
        var statuses: [Int] = []
        if hasLocalSystems, doc != remoteDoc { statuses.append(await send(t, Self.systemsBranch, doc.js, over: server, epoch: mine)) }
        for s in systems {
            guard epoch == mine else { return }
            let branch = progressBranch(s)
            let stored = readLocal(branch)
            let remote = server[branch].map { spreadingUntouchedPlaced(EngineState(js: $0["data"]), now: now()) }
            let merged = replacing.contains(branch) ? states[s.id] ?? stored ?? EngineState() : remote.map { mergeState(states[s.id] ?? stored, $0) } ?? states[s.id] ?? stored ?? EngineState()
            states[s.id] = merged
            if stored != merged { writeLocal(branch, merged) }
            if server[branch].map({ EngineState(js: $0["data"]) }) != merged {
                let gen = generation[branch, default: 0]
                let status = await send(t, branch, merged.js, over: server, epoch: mine)
                guard epoch == mine else { return }
                statuses.append(status)
                if status == 409 {
                    let wait = min((refusedUntil[branch]?.wait ?? 15_000) * 2, 3_600_000)
                    refusedUntil[branch] = (now() + wait, wait)
                } else if (200..<300).contains(status) {
                    refusedUntil[branch] = nil
                    replacing.remove(branch)
                    if generation[branch, default: 0] == gen { pending[branch] = nil } else { await push(s.id, branch) }
                }
            } else {
                pending[branch] = nil
            }
        }
        guard epoch == mine else { return }
        known = loadKnown(server)
        if pending[KnownLanguages.branch] != nil { await persistKnown(epoch: mine) }
        guard epoch == mine else { return }
        if statuses.allSatisfy({ (200..<300).contains($0) }) { pending[Self.systemsBranch] = nil }
        savePending()
        if let bad = statuses.first(where: { !(200..<300).contains($0) }) { saveState = Self.failure(statuses.contains(403) ? 403 : bad) }
        else if saveState != .idle && pending.isEmpty { saveState = .synced }
    }

    public func flush() async {
        for t in pushes.values { t.cancel() }
        pushes = [:]
        let ep = epoch
        for (branch, systemId) in pending {
            guard epoch == ep else { return }
            await deliver(systemId, branch, epoch: ep)
        }
    }

    public func clearLocal(accountDeleted: Bool = false) {
        for t in pushes.values { t.cancel() }
        pushes = [:]
        if accountDeleted {
            if let owner = disk.read("owner.json").flatMap({ String(data: $0, encoding: .utf8) }) { dropHeld(owner) }
            pending = [:]
        }
        pruneHeld()
        let held = holdPending()
        pending = [:]
        disk.removeAll()
        for (name, data) in held { disk.write(name, data) }
        if !held.isEmpty { writeHeldOwners(held.map { String($0.0.dropFirst(5).dropLast(5)) }) }
        systems = []
        known = KnownLanguages([])
        states = [:]
        saveState = .idle
        reloadAfter = false
        epoch += 1
        inFlight = [:]
        refusedUntil = [:]
        replacing = []
        pulled = false
        status = .idle
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
