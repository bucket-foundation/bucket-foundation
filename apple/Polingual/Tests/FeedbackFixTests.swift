import BucketKit
import Foundation
import Testing
@testable import Polingual

struct FeedbackFixTests {
    @Test func articleCardsSayTheWholeNoun() {
        var de = Exercise(kind: .gender, itemId: "g-half", lang: "de", root: "en", prompt: "Hälfte", promptLang: "de", answer: "die", answerLang: "de")
        de.cloze = ("", " Hälfte")
        #expect(ExerciseView.spokenArticle("die", de) == "die Hälfte")
        var fr = Exercise(kind: .gender, itemId: "g-water", lang: "fr", root: "en", prompt: "eau", promptLang: "fr", answer: "l'", answerLang: "fr")
        fr.cloze = ("", "eau")
        #expect(ExerciseView.spokenArticle("l'", fr) == "l'eau")
    }

    @Test func listeningStopsAfterQuietOnlyOnceSomethingWasHeard() {
        let box = HeardBox()
        #expect(box.quietFor() == nil && box.alts.isEmpty)
        let t0 = Date()
        box.update(["quat"])
        box.update(["quattro"])
        box.update(["quattro"])
        #expect(box.alts == ["quattro"])
        let quiet = box.quietFor(now: t0.addingTimeInterval(5)) ?? 0
        #expect(quiet >= 4)
        #expect(LangListener.silence <= 1.0 && LangListener.maxListen == 6)
    }
}
