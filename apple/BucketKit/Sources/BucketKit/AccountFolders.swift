import Foundation

public struct AccountFolders: Sendable {
    public static let stores = ["polingual", "academy"]
    public static let guest = "guest"
    static let heldIndex = "held-index.json"

    public enum Phase: String, Codable, Sendable { case copied, verified, done }

    struct Marker: Codable { var key: String; var phase: Phase }

    let base: URL
    let copy: @Sendable (URL, URL) throws -> Void

    public init(base: URL? = nil, copy: @escaping @Sendable (URL, URL) throws -> Void = { try FileManager.default.copyItem(at: $0, to: $1) }) {
        self.base = base ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        self.copy = copy
    }

    public static func key(userId: String?) -> String { userId.map(AccountIndex.key) ?? guest }

    var accounts: URL { base.appending(path: "accounts", directoryHint: .isDirectory) }
    var markerURL: URL { accounts.appending(path: "migration.json") }

    public func folder(_ key: String) -> URL { accounts.appending(path: key, directoryHint: .isDirectory) }
    func tmp(_ key: String) -> URL { accounts.appending(path: "\(key).tmp", directoryHint: .isDirectory) }
    func root(_ store: String) -> URL { base.appending(path: store, directoryHint: .isDirectory) }

    public func disk(_ store: String, key: String?) -> FileLangDisk {
        FileLangDisk(root: key.map { folder($0).appending(path: store, directoryHint: .isDirectory) } ?? root(store))
    }

    var marker: Marker? {
        (try? Data(contentsOf: markerURL)).flatMap { try? JSONDecoder().decode(Marker.self, from: $0) }
    }

    func writeMarker(_ m: Marker) throws {
        try JSONEncoder().encode(m).write(to: markerURL, options: .atomic)
    }

    public var migrated: Bool { marker != nil }
    public var phase: Phase? { marker?.phase }

    public func activeKey(userId: String?) -> String? {
        FileManager.default.fileExists(atPath: markerURL.path) ? Self.key(userId: userId) : nil
    }

    var errorURL: URL { base.appending(path: "account-migration-error.txt") }

    public var lastError: String? { (try? Data(contentsOf: errorURL)).map { String(decoding: $0, as: UTF8.self) } }

    func record(_ error: Error?) {
        guard let error else { try? FileManager.default.removeItem(at: errorURL); return }
        try? Data("\(ISO8601DateFormatter().string(from: .now)) \(error.localizedDescription)".utf8).write(to: errorURL, options: .atomic)
    }

    @discardableResult
    public func migrate(userId: String?) throws -> String {
        let fm = FileManager.default
        if var m = marker {
            if m.phase == .copied { m.phase = .verified; try writeMarker(m) }
            return m.key
        }
        if fm.fileExists(atPath: markerURL.path) { throw BucketError.server(0, "The account folder record is unreadable.") }
        let key = Self.key(userId: userId)
        if fm.fileExists(atPath: accounts.path) { try fm.removeItem(at: accounts) }
        try fm.createDirectory(at: tmp(key), withIntermediateDirectories: true)
        for store in Self.stores {
            let src = root(store)
            let dst = tmp(key).appending(path: store, directoryHint: .isDirectory)
            try fm.createDirectory(at: dst, withIntermediateDirectories: true)
            for name in mainFiles(src) { try copy(src.appending(path: name), dst.appending(path: name)) }
            let want = Self.files(under: src, top: Set(mainFiles(src)))
            guard Self.files(under: dst) == want else { throw BucketError.server(0, "Moving \(store) did not verify.") }
            for rel in want {
                guard let a = try? Data(contentsOf: src.appending(path: rel)), let b = try? Data(contentsOf: dst.appending(path: rel)), a == b else {
                    throw BucketError.server(0, "Moving \(store)/\(rel) did not verify.")
                }
            }
        }
        try fm.moveItem(at: tmp(key), to: folder(key))
        try placeHeld()
        try writeMarker(Marker(key: key, phase: .copied))
        return key
    }

    public struct Promotion: Codable, Sendable, Equatable {
        public enum State: String, Codable, Sendable { case promote, retire }
        public let userId: String
        public let state: State
        public var key: String { AccountIndex.key(userId) }
    }

    var promoteURL: URL { accounts.appending(path: "promote.json") }

