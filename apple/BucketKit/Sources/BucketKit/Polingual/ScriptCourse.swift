import Foundation

public enum ScriptCourse {
    static let latinLetters: [String: String] = [
        "es": "ñ=ny:as_in_canyon ll=y:as_in_yes j=h:a_rough_h rr=rr:a_rolled_r ch=ch:as_in_church á=a:stressed_a é=e:stressed_e í=i:stressed_i ó=o:stressed_o ú=u:stressed_u ü=w:as_in_pingüino h=silent:never_said qu=k:as_in_queso gu=g:before_e_or_i z=s:th_in_Spain ce=se:th_in_Spain v=b:same_as_b",
        "fr": "é=ay:as_in_café è=eh:as_in_bed ê=eh:as_in_fête ç=s:as_in_façade à=a:as_in_là â=ah:as_in_pâte î=ee:as_in_île ô=oh:closed_o û=ü:as_in_sûr œ=eu:as_in_cœur ou=oo:as_in_food eau=oh:as_in_eau ch=sh:as_in_chat gn=ny:as_in_canyon on=õ:nasal_on an=ã:nasal_an ai=eh:as_in_lait au=oh:as_in_jaune oi=wa:as_in_moi eu=ö:as_in_deux in=ẽ:nasal_in qu=k:as_in_qui ill=ee-y:as_in_fille r=ʁ:throat_r u=ü:as_in_tu",
        "it": "gli=ly:as_in_million gn=ny:as_in_canyon ch=k:before_e_or_i ci=chee:as_in_cheese gi=jee:as_in_jeep sc=sh:before_e_or_i z=ts:as_in_pizza à=a:stressed_a è=eh:open_e é=ay:closed_e ò=o:open_o ù=oo:stressed_u gh=g:before_e_or_i qu=kw:as_in_quick ce=che:as_in_chest ge=je:as_in_jet r=rr:tapped_r",
        "pt": "ã=ã:nasal_a õ=õ:nasal_o ç=s:as_in_façade nh=ny:as_in_canyon lh=ly:as_in_million á=a:stressed_a â=uh:closed_a é=eh:open_e ê=ay:closed_e ó=aw:open_o ô=oh:closed_o ão=ow:nasal_ow ch=sh:as_in_shoe x=sh:as_in_caixa rr=ʁ:throat_r ou=oh:as_in_ouro em=ãy:nasal_ay s=sh:before_a_consonant_or_at_the_end",
        "de": "ä=eh:as_in_bed ö=ö:rounded_e ü=ü:rounded_i ß=ss:sharp_s ch=kh:as_in_Bach sch=sh:as_in_shoe ei=eye:as_in_Stein ie=ee:as_in_see eu=oy:as_in_boy w=v:as_in_van z=ts:as_in_cats v=f:as_in_fox st=sht:at_a_word_start sp=shp:at_a_word_start äu=oy:as_in_Haus qu=kv:k_then_v j=y:as_in_yes r=ʁ:throat_r",
        "nl": "ij=ei:as_in_ijs ui=öy:no_English_match oe=oo:as_in_food g=kh:throat_h eu=ö:rounded_e ou=ow:as_in_house sch=skh:s_then_kh w=v:soft_v j=y:as_in_yes ie=ee:as_in_see ee=ay:held_steady oo=oh:held_steady ei=ei:same_as_ij au=ow:same_as_ou ng=ng:as_in_sing",
        "sv": "å=oa:as_in_more ä=eh:as_in_bed ö=ö:rounded_e sj=hw:breathy_sh tj=ch:soft_sh j=y:as_in_yes k=sh:before_e_i_y y=ü:rounded_i sk=hw:before_e_i_y g=y:before_e_i_y o=oo:tight_oo hj=y:silent_h lj=y:silent_l",
        "fi": "ä=a:as_in_cat ö=ö:rounded_e y=ü:rounded_i aa=aa:long_a ii=ee:long_i kk=kk:held_k j=y:as_in_yes ää=aaa:long_ä uu=oo:long_u ie=ee-eh:one_glide tt=tt:held_t r=rr:rolled_r nk=nk:as_in_bank",
        "pl": "ą=on:nasal_o ę=en:nasal_e ć=ch:soft_ch ł=w:as_in_water ń=ny:as_in_canyon ó=oo:as_in_food ś=sh:soft_sh ź=zh:soft_zh ż=zh:as_in_pleasure cz=ch:as_in_church sz=sh:as_in_shoe rz=zh:as_in_pleasure w=v:as_in_van ch=kh:as_in_Bach dz=dz:as_in_kids dż=j:as_in_jam dź=dj:soft_j ci=ch:soft_ch si=sh:soft_sh zi=zh:soft_zh ni=ny:as_in_canyon c=ts:as_in_cats j=y:as_in_yes y=i:as_in_sit",
        "tr": "ç=ch:as_in_church ş=sh:as_in_shoe ğ=silent:lengthens_vowel ı=ɯ:undotted_i ö=ö:rounded_e ü=ü:rounded_i c=j:as_in_jam j=zh:as_in_pleasure",
        "cs": "č=ch:as_in_church š=sh:as_in_shoe ž=zh:as_in_pleasure ř=rzh:rolled_r_zh ě=ye:as_in_yes ů=oo:long_u ch=kh:as_in_Bach ň=ny:as_in_canyon ť=ty:soft_t ď=dy:soft_d c=ts:as_in_cats j=y:as_in_yes á=aa:long_a ou=oh:glide_to_w",
        "vi": "đ=d:as_in_dog ă=a:short_a â=uh:short_uh ê=ay:closed_e ô=oh:closed_o ơ=uh:as_in_fur ư=ư:unrounded_u nh=ny:as_in_canyon ng=ng:as_in_sing ngh=ng:before_e_i gi=z:y_in_the_south d=z:y_in_the_south x=s:as_in_sun ph=f:as_in_fan th=t:with_a_breath tr=ch:stiff_ch ch=ch:no_puff kh=kh:as_in_Bach r=z:r_in_the_south qu=kw:as_in_quick",
        "id": "c=ch:as_in_church ng=ng:as_in_sing ny=ny:as_in_canyon sy=sh:as_in_shoe kh=kh:as_in_Bach",
    ]
    static let basicLatin = "a=a:as_in_father b=b c=k:or_s d=d e=e:as_in_bed f=f g=g h=h i=ee:as_in_see j=j k=k l=l m=m n=n o=o:as_in_or p=p q=k r=r s=s t=t u=oo:as_in_food v=v w=w x=ks y=y z=z"
    static let latinRoots: Set<String> = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "fi", "pl", "tr", "cs", "vi", "id", "la"]
    static let recallStability = 2.0
    static let blendOptions = 3

    static func parse(_ raw: String) -> [Letter] {
        raw.split(separator: " ").compactMap { p in
            let parts = p.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            let rest = parts[1].split(separator: ":", maxSplits: 1).map(String.init)
            return Letter(ch: parts[0], sound: rest[0], name: rest.count > 1 ? rest[1].replacingOccurrences(of: "_", with: " ") : nil)
        }
    }

    public static func latinUnit(_ lang: String, root: String) -> AlphabetUnit? {
        guard latinLetters[lang] != nil || lang == "en" else { return nil }
        let known = latinRoots.contains(root) ? Set(parse(latinLetters[root] ?? "").map { "\($0.ch)=\($0.sound)" }) : []
        let own = parse(latinLetters[lang] ?? "").filter { !known.contains("\($0.ch)=\($0.sound)") }
        let ownChs = Set(parse(latinLetters[lang] ?? "").map(\.ch))
        let letters = (latinRoots.contains(root) ? [] : parse(basicLatin).filter { !ownChs.contains($0.ch) }) + own
        guard !letters.isEmpty, lang != root else { return nil }
        return AlphabetUnit(id: "latin-\(lang)-from-\(root)", lang: lang, script: "Latn", title: "\(Lang.name(lang)) letters", letters: letters)
    }

    static let characterUnits: [String: AlphabetUnit] = CharacterTables.entries.reduce(into: [:]) { out, pair in
        out[pair.key] = AlphabetUnit(id: "characters-\(pair.key)", lang: pair.key, script: "Hani", title: CharacterTables.titles[pair.key] ?? "Characters",
                                     letters: pair.value.map { Letter(ch: $0.ch, sound: $0.meaning, name: $0.reading) })
    }

    public static func characterUnit(_ lang: String) -> AlphabetUnit? { characterUnits[lang] }

    static let toneUnit = AlphabetUnit(id: "tones-zh", lang: "zh", script: "tones", title: "Mandarin tones", letters: LetterSounds.toneLetters, share: 1)
    static let pinyinUnit = AlphabetUnit(id: "pinyin-zh", lang: "zh", script: "pinyin", title: "Pinyin", letters: parse(LetterSounds.pinyinLetters), share: 1)
    static let kanaMarksUnit = AlphabetUnit(id: "kana-marks-ja", lang: "ja", script: "kana-marks", title: "Kana marks and long sounds", letters: parse(LetterSounds.kanaMarkLetters))

    public static func units(_ lang: String, root: String = "en") -> [AlphabetUnit] {
        guard lang != root else { return [] }
        let readsHanzi = root == "zh" || root == "ja"
        let ear = SoundContrasts.units(lang)
        if lang == "zh" {
            return [toneUnit] + ear + [pinyinUnit] + SoundContrasts.units(lang, .afterSpelling) + (readsHanzi ? [] : [characterUnits["zh"]].compactMap { $0 })
        }
        if let latin = latinUnit(lang, root: root) { return ear + [latin] }
        let sameScript = LangScript.scripts[lang].map { $0.script == LangScript.scripts[root]?.script } ?? false
        let kana = lang == "ja" && !sameScript
        return ear + [sameScript ? nil : LangScript.alphabetUnit(lang), kana ? kanaMarksUnit : nil, readsHanzi ? nil : characterUnit(lang)].compactMap { $0 }
    }

    static func recalled(_ card: Card?) -> Bool {
        guard let card, card.state == "review" else { return false }
        return (card.stability ?? 0) >= recallStability
    }

    public static func done(_ state: EngineState, _ unit: AlphabetUnit, share: Double? = nil) -> Bool {
        let right = unit.letters.filter { recalled(state.cards[LangScript.letterCardId(unit.lang, $0.ch)]) }.count
        return Double(right) >= (Double(unit.letters.count) * (share ?? unit.share)).rounded(.up)
    }

    public static func pending(_ state: EngineState, _ lang: String, root: String = "en") -> Bool {
        units(lang, root: root).contains { !done(state, $0) }
    }

    public static func isCharacter(_ lang: String, _ ch: String) -> Bool {
        CharacterTables.entries[lang]?.contains { $0.ch == ch } ?? false
    }

    public static func isTone(_ lang: String, _ ch: String) -> Bool {
        lang == "zh" && toneUnit.letters.contains { $0.ch == ch }
    }

    static func unseen(_ unit: AlphabetUnit, _ state: EngineState, known: [String]?) -> [Letter] {
        var pool = unit.letters.filter { !state.cards.has(LangScript.letterCardId(unit.lang, $0.ch)) }
        if unit.lang == "ja", unit.script == "Hani", let known {
            let met = Set(known.joined())
            pool = pool.filter { $0.ch.first.map(met.contains) ?? false }
        }
        return pool
    }

    public static func queue(_ system: LangSystem, _ state: EngineState, now: Double, perSession: Int = lettersPerSession, known: (String) -> [String]? = { _ in nil }) -> [QueueEntry] {
        var out: [QueueEntry] = []
        for lang in system.targets {
            let course = units(lang, root: system.root)
            let due = course.flatMap(\.letters).filter { l in (state.cards[LangScript.letterCardId(lang, l.ch)]?.due).map { $0 <= now } ?? false }
            let next = course.first { !done(state, $0) }.map { Array(unseen($0, state, known: known(lang)).prefix(max(0, perSession - due.count))) } ?? []
            for l in due + next { out.append(QueueEntry(itemId: LangScript.letterItemId(l.ch), lang: lang, stage: .letter)) }
        }
        return out
    }

    static func found(_ lang: String, _ root: String, _ itemId: String) -> (unit: AlphabetUnit, letter: Letter)? {
        for unit in units(lang, root: root) + [LangScript.alphabetUnit(lang), characterUnit(lang)].compactMap({ $0 }) {
            if let letter = unit.letters.first(where: { LangScript.letterItemId($0.ch) == itemId }) { return (unit, letter) }
        }
        return nil
    }

    public static func letter(_ lang: String, _ root: String, _ itemId: String) -> Letter? {
        found(lang, root, itemId)?.letter
    }

    public static func intro(_ lang: String, _ root: String, _ itemId: String) -> Exercise? {
        guard let letter = letter(lang, root, itemId) else { return nil }
        let says = isCharacter(lang, letter.ch) ? "means “\(letter.sound)”" : "sounds like “\(letter.sound)”"
        var ex = Exercise(kind: .intro, itemId: itemId, lang: lang, root: root, prompt: letter.name.map { "\(says), \($0)" } ?? says, promptLang: root, answer: letter.ch, answerLang: lang)
        ex.answerReading = Reading(roman: letter.sound)
        if let contrast = SoundContrasts.lookup(lang, letter.ch) {
            ex.spoken = contrast.words
            ex.hint = contrast.hint
            ex.nativeVoice = contrast.nativeVoice
        }
        return ex
    }

    static func rotation(_ unit: AlphabetUnit, reps: Int) -> [ExerciseKind] {
        let order: [ExerciseKind] = switch unit.script {
        case "Hani", "tones": [.letter, .letterSound]
        case "Latn": [.blend, .letter, .letterSound]
        default: [.letter, .blend, .letterSound]
        }
        let start = reps % order.count
        return Array(order[start...] + order[..<start])
    }

    public static func exercise(_ lang: String, _ root: String, _ itemId: String, _ rng: inout Rng, state: EngineState? = nil) -> Exercise? {
        guard let hit = found(lang, root, itemId) else { return nil }
        if SoundContrasts.lookup(lang, hit.letter.ch) != nil { return drill(.minimalPair, lang, root, itemId, &rng, state: state) }
        let reps = Int(state?.cards[LangScript.letterCardId(lang, hit.letter.ch)]?.reps ?? 0)
        for kind in rotation(hit.unit, reps: reps) {
            if let ex = drill(kind, lang, root, itemId, &rng, state: state) { return ex }
        }
        return nil
    }

    public static func drill(_ kind: ExerciseKind, _ lang: String, _ root: String, _ itemId: String, _ rng: inout Rng, state: EngineState? = nil) -> Exercise? {
        guard let (unit, letter) = found(lang, root, itemId) else { return nil }
        switch kind {
        case .minimalPair: return contrastDrill(unit, letter, itemId, root, &rng)
        case .letterSound: return letterToSound(unit, letter, itemId, root, &rng)
        case .blend: return blend(unit, letter, itemId, root, state, &rng)
        default: return soundToLetter(unit, letter, itemId, root, &rng)
        }
    }

    static func sameSound(_ lang: String, _ letter: Letter, as other: String, in unit: AlphabetUnit) -> Bool {
        if unit.letters.contains(where: { $0.ch == other && $0.sound == letter.sound }) { return true }
        guard let a = LetterSounds.lookup(lang, letter.ch)?.ipa, !a.isEmpty else { return false }
        return LetterSounds.lookup(lang, other)?.ipa == a
    }

    static func rivals(_ unit: AlphabetUnit, _ letter: Letter, _ rng: inout Rng) -> [String] {
        let lang = unit.lang
        let near = shuffle(Confusables.near(lang, letter.ch).sorted(), &rng)
        let others = shuffle(unit.letters.map(\.ch), &rng)
        let ipa = LetterSounds.lookup(lang, letter.ch)?.ipa ?? ""
        let ranked = others.enumerated().sorted { a, b in
            let x = closeness(lang, letter.ch, ipa, a.element), y = closeness(lang, letter.ch, ipa, b.element)
            return x != y ? x < y : a.offset < b.offset
        }.map(\.element)
        var seen: Set<String> = [letter.ch]
        return (near + ranked).filter { seen.insert($0).inserted && !sameSound(lang, letter, as: $0, in: unit) }
    }

    static func closeness(_ lang: String, _ ch: String, _ ipa: String, _ other: String) -> Int {
        if isCharacter(lang, ch) { return -CharacterTables.shared(lang, ch, other) }
        guard !ipa.isEmpty, let theirs = LetterSounds.lookup(lang, other)?.ipa else { return Int.max }
        return LangScript.distance(ipa, theirs)
    }

    static func soundToLetter(_ unit: AlphabetUnit, _ letter: Letter, _ itemId: String, _ root: String, _ rng: inout Rng) -> Exercise {
        let lang = unit.lang
        var ex = Exercise(kind: .letter, itemId: itemId, lang: lang, root: root, prompt: letter.name.map { "\(letter.sound) · \($0)" } ?? letter.sound, promptLang: lang, answer: letter.ch, answerLang: lang, note: unit.title)
        ex.options = shuffle([letter.ch] + Array(rivals(unit, letter, &rng).prefix(3)), &rng)
        ex.accept = letter.name != nil ? [letter.ch] : unit.letters.filter { $0.sound == letter.sound }.map(\.ch)
        ex.promptReading = Reading(roman: letter.sound)
        return ex
    }

    static func optionLabel(_ lang: String, _ letter: Letter) -> String {
        guard isCharacter(lang, letter.ch), let reading = letter.name else { return letter.sound }
        return "\(reading) · \(letter.sound)"
    }

    static func letterToSound(_ unit: AlphabetUnit, _ letter: Letter, _ itemId: String, _ root: String, _ rng: inout Rng) -> Exercise? {
        let lang = unit.lang
        guard let sound = LetterSounds.lookup(lang, letter.ch) else { return nil }
        let option = { (l: Letter, s: LetterSound) in SpokenOption(key: l.ch, text: optionLabel(lang, l), say: LetterSounds.spoken(lang, s), gloss: s.example) }
        var labels: Set<String> = [optionLabel(lang, letter)]
        let others = rivals(unit, letter, &rng).compactMap { ch -> SpokenOption? in
            guard let l = unit.letters.first(where: { $0.ch == ch }), let s = LetterSounds.lookup(lang, ch), labels.insert(optionLabel(lang, l)).inserted else { return nil }
            return option(l, s)
        }
        guard !others.isEmpty else { return nil }
        var ex = Exercise(kind: .letterSound, itemId: itemId, lang: lang, root: root, prompt: letter.ch, promptLang: lang, answer: letter.ch, answerLang: lang, note: unit.title)
        ex.spoken = shuffle([option(letter, sound)] + others.prefix(3), &rng)
        return ex
    }

    static func letterScalars(_ ch: String) -> [Unicode.Scalar] {
        ch.lowercased().unicodeScalars.filter { $0 != "◌" }
    }

    static func readable(_ word: String, _ unit: AlphabetUnit, _ letter: Letter, _ root: String, _ state: EngineState?) -> Bool {
        if unit.script == "Latn", latinRoots.contains(root) { return true }
        var known = Set(letterScalars(letter.ch))
        for l in unit.letters where state?.cards.has(LangScript.letterCardId(unit.lang, l.ch)) == true { known.formUnion(letterScalars(l.ch)) }
        let taught = Set(unit.letters.flatMap { letterScalars($0.ch) })
        return word.lowercased().unicodeScalars.allSatisfy { !taught.contains($0) || known.contains($0) }
    }

    static func segments(_ word: String, _ unit: AlphabetUnit) -> [String] {
        guard unit.script == "Latn" || unit.script == "pinyin" else { return word.filter { $0 != " " }.map(String.init) }
        let folded = { (c: Character) in String(String.UnicodeScalarView(c.lowercased().unicodeScalars.map { LetterSounds.toneless[$0] ?? $0 })) }
        let spellings = Set(unit.letters.map(\.ch))
        let chars = Array(word)
        var out: [String] = []
        var i = 0
        while i < chars.count {
            let taken = (2...3).reversed().first { n in i + n <= chars.count && spellings.contains(chars[i..<(i + n)].map(folded).joined()) } ?? 1
            out.append(String(chars[i..<(i + taken)]))
            i += taken
        }
        return out
    }

    static func blend(_ unit: AlphabetUnit, _ letter: Letter, _ itemId: String, _ root: String, _ state: EngineState?, _ rng: inout Rng) -> Exercise? {
        let lang = unit.lang
        var seen = Set<String>()
        let pool = unit.letters.compactMap { LetterSounds.lookup(lang, $0.ch) }.filter { seen.insert($0.example).inserted }
        let own = LetterSounds.lookup(lang, letter.ch)
        let holds = pool.filter { LetterSounds.parts($0, letter.ch) != nil }
        guard let target = ([own].compactMap { $0 } + holds).first(where: { readable($0.example, unit, letter, root, state) }) else { return nil }
        let say = LetterSounds.spoken(lang, target)
        let ranked = shuffle(pool, &rng).enumerated().sorted { a, b in
            let x = LangScript.distance(a.element.example, target.example), y = LangScript.distance(b.element.example, target.example)
            return x != y ? x < y : a.offset < b.offset
        }.map(\.element)
        var heard: Set<String> = [say]
        let others = ranked.filter { heard.insert(LetterSounds.spoken(lang, $0)).inserted }.prefix(blendOptions - 1)
        guard others.count == blendOptions - 1 else { return nil }
        let option = { (s: LetterSound) in SpokenOption(key: s.example, text: s.example, say: LetterSounds.spoken(lang, s), gloss: s.gloss) }
        var ex = Exercise(kind: .blend, itemId: itemId, lang: lang, root: root, prompt: target.example, promptLang: lang, answer: target.example, answerLang: lang, note: unit.title)
        ex.spoken = shuffle([option(target)] + others.map(option), &rng)
        ex.segments = segments(target.example, unit)
        ex.hint = letter.ch
        return ex
    }

    static func contrastDrill(_ unit: AlphabetUnit, _ letter: Letter, _ itemId: String, _ root: String, _ rng: inout Rng) -> Exercise? {
        guard let contrast = SoundContrasts.lookup(unit.lang, letter.ch) else { return nil }
        let target = contrast.words[rng.index(contrast.words.count)]
        var ex = Exercise(kind: .minimalPair, itemId: itemId, lang: unit.lang, root: root, prompt: target.say, promptLang: unit.lang, answer: target.key, answerLang: unit.lang, note: unit.title)
        ex.spoken = contrast.words
        ex.hint = contrast.hint
        ex.nativeVoice = contrast.nativeVoice
        return ex
    }
}
