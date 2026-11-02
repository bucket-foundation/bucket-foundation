import Testing
@testable import BucketKit

@Test func latinTargetsTeachOnlyLettersTheRootLacks() {
    let fromEnglish = ScriptCourse.units("es", root: "en").filter { $0.script == "Latn" }
    #expect(fromEnglish.count == 1 && fromEnglish[0].letters.contains { $0.ch == "ñ" } && !fromEnglish[0].letters.contains { $0.ch == "b" })
    let fromSpanish = ScriptCourse.units("pt", root: "es").last!.letters.map(\.ch)
    #expect(fromSpanish.contains("ã") && !fromSpanish.contains("ñ"))
    let fromRussian = ScriptCourse.units("es", root: "ru").last!.letters.map(\.ch)
    #expect(fromRussian.contains("b") && fromRussian.contains("ñ"))
    #expect(ScriptCourse.units("en", root: "en").isEmpty)
}

@Test func otherScriptsGetAlphabetsAndCharacters() {
    #expect(ScriptCourse.units("ja", root: "en").map(\.script) == ["contrast", "hiragana", "kana-marks", "Hani"])
    #expect(ScriptCourse.units("zh", root: "en").map(\.script) == ["tones", "contrast", "pinyin", "contrast", "Hani"])
    #expect(ScriptCourse.units("zh", root: "ja").map(\.script) == ["tones", "contrast", "pinyin", "contrast"])
    #expect(ScriptCourse.units("ja", root: "zh").last?.script == "kana-marks")
    #expect(ScriptCourse.units("ru", root: "en").map(\.script) == ["contrast", "cyrillic"])
    #expect(ScriptCourse.isCharacter("zh", "的"))
}

