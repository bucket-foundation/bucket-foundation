import BucketKit
import Foundation
import Testing
@testable import Polingual

struct KeyboardShortcutTests {
    func ex(_ kind: ExerciseKind, options: [String]?) -> Exercise {
        var e = Exercise(kind: kind, itemId: "i", lang: "es", root: "en", prompt: "night", promptLang: "en", answer: "noche", answerLang: "es")
        e.options = options
        return e
    }

    @Test func numberKeysNeverRunWhileAnAnswerIsTyped() {
        let opts = ["noche", "día", "tarde", "luz"]
        for kind in [ExerciseKind.translate, .typeHeard, .spellHeard] {
            for speech in [true, false] {
                #expect(ExerciseView.typed(ex(kind, options: opts), speech: speech, heard: nil))
                #expect(!ExerciseView.choiceKeys(ex(kind, options: opts), speech: speech, heard: nil), "\(kind)")
            }
        }
        #expect(!ExerciseView.choiceKeys(ex(.conjugate, options: nil), speech: true, heard: nil))
        #expect(!ExerciseView.choiceKeys(ex(.speak, options: opts), speech: true, heard: ""))
        #expect(!ExerciseView.choiceKeys(ex(.speak, options: opts), speech: false, heard: nil))
    }

    @Test func onlyAnUnansweredTypedCardGoesCompactSideways() {
        #expect(ExerciseView.compactTyping(sideways: true, typing: true, verdict: nil))
        #expect(!ExerciseView.compactTyping(sideways: false, typing: true, verdict: nil))
        #expect(!ExerciseView.compactTyping(sideways: true, typing: false, verdict: nil))
        #expect(!ExerciseView.compactTyping(sideways: true, typing: true, verdict: .wrong))
    }

    @Test func numberKeysRunOnChoiceCardsOnly() {
        let opts = ["noche", "día", "tarde", "luz"]
        for kind in [ExerciseKind.choose, .reverse, .listen, .cloze, .gender, .sentence, .cognate] {
            #expect(ExerciseView.choiceKeys(ex(kind, options: opts), speech: true, heard: nil), "\(kind)")
            #expect(!ExerciseView.typed(ex(kind, options: opts), speech: true, heard: nil), "\(kind)")
        }
        #expect(ExerciseView.choiceKeys(ex(.conjugate, options: opts), speech: true, heard: nil))
        #expect(!ExerciseView.choiceKeys(ex(.choose, options: nil), speech: true, heard: nil))
    }
}
