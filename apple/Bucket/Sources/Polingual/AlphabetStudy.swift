import BucketKit
import SwiftUI

enum HeritageMode {
    static func key(_ systemId: String) -> String { "heritage.\(systemId)" }
    static func on(_ systemId: String) -> Bool { UserDefaults.standard.bool(forKey: key(systemId)) }
}

struct AlphabetStudy: View {
    @Environment(LangStore.self) private var store
    let systemId: String
    let lang: String

    @State private var queue: [Int] = []
    @State private var i = 0
    @State private var current: Exercise?
    @State private var rng = Rng(seed: UInt32(UInt64(Date().timeIntervalSince1970) % 2147483647))
    @State private var right = 0

    var unit: AlphabetUnit? { LangScript.alphabetUnit(lang) }

    var body: some View {
        Group {
            if let unit {
                if let current {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 10) {
                            ProgressView(value: Double(i), total: Double(max(queue.count, 1))).tint(D8.malachite)
                            Text("\(i + 1)/\(queue.count)").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted).monospacedDigit()
                        }
                        ExerciseView(ex: current, readings: false, reading: { _, _ in nil }, onDone: done)
                            .id("\(i)-\(current.answer)")
                        Spacer(minLength: 0)
                    }
                    .padding(16)
                } else {
                    VStack(spacing: 14) {
                        Text(queue.isEmpty ? String(localized: "No letters due") : String(localized: "Letters done")).font(.system(size: 28, weight: .bold, design: .rounded))
                        Text(LangScript.alphabetDone(store.state(systemId), lang) ? String(localized: "You know most of the \(unit.title). Heritage cards now ask you to spell words.") : String(localized: "\(right) of \(queue.count) right. New letters come in fives."))
                            .multilineTextAlignment(.center)
                            .foregroundStyle(Palette.muted)
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } else {
                Text("This language uses the Latin alphabet.").foregroundStyle(Palette.muted)
            }
        }
        .paper()
        .navigationTitle(unit?.title ?? "")
        .inlineTitle()
        .onAppear { if queue.isEmpty { start() } }
    }

    func start() {
        guard let unit, let system = store.system(systemId) else { return }
        let now = Date().timeIntervalSince1970 * 1000
        let picked = letterQueue(system, store.state(systemId), now: now).filter { $0.lang == lang }
        queue = picked.compactMap { e in unit.letters.firstIndex { LangScript.letterItemId($0.ch) == e.itemId } }
        i = 0
        next()
    }

    func next() {
        current = i < queue.count ? letterExercise(lang, "en", queue[i], &rng) : nil
    }

    func done(_ results: [ExerciseResult]) {
        guard let ex = current else { return }
        for r in results {
            store.grade(systemId, lang: lang, itemId: ex.itemId, rating: r.rating)
            if r.rating > 1 { right += 1 }
        }
        i += 1
        next()
    }
}