@Test func writingQueueStartsWithFreshLettersAndExercisesResolve() {
    let system = LangSystem(id: "s", name: "E", root: "en", targets: ["zh", "de"], createdAt: 0)
    let q = ScriptCourse.queue(system, EngineState(), now: 0)
    #expect(q.filter { $0.lang == "zh" }.count == lettersPerSession && q.filter { $0.lang == "de" }.count == lettersPerSession)
    var rng = Rng(seed: 7)
    for e in q { #expect(ScriptCourse.exercise(e.lang, "en", e.itemId, &rng) != nil) }
    #expect(q.first { $0.lang == "zh" }.flatMap { ScriptCourse.exercise($0.lang, "en", $0.itemId, &rng) }?.kind == .letter)
    #expect(q.first { $0.lang == "de" }.flatMap { ScriptCourse.exercise($0.lang, "en", $0.itemId, &rng) }?.kind == .minimalPair)
}

@Test func latinUnitsHaveOneEntryPerLetterAndCompareSounds() {
    for lang in ["es", "de", "tr", "pl", "fr", "en"] {
        for root in ["en", "ru", "es", "fr"] {
            guard let unit = ScriptCourse.latinUnit(lang, root: root) else { continue }
            #expect(Set(unit.letters.map(\.ch)).count == unit.letters.count, "\(lang) from \(root)")
        }
    }
    #expect(ScriptCourse.latinUnit("de", root: "ru")!.letters.first { $0.ch == "w" }?.sound == "v")
    #expect(ScriptCourse.latinUnit("es", root: "fr")!.letters.contains { $0.ch == "ch" })
}

@Test func newLettersAreTaughtBeforeTheyAreQuizzed() {
    let id = LangScript.letterItemId("é")
    let fr = ScriptCourse.intro("fr", "en", id)
    #expect(fr?.kind == .intro && fr?.answer == "é" && fr?.answerLang == "fr" && fr?.prompt == "sounds like “ay”, as in café")
    #expect(ScriptCourse.intro("zh", "en", LangScript.letterItemId("我"))?.prompt == "means “I”, wǒ")
    #expect(ScriptCourse.intro("fr", "en", "nope") == nil)
}

func course(_ lang: String, _ root: String = "en") -> [AlphabetUnit] { ScriptCourse.units(lang, root: root) }

func grade(_ state: EngineState, _ unit: AlphabetUnit, rating: Rating, now: Double = 0) -> EngineState {
    unit.letters.reduce(state) { gradeCard($0, unit.lang, LangScript.letterItemId($1.ch), rating, now: now, tz: "UTC") }
}

@Test func doneRequiresRecallAndNotAFailedOrAidedAnswer() {
    let unit = LangScript.alphabetUnit("ko")!
    #expect(!ScriptCourse.done(grade(EngineState(), unit, rating: 1), unit))
    #expect(!ScriptCourse.done(grade(EngineState(), unit, rating: 2), unit))
    #expect(ScriptCourse.done(grade(EngineState(), unit, rating: 3), unit))
    let unlearned = grade(EngineState(), unit, rating: 3)
    #expect(!ScriptCourse.done(grade(unlearned, unit, rating: 1, now: DAY_MS), unit))
}

@Test func aFailedUnitHoldsBackTheNextOneAndReviewsStayDue() {
    let system = LangSystem(id: "s", name: "E", root: "en", targets: ["ru"], createdAt: 0)
    let first = course("ru")[0]
    let failed = grade(EngineState(), first, rating: 1)
    let next = ScriptCourse.queue(system, failed, now: 0)
    #expect(next.isEmpty)
    let passed = grade(EngineState(), first, rating: 3)
    #expect(ScriptCourse.queue(system, passed, now: 0).first?.itemId == LangScript.letterItemId("а"))
    let due = ScriptCourse.queue(system, grade(passed, course("ru")[1], rating: 3), now: 40 * DAY_MS)
    #expect(due.contains { $0.itemId == LangScript.letterItemId("а") })
}

@Test func mandarinTeachesEveryTrickySpellingBeforeCharacters() {
    let pinyin = ScriptCourse.pinyinUnit
    #expect(pinyin.share == 1 && ScriptCourse.toneUnit.share == 1)
    for ch in ["x", "q", "zh", "iu", "ui"] {
        #expect(pinyin.letters.contains { $0.ch == ch })
        let s = LetterSounds.lookup("zh", ch)
        #expect(s?.flag != nil && !(s?.hint.isEmpty ?? true), "\(ch)")
        #expect(LetterSounds.parts(s!, ch) != nil, "\(ch)")
    }
    #expect(LetterSounds.parts(LetterSounds.lookup("zh", "iu")!, "iu")?.letter == "iǔ")
    #expect(LangScript.alphabetUnit("zh")?.letters.first?.ch == "ㄅ")
    #expect(!course("zh").contains { $0.script == "zhuyin" })
}

@Test func everyCourseLetterHasCheckedSoundData() {
    var bad: [String] = []
    for unit in [ScriptCourse.toneUnit, ScriptCourse.pinyinUnit, ScriptCourse.kanaMarksUnit] + ScriptCourse.characterUnits.values {
        #expect(Set(unit.letters.map(\.ch)).count == unit.letters.count, "\(unit.id)")
        for l in unit.letters {
            guard let s = LetterSounds.lookup(unit.lang, l.ch) else { bad.append("\(unit.id) \(l.ch) missing"); continue }
            if s.hint.isEmpty || s.gloss.isEmpty || LetterSounds.spoken(unit.lang, s).isEmpty { bad.append("\(l.ch) empty") }
            if s.ipa.isEmpty && s.reading == nil { bad.append("\(l.ch) no ipa or reading") }
            if LetterSounds.parts(s, l.ch) == nil { bad.append("\(l.ch) not in \(s.example)") }
        }
    }
    #expect(bad.isEmpty, "\(bad.count): \(bad.prefix(30).joined(separator: ", "))")
}

@Test func characterTablesCarryReadingsAndCorrectMeanings() {
    let zh = Dictionary(uniqueKeysWithValues: CharacterTables.entries["zh"]!.map { ($0.ch, $0) })
    let ja = CharacterTables.entries["ja"]!
    #expect(zh["被"]?.meaning.contains("passive") == true && zh["没"]?.meaning.contains("not") == true)
    #expect(!ja.contains { $0.ch == "闇" } && ja.count >= 120 && zh.count >= 120)
    #expect(ja.allSatisfy { !$0.reading.isEmpty && $0.word.contains($0.ch) && $0.say.allSatisfy { !$0.isASCII } })
    #expect(zh.values.allSatisfy { !$0.reading.isEmpty && $0.word.contains($0.ch) })
    #expect(LetterSounds.lookup("ja", "待")?.hint.contains("Shares a part with") == true)
}

@Test func kanjiComeFromKnownWordsOnly() {
    let system = LangSystem(id: "s", name: "E", root: "en", targets: ["ja"], createdAt: 0)
    var state = EngineState()
    for unit in course("ja").dropLast() { state = grade(state, unit, rating: 3) }
    #expect(ScriptCourse.queue(system, state, now: 0) { _ in [] }.isEmpty)
    let picked = ScriptCourse.queue(system, state, now: 0) { _ in ["先生", "ねこ"] }.map(\.itemId)
    #expect(Set(picked) == [LangScript.letterItemId("先"), LangScript.letterItemId("生")])
    #expect(ScriptCourse.queue(system, state, now: 0).first?.itemId == LangScript.letterItemId("一"))
}

@Test func kanaCourseStartsWithMoraThenAddsMarksAndLongSounds() {
    let units = course("ja")
    #expect(units[0].title == "Beats" && units[0].letters.count >= 6)
    let marks = Set(ScriptCourse.kanaMarksUnit.letters.map(\.ch))
    #expect(["が", "ぱ", "っ", "ッ", "ー", "きゃ", "じょ", "ばあ", "おう", "シャ"].allSatisfy(marks.contains))
}

@Test func contrastsNameRealPairsAndNoteTheVoiceTheyNeed() {
    for lang in ["zh", "ja", "ko", "th", "vi", "ar", "hi", "ta", "ru", "fr", "de", "es"] { #expect(!SoundContrasts.units(lang).isEmpty, "\(lang)") }
    for (lang, table) in SoundContrasts.index {
        for c in table.values {
            #expect(c.words.count >= 2 && !c.hint.isEmpty, "\(lang)")
            #expect(Set(c.words.map(\.say)).count == c.words.count, "\(lang) \(c.key)")
            #expect(Set(c.words.map(\.text)).count == c.words.count, "\(lang) \(c.key)")
        }
    }
    #expect(SoundContrasts.lookup("ko", "dal/tal/ttal")?.nativeVoice == true)
    #expect(SoundContrasts.nativeRecordingsNeeded["th"] == 6)
    #expect(SoundContrasts.nativeRecordingsNeeded["es"] == nil)
    let tones = SoundContrasts.units("zh")[0].letters.map(\.ch)
    #expect(tones.contains("má/mǎ") && tones.contains("mā/mà"))
}

@Test func contrastDrillPlaysOneWordOfThePair() {
    var rng = Rng(seed: 3)
    let id = LangScript.letterItemId("pero/perro")
    let intro = ScriptCourse.intro("es", "en", id)
    #expect(intro?.kind == .intro && intro?.spoken?.count == 2 && intro?.hint != nil)
    let ex = ScriptCourse.exercise("es", "en", id, &rng)
    #expect(ex?.kind == .minimalPair && ex?.spoken?.contains { $0.key == ex?.answer && $0.say == ex?.prompt } == true)
}

@Test func distractorsAreConfusableNeighbours() {
    var rng = Rng(seed: 5)
    let unit = LangScript.alphabetUnit("ar")!
    for _ in 0..<20 {
        let options = ScriptCourse.exercise("ar", "en", LangScript.letterItemId("ب"), &rng)?.options ?? []
        #expect(options.count == 4 && Set(options).isSubset(of: ["ب", "ت", "ث", "ن", "ي"]))
    }
    let ko = ScriptCourse.exercise("ko", "en", LangScript.letterItemId("ㅏ"), &rng)?.options ?? []
    #expect(Set(ko) == ["ㅏ", "ㅑ", "ㅓ", "ㅕ"])
    let de = ScriptCourse.drill(.letter, "de", "en", LangScript.letterItemId("ü"), &rng)?.options ?? []
    #expect(de.contains("ä") && de.contains("ö") && de.contains("u"))
    let hanzi = ScriptCourse.drill(.letter, "zh", "en", LangScript.letterItemId("他"), &rng)?.options ?? []
    #expect(hanzi.contains("她") && hanzi.contains("它"))
    #expect(unit.letters.count > 4)
    let same = ScriptCourse.drill(.letter, "th", "en", LangScript.letterItemId("ข"), &rng)?.options ?? []
    #expect(!same.contains("ค") && !same.contains("ฃ"))
}

@Test func letterToSoundOffersSpokenOptionsWithoutGivingTheLetterAway() {
    var rng = Rng(seed: 9)
    let ex = ScriptCourse.drill(.letterSound, "ru", "en", LangScript.letterItemId("ш"), &rng)
    #expect(ex?.kind == .letterSound && ex?.answer == "ш" && ex?.spoken?.count == 4)
    #expect(ex?.spoken?.first { $0.key == "ш" }?.text == "sh")
    let hanzi = ScriptCourse.drill(.letterSound, "zh", "en", LangScript.letterItemId("好"), &rng)
    #expect(hanzi?.spoken?.first { $0.key == "好" }?.text == "hǎo · good")
}

@Test func blendingStartsAtOnceForLatinAndWaitsForKnownLettersElsewhere() {
    var rng = Rng(seed: 11)
    let es = ScriptCourse.exercise("es", "en", LangScript.letterItemId("ñ"), &rng)
    #expect(es?.kind == .blend && es?.answer == "niño" && es?.segments == ["n", "i", "ñ", "o"] && es?.spoken?.count == 3)
    let fr = ScriptCourse.exercise("fr", "en", LangScript.letterItemId("gn"), &rng)
    #expect(fr?.segments?.contains("gn") == true)
    #expect(ScriptCourse.drill(.blend, "ru", "en", LangScript.letterItemId("б"), &rng) == nil)
    var state = EngineState()
    for l in LangScript.alphabetUnit("ru")!.letters { state = gradeCard(state, "ru", LangScript.letterItemId(l.ch), 3, now: 0, tz: "UTC") }
    let ru = ScriptCourse.drill(.blend, "ru", "en", LangScript.letterItemId("б"), &rng, state: state)
    #expect(ru?.answer == "брат" && ru?.segments == ["б", "р", "а", "т"])
    let ko = ScriptCourse.drill(.blend, "ko", "en", LangScript.letterItemId("ㅁ"), &rng, state: { var s = EngineState(); for l in LangScript.alphabetUnit("ko")!.letters { s = gradeCard(s, "ko", LangScript.letterItemId(l.ch), 3, now: 0, tz: "UTC") }; return s }())
    #expect(ko?.spoken?.first { $0.key == ko?.answer }?.say == "물")
}

@Test func drillsRotateWithReps() {
    let hangul = LangScript.alphabetUnit("ko")!
    #expect(ScriptCourse.rotation(hangul, reps: 0) == [.letter, .blend, .letterSound])
    #expect(ScriptCourse.rotation(hangul, reps: 1).first == .blend)
    #expect(ScriptCourse.rotation(hangul, reps: 2).first == .letterSound)
    #expect(ScriptCourse.rotation(ScriptCourse.characterUnit("zh")!, reps: 1).first == .letterSound)
    #expect(ScriptCourse.rotation(ScriptCourse.latinUnit("es", root: "en")!, reps: 0).first == .blend)
}
