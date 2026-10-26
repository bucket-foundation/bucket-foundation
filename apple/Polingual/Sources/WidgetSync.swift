import BucketKit
import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

@MainActor
enum WidgetSync {
    static func refresh(_ store: LangStore, now: Date = .now) {
        guard let corpus = store.corpus, let system = store.systems.first else { return }
        let state = store.state(system.id)
        let ms = now.timeIntervalSince1970 * 1000
        let due = langDue(store).filter { $0.due <= ms }.count
        let newToday = store.systems.reduce(0) { $0 + langNewLeft($1, store.state($1.id), now: ms) }
        let word = wordOfDay(system, corpus, state, day: dayKey(ms))
        WidgetSnapshot(streak: langStreak(store), due: due, newToday: newToday,
                       words: system.targets.compactMap { l in word?.form(l).map { WidgetWord(lang: l, form: $0) } },
                       gloss: word?.form(system.root) ?? "", updated: now).write()
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}
