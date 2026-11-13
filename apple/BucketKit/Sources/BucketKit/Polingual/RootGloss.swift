import Foundation

public enum RootGloss {
    public static let letterKinds: Set<ExerciseKind> = [.letter, .letterSound, .blend, .minimalPair]

    public static func text(_ ex: Exercise, _ corpus: LangCorpus?) -> String? {
        if let m = ex.meaning, !m.isEmpty { return m }
        if let item = corpus?.items.first(where: { $0.id == ex.itemId }), let f = item.form(ex.root), !f.isEmpty { return f }
        if ex.promptLang == ex.root, !ex.prompt.isEmpty { return ex.prompt }
        if ex.answerLang == ex.root, !ex.answer.isEmpty { return ex.answer }
        return nil
    }
}
