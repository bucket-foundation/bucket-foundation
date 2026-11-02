import Foundation
import Observation

@MainActor
@Observable
public final class TodayPlanStore {
    public static let branch = "today-plan"
    static let file = "today-plan.json"

    public private(set) var plan: TodayPlan
    @ObservationIgnored public var token: @MainActor () async -> String?

    let api: BucketAPI
    let disk: LangDisk
    let now: @MainActor () -> Double
    let tz: @MainActor () -> TimeZone
    @ObservationIgnored private var pushing: Task<Void, Never>?

    public init(api: BucketAPI, disk: LangDisk? = nil, token: @escaping @MainActor () async -> String? = { nil }, now: @escaping @MainActor () -> Double = { Date().timeIntervalSince1970 * 1000 }, tz: @escaping @MainActor () -> TimeZone = { .current }) {
        self.api = api
        self.disk = disk ?? ScienceStore.defaultDisk()
        self.token = token
        self.now = now
        self.tz = tz
        plan = self.disk.read(Self.file).flatMap { try? JSON.parse($0) }.flatMap { TodayPlan(js: $0) } ?? TodayPlan()
    }

    public var day: String { dayKey(now(), tz: tz()) }

    public func contains(_ id: String) -> Bool { plan.contains(id) }

    public func isDone(_ id: String) -> Bool { plan.isDone(id, day: day) }

    public func adopt(_ defaults: [TodayItem]) {
        guard !plan.customized, plan.items != defaults else { return }
        plan.adopt(defaults)
        save()
    }

    public func add(_ item: TodayItem) { change { $0.add(item, now: now()) } }

    public func remove(_ id: String) { change { $0.remove(id, now: now()) } }

    public func order(_ ids: [String]) { change { $0.order(ids, now: now()) } }

    public func move(_ id: String, toTop: Bool) { change { $0.move(id, toTop: toTop, now: now()) } }

    public func setDone(_ id: String, _ on: Bool) {
        guard isDone(id) != on else { return }
        change { $0.setDone(id, on, day: day, now: now()) }
    }

    public func finish(_ id: String) {
        if contains(id) { setDone(id, true) }
    }

    public func pull() async {
        guard let t = await token(), let server = await api.progressPull(token: t) else { return }
        let remote = TodayPlan(js: server[Self.branch]?["data"])
        let merged = remote.map { TodayPlan.merge(plan, $0) } ?? plan
        if merged != plan {
            plan = merged
            save()
        }
        if merged.customized || !merged.done.isEmpty || merged.marks != nil, merged != remote { _ = await api.progressPush(token: t, branch: Self.branch, data: merged.js) }
    }

    public func flush() async {
        await pushing?.value
    }

    public func clearLocal() {
        pushing?.cancel()
        pushing = nil
        plan = TodayPlan()
        disk.write(Self.file, JSON.data(plan.js))
    }

    private func change(_ edit: (inout TodayPlan) -> Void) {
        edit(&plan)
        save()
        let previous = pushing
        pushing = Task {
            await previous?.value
            guard !Task.isCancelled, let t = await token() else { return }
            _ = await api.progressPush(token: t, branch: Self.branch, data: plan.js)
        }
    }

    private func save() {
        disk.write(Self.file, JSON.data(plan.js))
    }
}
