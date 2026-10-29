public enum ScriptCourse {
    static let latinLetters: [String: String] = [
        "es": "ñ=ny:as_in_canyon ll=y:as_in_yes j=h:a_rough_h rr=rr:a_rolled_r ch=ch:as_in_church á=a:stressed_a é=e:stressed_e í=i:stressed_i ó=o:stressed_o ú=u:stressed_u ü=w:as_in_pingüino h=silent:never_said",
        "fr": "é=ay:as_in_café è=eh:as_in_bed ê=eh:as_in_fête ç=s:as_in_façade à=a:as_in_là â=ah:as_in_pâte î=ee:as_in_île ô=oh:closed_o û=ü:as_in_sûr œ=eu:as_in_cœur ou=oo:as_in_food eau=oh:as_in_eau ch=sh:as_in_chat gn=ny:as_in_canyon on=õ:nasal_on an=ã:nasal_an",
        "it": "gli=ly:as_in_million gn=ny:as_in_canyon ch=k:before_e_or_i ci=chee:as_in_cheese gi=jee:as_in_jeep sc=sh:before_e_or_i z=ts:as_in_pizza à=a:stressed_a è=eh:open_e é=ay:closed_e ò=o:open_o ù=oo:stressed_u",
        "pt": "ã=ã:nasal_a õ=õ:nasal_o ç=s:as_in_façade nh=ny:as_in_canyon lh=ly:as_in_million á=a:stressed_a â=uh:closed_a é=eh:open_e ê=ay:closed_e ó=aw:open_o ô=oh:closed_o ão=ow:nasal_ow",
        "de": "ä=eh:as_in_bed ö=ö:rounded_e ü=ü:rounded_i ß=ss:sharp_s ch=kh:as_in_Bach sch=sh:as_in_shoe ei=eye:as_in_Stein ie=ee:as_in_see eu=oy:as_in_boy w=v:as_in_van z=ts:as_in_cats v=f:as_in_fox",
        "nl": "ij=ei:as_in_ijs ui=öy:no_English_match oe=oo:as_in_food g=kh:throat_h eu=ö:rounded_e ou=ow:as_in_house sch=skh:s_then_kh w=v:soft_v j=y:as_in_yes",
        "sv": "å=oa:as_in_more ä=eh:as_in_bed ö=ö:rounded_e sj=hw:breathy_sh tj=ch:soft_sh j=y:as_in_yes k=sh:before_e_i_y y=ü:rounded_i",
        "fi": "ä=a:as_in_cat ö=ö:rounded_e y=ü:rounded_i aa=aa:long_a ii=ee:long_i kk=kk:held_k j=y:as_in_yes",
        "pl": "ą=on:nasal_o ę=en:nasal_e ć=ch:soft_ch ł=w:as_in_water ń=ny:as_in_canyon ó=oo:as_in_food ś=sh:soft_sh ź=zh:soft_zh ż=zh:as_in_pleasure cz=ch:as_in_church sz=sh:as_in_shoe rz=zh:as_in_pleasure w=v:as_in_van",
        "tr": "ç=ch:as_in_church ş=sh:as_in_shoe ğ=silent:lengthens_vowel ı=ɯ:undotted_i ö=ö:rounded_e ü=ü:rounded_i c=j:as_in_jam",
        "cs": "č=ch:as_in_church š=sh:as_in_shoe ž=zh:as_in_pleasure ř=rzh:rolled_r_zh ě=ye:as_in_yes ů=oo:long_u ch=kh:as_in_Bach",
        "vi": "đ=d:as_in_dog ă=a:short_a â=uh:short_uh ê=ay:closed_e ô=oh:closed_o ơ=uh:as_in_fur ư=ư:unrounded_u",
    ]
    static let basicLatin = "a=a:as_in_father b=b c=k:or_s d=d e=e:as_in_bed f=f g=g h=h i=ee:as_in_see j=j k=k l=l m=m n=n o=o:as_in_or p=p q=k r=r s=s t=t u=oo:as_in_food v=v w=w x=ks y=y z=z"
    static let latinRoots: Set<String> = ["en", "es", "fr", "it", "pt", "de", "nl", "sv", "fi", "pl", "tr", "cs", "vi", "id", "la"]

    static func parse(_ raw: String) -> [Letter] {
        raw.split(separator: " ").compactMap { p in
            let parts = p.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            let rest = parts[1].split(separator: ":", maxSplits: 1).map(String.init)
            return Letter(ch: parts[0], sound: rest[0], name: rest.count > 1 ? rest[1].replacingOccurrences(of: "_", with: " ") : nil)
        }
    }

    public static func latinUnit(_ lang: String, root: String) -> AlphabetUnit? {
        guard latinLetters[lang] != nil || lang == "id" || lang == "en" else { return nil }
        let known = latinRoots.contains(root) ? Set(parse(latinLetters[root] ?? "").map { "\($0.ch)=\($0.sound)" }) : []
        let own = parse(latinLetters[lang] ?? "").filter { !known.contains("\($0.ch)=\($0.sound)") }
        let ownChs = Set(parse(latinLetters[lang] ?? "").map(\.ch))
        let letters = (latinRoots.contains(root) ? [] : parse(basicLatin).filter { !ownChs.contains($0.ch) }) + own
        guard !letters.isEmpty, lang != root else { return nil }
        return AlphabetUnit(id: "latin-\(lang)-from-\(root)", lang: lang, script: "Latn", title: "\(Lang.name(lang)) letters", letters: letters)
    }
    static let characterTables: [String: (title: String, table: String)] = [
        "zh": ("Chinese characters", "的=of 是=to_be 在=to_exist 我=I 和=and 有=to_have 不=no 人=person 也=also 你=you 为=for 他=he 这=this 中=within 年=year 对=correct 就=in_that_case 都=all 上=up 说=to_speak 吗=question_word 会=can 到=to_reach 要=to_want 来=to_come 月=moon 被=quilt 还=still 后=back 等=to_wait_for 但=but 于=in 日=sun 将=will 一=one 很=very 让=to_yield 从=from 以=to_use 好=good 大=big 她=she 着=to_touch 多=many 时=time 给=to 把=to_hold 去=to_go 看=to_see 又=again 或=maybe 下=down 过=to_cross 新=new 里=lining 做=to_make 地=earth 由=to_follow 没=drowned 更=more 得=to_obtain 所=actually 想=to_think 最=highest_degree 它=it 那=that 三=three 吧=bar 其=his 该=should 只=only 向=towards 前=front 出=to_go_out 已=already 小=small 内=inside 才=ability 爱=to_love 谁=who 号=to_call_out 事=matter 快=rapid 比=to_compare 跟=heel 请=to_ask 长=chief 高=high 至=to_arrive 钱=coin 万=ten_thousand 像=to_resemble 点=to_touch_briefly 听=to_listen_to 起=to_rise 两=two 自=self 国=country 带=band 走=to_walk 吃=to_eat 无=not_to_have 话=dialect 区=area 太=highest 家=home 约=make_an_appointment 者=one_who__... 开=to_open 站=station 元=currency_unit 写=to_write 因=cause 成=to_succeed 分=to_divide 死=to_die 买=to_buy 叫=to_shout 图=diagram 曾=once"),
        "ja": ("Kanji", "一=one 二=two 物=thing 番=one's_turn 闇=darkness 毛=hair 緑=green 善=good 人=person 日=sun 年=year 的=target 月=Moon 見=to_see 中=middle 何=what 私=I 時=time 今=now 方=direction 前=front 気=spirit 話=talk 分=minute 家=house 円=round_or_circular_ob 後=back 性=sex 上=above 数=number 万=ten_thousand 来=to_come 本=book 他=another 市=market 度=degree 手=hand 三=three 力=physical_strength 僕=manservant 国=land 子=child 金=gold 車=car 男=male_person 所=place 女=female_person 次=next 様=way 新=novelty 生=raw 先=before 内=inside 声=voice 頭=head 心=heart 代=price 神=spirit_or_an_essence 下=lower_portion 元=cause 別=difference 点=spot 型=style 体=body 水=water 得=benefit 側=side 夜=night 機=machine 法=principle 外=outside 色=color 初=first 音=sound 娘=daughter 夢=dream 式=type 風=wind 件=case 愛=love 花=flower 口=mouth 朝=morning 際=edge 昔=past 地=earth 夏=summer 長=chief 室=cellar 軍=army 戦=battle 王=East_Asian_queen_re 寝=sleep 米=rice 期=specific_time_or_dat 線=line 犬=dog 光=physically_perceived 海=sea 母=woman_who_breastfeed 主=head_of_the_family 父=father 品=grace 嘘=lie 逆=reverse 量=volume 敵=enemy 白=color_white 面=face 小=smallness 百=hundred 星=star 笑=smile 妻=wife 変=change 観=look 木=tree 官=government_office 山=mountain__or__hill 味=flavor"),
    ]

    public static func characterUnit(_ lang: String) -> AlphabetUnit? {
        guard let t = characterTables[lang] else { return nil }
        let letters = t.table.split(separator: " ").compactMap { p -> Letter? in
            let parts = p.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { return nil }
            return Letter(ch: parts[0], sound: parts[1].replacingOccurrences(of: "_", with: " "), name: nil)
        }
        return AlphabetUnit(id: "characters-\(lang)", lang: lang, script: "Hani", title: t.title, letters: letters)
    }

    public static func units(_ lang: String, root: String = "en") -> [AlphabetUnit] {
        let readsHanzi = root == "zh" || root == "ja"
        if lang == "zh" { return readsHanzi ? [] : characterUnit(lang).map { [$0] } ?? [] }
        if let latin = latinUnit(lang, root: root) { return [latin] }
        let sameScript = LangScript.scripts[lang].map { $0.script == LangScript.scripts[root]?.script } ?? false
        return [sameScript ? nil : LangScript.alphabetUnit(lang), readsHanzi ? nil : characterUnit(lang)].compactMap { $0 }
    }

    public static func done(_ state: EngineState, _ unit: AlphabetUnit, share: Double = 0.8) -> Bool {
        let seen = unit.letters.filter { (state.cards[LangScript.letterCardId(unit.lang, $0.ch)]?.reps ?? 0) > 0 }.count
        return Double(seen) >= (Double(unit.letters.count) * share).rounded(.up)
    }

    public static func pending(_ state: EngineState, _ lang: String, root: String = "en") -> Bool {
        units(lang, root: root).contains { !done(state, $0) }
    }

    public static func isCharacter(_ lang: String, _ ch: String) -> Bool {
        characterUnit(lang)?.letters.contains { $0.ch == ch } ?? false
    }

    public static func queue(_ system: LangSystem, _ state: EngineState, now: Double, perSession: Int = lettersPerSession) -> [QueueEntry] {
        var out: [QueueEntry] = []
        for lang in system.targets {
            var fresh = perSession
            for unit in units(lang, root: system.root) {
                let due = unit.letters.filter { l in (state.cards[LangScript.letterCardId(lang, l.ch)]?.due).map { $0 <= now } ?? false }
                fresh = max(0, fresh - due.count)
                let next = done(state, unit) ? [] : Array(unit.letters.filter { !state.cards.has(LangScript.letterCardId(lang, $0.ch)) }.prefix(fresh))
                fresh -= next.count
                for l in due + next { out.append(QueueEntry(itemId: LangScript.letterItemId(l.ch), lang: lang, stage: .letter)) }
                if !done(state, unit) { break }
            }
        }
        return out
    }

    public static func letter(_ lang: String, _ root: String, _ itemId: String) -> Letter? {
        [latinUnit(lang, root: root), LangScript.alphabetUnit(lang), characterUnit(lang)].compactMap { $0 }
            .lazy.compactMap { $0.letters.first { LangScript.letterItemId($0.ch) == itemId } }.first
    }

    public static func intro(_ lang: String, _ root: String, _ itemId: String) -> Exercise? {
        guard let letter = letter(lang, root, itemId) else { return nil }
        let says = isCharacter(lang, letter.ch) ? "means “\(letter.sound)”" : "sounds like “\(letter.sound)”"
        var ex = Exercise(kind: .intro, itemId: itemId, lang: lang, root: root, prompt: letter.name.map { "\(says), \($0)" } ?? says, promptLang: root, answer: letter.ch, answerLang: lang)
        ex.answerReading = Reading(roman: letter.sound)
        return ex
    }

    public static func exercise(_ lang: String, _ root: String, _ itemId: String, _ rng: inout Rng) -> Exercise? {
        for unit in [latinUnit(lang, root: root), LangScript.alphabetUnit(lang), characterUnit(lang)].compactMap({ $0 }) {
            guard let letter = unit.letters.first(where: { LangScript.letterItemId($0.ch) == itemId }) else { continue }
            let others = Array(shuffle(unit.letters.filter { $0.ch != letter.ch && $0.sound != letter.sound }, &rng).prefix(3)).map(\.ch)
            var ex = Exercise(kind: .letter, itemId: itemId, lang: lang, root: root, prompt: letter.name.map { "\(letter.sound) · \($0)" } ?? letter.sound, promptLang: lang, answer: letter.ch, answerLang: lang, note: unit.title)
            ex.options = shuffle([letter.ch] + others, &rng)
            ex.accept = letter.name != nil ? [letter.ch] : unit.letters.filter { $0.sound == letter.sound }.map(\.ch)
            ex.promptReading = Reading(roman: letter.sound)
            return ex
        }
        return nil
    }
}
