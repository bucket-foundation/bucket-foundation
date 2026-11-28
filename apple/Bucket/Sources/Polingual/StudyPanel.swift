import BucketKit
import SwiftUI

enum StudyCopy {
    static let title = "a study on reading time"
    static let body = "Polingual is testing how much of each session should go to reading and listening. If you take part, the app picks one of three settings for you at random, gives you a 3 minute word test now and another around day 28, and stores your study logs with the setting you got. Your logs stay tied to your account and are used only for this study and for Polingual itself."
    static let leaveAnyTime = "You can leave at any time from this page, and your sessions go back to the usual mix."
    static let join = "take part"
    static let decline = "no thanks"
    static let ask = "Do you know this word? Some of these are made up, so say no if you are not sure."
    static let yes = "I know it"
    static let no = "no"
    static let later = "later"
    static let leave = "leave the study"
    static let leaveLink = "leave the reading-time study"
    static func progress(_ i: Int, _ n: Int) -> String { "word test · \(i) / \(n)" }
}

enum StudyConfig {
    static var flag: Bool { InputExperiment.on(Bundle.main.object(forInfoDictionaryKey: "PolingualInputExperiment") as? String) }

    static func forms(_ lang: String) -> [String: [YesNoTest.TestItem]]? {
        YesNoTest.forms(Bundle.main.url(forResource: lang, withExtension: "json", subdirectory: "Corpus/yesno").flatMap { try? Data(contentsOf: $0) })
    }

    static func heldOut(_ langs: [String]) -> [String: Set<String>] {
        guard InputExperiment.mayTakePart(StudyPrefs().consent(flag: flag)) else { return [:] }
        return Dictionary(uniqueKeysWithValues: langs.map { ($0, InputExperiment.heldOutWords(forms($0))) }.filter { !$0.1.isEmpty })
    }
}

struct StudyPanel: View {
    let step: StudyPrefs.Step
    let lang: String
    let onTest: (String, [YesNoTest.TestItem], Set<String>, Double) -> Void
    let onDone: () -> Void
    @State private var current: StudyPrefs.Step?

    var body: some View {
        switch current ?? step {
        case .disclose:
            PLCard {
                VStack(alignment: .leading, spacing: PL.Space.s3) {
                    Text(StudyCopy.title).plType(PL.title).foregroundStyle(PL.ink)
                    Text(StudyCopy.body).foregroundStyle(PL.inkDim)
                    Text(StudyCopy.leaveAnyTime).foregroundStyle(PL.inkDim)
                    HStack(spacing: PL.Space.s3) {
                        Button(StudyCopy.join) {
                            StudyPrefs().join()
                            if let next = StudyPrefs().step(flag: StudyConfig.flag, now: Date().timeIntervalSince1970 * 1000) { current = next } else { onDone() }
                        }
                        .buttonStyle(.pl(.primary)).accessibilityIdentifier("study-join")
                        Button(StudyCopy.decline) {
                            StudyPrefs().leave()
                            onDone()
                        }
                        .buttonStyle(.pl(.secondary)).accessibilityIdentifier("study-decline")
                    }
                }
            }
        case .test(let phase):
            if let items = StudyConfig.forms(lang)?[phase == "baseline" ? "A" : "B"] {
                YesNoRun(lang: lang, items: items, onFinish: { yes, seconds in onTest(phase, items, yes, seconds) }, onSkip: onDone)
            } else {
                Color.clear.onAppear(perform: onDone)
            }
        }
    }
}

private struct YesNoRun: View {
    let lang: String
    let items: [YesNoTest.TestItem]
    let onFinish: (Set<String>, Double) -> Void
    let onSkip: () -> Void
    @State private var at = 0
    @State private var yes: Set<String> = []
    @State private var started = Date()

    var body: some View {
        PLCard {
            VStack(alignment: .leading, spacing: PL.Space.s3) {
                Text(StudyCopy.progress(at + 1, items.count)).font(PL.text(12)).monospacedDigit().foregroundStyle(PL.inkDim)
                Text(StudyCopy.ask).foregroundStyle(PL.inkDim)
                Text(items[at].word).font(PL.text(32, .semibold)).foregroundStyle(PL.ink)
                    .environment(\.locale, Locale(identifier: lang)).accessibilityIdentifier("yes-no-word")
                HStack(spacing: PL.Space.s3) {
                    Button(StudyCopy.yes) { answer(true) }.buttonStyle(.pl(.primary)).accessibilityIdentifier("yes-no-yes")
                    Button(StudyCopy.no) { answer(false) }.buttonStyle(.pl(.secondary)).accessibilityIdentifier("yes-no-no")
                }
                HStack(spacing: PL.Space.s4) {
                    Button(StudyCopy.later, action: onSkip).buttonStyle(.pl(.quiet))
                    Button(StudyCopy.leave) {
                        StudyPrefs().leave()
                        onSkip()
                    }
                    .buttonStyle(.pl(.quiet)).accessibilityIdentifier("study-leave")
                }
            }
        }
    }

    func answer(_ known: Bool) {
        var next = yes
        if known { next.insert(items[at].word) }
        if at + 1 >= items.count { onFinish(next, Date().timeIntervalSince(started)) } else {
            yes = next
            at += 1
        }
    }
}

struct StudyLeaveLink: View {
    @State private var left = false

    var body: some View {
        if !left && StudyPrefs().showsLeave(flag: StudyConfig.flag) {
            Button(StudyCopy.leaveLink) {
                StudyPrefs().leave()
                left = true
            }
            .font(PL.text(12)).underline().foregroundStyle(PL.inkDim).buttonStyle(.plain).accessibilityIdentifier("study-leave")
        }
    }
}