    public var promotion: Promotion? {
        (try? Data(contentsOf: promoteURL)).flatMap { try? JSONDecoder().decode(Promotion.self, from: $0) }
    }

    public func record(_ p: Promotion) {
        try? FileManager.default.createDirectory(at: accounts, withIntermediateDirectories: true)
        try? JSONEncoder().encode(p).write(to: promoteURL, options: .atomic)
    }

    func clearPromotion() throws {
        if FileManager.default.fileExists(atPath: promoteURL.path) { try FileManager.default.removeItem(at: promoteURL) }
    }

    func guestHasPending() -> Bool {
        let file = folder(Self.guest).appending(path: "polingual/pending.json")
        guard let d = try? Data(contentsOf: file) else { return false }
        guard let o = (try? JSON.parse(d))?.object else { return true }
        return !o.entries.isEmpty
    }

    public func setGuestAside(now: Date = .now, clear: Bool = true) throws {
        let fm = FileManager.default
        let guest = folder(Self.guest)
        if fm.fileExists(atPath: guest.path) {
            var dst = accounts.appending(path: "guest.aside-\(Int(now.timeIntervalSince1970))", directoryHint: .isDirectory)
            if fm.fileExists(atPath: dst.path) { dst = accounts.appending(path: "guest.aside-\(UUID().uuidString)", directoryHint: .isDirectory) }
            try fm.moveItem(at: guest, to: dst)
        }
        if clear { try clearPromotion() }
    }

    public func promoteGuest(into key: String, carry: () -> Void) throws -> Bool {
        guard let p = promotion, p.state == .promote, p.key == key, key != Self.guest else { return false }
        if guestHasPending() { return false }
        let fm = FileManager.default
        if fm.fileExists(atPath: folder(Self.guest).path) {
            if fm.fileExists(atPath: folder(key).path) { try setGuestAside(clear: false) } else { try fm.moveItem(at: folder(Self.guest), to: folder(key)) }
        }
        carry()
        try? clearPromotion()
        return true
    }

    public func finishAfterLoad() throws {
        guard var m = marker, m.phase == .verified else { return }
        let fm = FileManager.default
        let held = heldOwners().map { "held-\($0).json" } + [Self.heldIndex]
        for store in Self.stores {
            let src = root(store)
            for name in mainFiles(src) + (store == "polingual" ? held : []) where fm.fileExists(atPath: src.appending(path: name).path) {
                try fm.removeItem(at: src.appending(path: name))
            }
        }
        m.phase = .done
        try writeMarker(m)
    }

    static func files(under dir: URL, top: Set<String>? = nil) -> Set<String> {
        let base = dir.standardizedFileURL.path + "/"
        guard let e = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: [.isRegularFileKey]) else { return [] }
        var out = Set<String>()
        for case let url as URL in e where (try? url.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true {
            let rel = String(url.standardizedFileURL.path.dropFirst(base.count))
            if let top, let head = rel.split(separator: "/").first, !top.contains(String(head)) { continue }
            out.insert(rel)
        }
        return out
    }

    func heldOwners() -> [String] {
        (try? Data(contentsOf: root("polingual").appending(path: Self.heldIndex))).flatMap { try? JSON.parse($0) }?.stringArray ?? []
    }

    func mainFiles(_ dir: URL) -> [String] {
        ((try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? [])
            .filter { !$0.hasPrefix("held-") && $0 != "owner.json" && !$0.hasPrefix(".") }
            .sorted()
    }

    func placeHeld() throws {
        let fm = FileManager.default
        let src = root("polingual")
        for owner in heldOwners() {
            let name = "held-\(owner).json"
            guard let blob = try? Data(contentsOf: src.appending(path: name)) else { continue }
            let dst = folder(Self.key(userId: owner)).appending(path: "polingual", directoryHint: .isDirectory)
            try fm.createDirectory(at: dst, withIntermediateDirectories: true)
            try blob.write(to: dst.appending(path: name), options: .atomic)
            let idx = dst.appending(path: Self.heldIndex)
            var list = (try? Data(contentsOf: idx)).flatMap { try? JSON.parse($0) }?.stringArray ?? []
            if !list.contains(owner) { list.append(owner) }
            try JSON.data(.array(list.map(JSValue.string))).write(to: idx, options: .atomic)
        }
    }
}
