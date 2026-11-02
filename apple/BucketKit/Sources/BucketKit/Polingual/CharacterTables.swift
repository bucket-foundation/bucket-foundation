struct CharacterEntry: Sendable, Equatable {
    let ch: String
    let reading: String
    let meaning: String
    let components: [String]
    let word: String
    let say: String
    let gloss: String
}

enum CharacterTables {
    static let titles = ["zh": "Chinese characters", "ja": "Kanji"]

    static func parse(_ raw: String) -> [CharacterEntry] {
        raw.split(separator: "\n").compactMap { line in
            let f = line.split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
            guard f.count == 7 else { return nil }
            return CharacterEntry(ch: f[0], reading: f[1], meaning: f[2], components: f[3].split(separator: " ").map(String.init), word: f[4], say: f[5].isEmpty ? f[4] : f[5], gloss: f[6])
        }
    }

    static let entries: [String: [CharacterEntry]] = ["zh": parse(zh), "ja": parse(ja)]

    static func hint(_ entry: CharacterEntry, _ lang: String) -> String {
        var out = "Means \(entry.meaning)."
        guard !entry.components.isEmpty else { return out }
        out += " Built from \(entry.components.joined(separator: " and "))."
        let kin = (entries[lang] ?? []).filter { o in o.ch != entry.ch && !Set(o.components).isDisjoint(with: entry.components) }.prefix(3).map(\.ch)
        if !kin.isEmpty { out += " Shares a part with \(kin.joined(separator: " "))." }
        return out
    }

    static func sound(_ entry: CharacterEntry, _ lang: String) -> LetterSound {
        LetterSound(ipa: "", hint: hint(entry, lang), example: entry.word, gloss: entry.gloss, reading: entry.reading, say: entry.say)
    }

    static func shared(_ lang: String, _ a: String, _ b: String) -> Int {
        guard let x = entries[lang]?.first(where: { $0.ch == a }), let y = entries[lang]?.first(where: { $0.ch == b }) else { return 0 }
        return Set(x.components).intersection(y.components).count
    }

    static let zh = """
    的|de|possessive marker, of|白 勺|我的||mine
    是|shì|to be|日 正|是的||yes, that's right
    在|zài|at, to exist|土|在家||at home
    我|wǒ|I|戈|我们||we
    和|hé|and|禾 口|和平||peace
    有|yǒu|to have|月|有人||somebody
    不|bù|not||不好||not good
    人|rén|person||中国人||Chinese person
    也|yě|also||也是||is also
    你|nǐ|you|亻 尔|你好||hello
    为|wèi|for||因为||because
    他|tā|he|亻 也|他们||they
    这|zhè|this|辶 文|这个||this one
    中|zhōng|middle|口|中国||China
    年|nián|year||今年||this year
    对|duì|correct, toward|又 寸|不对||wrong
    就|jiù|then, right away|京 尤|就是||exactly
    都|dōu|all|者 阝|都是||all are
    上|shàng|up, on||上午||morning
    说|shuō|to speak|讠 兑|说话||to talk
    吗|ma|question particle|口 马|好吗||okay?
    会|huì|can, will|人 云|开会||to hold a meeting
    到|dào|to arrive|至 刂|看到||to see
    要|yào|to want|女|不要||do not
    来|lái|to come||回来||to come back
    月|yuè|moon, month||一月||January
    被|bèi|passive marker, by|衤 皮|被子||quilt
    还|hái|still|辶 不|还是||or, still
    后|hòu|after, behind|口|后面||behind
    等|děng|to wait|寺|等等||wait a moment
    但|dàn|but|亻 旦|但是||but
    于|yú|at, in||关于||about
    日|rì|sun, day||生日||birthday
    将|jiāng|will, about to||将来||future
    一|yī|one||一天||one day
    很|hěn|very|彳 艮|很好||very good
    让|ràng|to let|讠 上|让开||to step aside
    从|cóng|from|人|从前||in the past
    以|yǐ|by means of||可以||can
    好|hǎo|good|女 子|很好||very good
    大|dà|big||大学||university
    她|tā|she|女 也|她们||they, women
    着|zhe|ongoing action marker|目|看着||looking at
    多|duō|many|夕|很多||many
    时|shí|time|日 寸|时间||time
    给|gěi|to give|纟 合|给你||here you are
    把|bǎ|to hold, object marker|扌 巴|把手||handle
    去|qù|to go|土 厶|出去||to go out
    看|kàn|to look|手 目|看见||to see
    又|yòu|again||又来||here again
    或|huò|or|戈 口|或者||or
    下|xià|down, below||下午||afternoon
    过|guò|to pass|辶 寸|过去||the past
    新|xīn|new|亲 斤|新年||New Year
    里|lǐ|inside|田 土|这里||here
    做|zuò|to do, to make|亻 古 攵|做饭||to cook
    地|dì|earth, ground|土 也|地方||place
    由|yóu|by, from|田|自由||freedom
    没|méi|not, have not|氵 殳|没有||do not have
    更|gèng|more||更好||better
    得|dé|to obtain|彳 寸|得到||to obtain
    所|suǒ|place, that which|斤|所以||so, therefore
    想|xiǎng|to think, to want|心|想要||to want
    最|zuì|most|日 又|最好||best
    它|tā|it|宀 匕|它们||they, things
    那|nà|that|阝|那个||that one
    三|sān|three||三天||three days
    吧|ba|suggestion particle|口 巴|好吧||all right
    其|qí|its, that||其他||other
    该|gāi|should|讠 亥|应该||should
    只|zhǐ|only|口 八|只有||only
    向|xiàng|toward|口|方向||direction
    前|qián|front, before|刂|以前||before
    出|chū|to go out|山|出来||to come out
    已|yǐ|already||已经||already
    小|xiǎo|small||小心||careful
    内|nèi|inside|人|内容||content
    才|cái|only then||刚才||just now
    爱|ài|to love|友|爱人||spouse
    谁|shéi|who|讠 隹|谁的||whose
    号|hào|number, date|口|几号||what date
    事|shì|matter, thing||事情||matter
    快|kuài|fast|忄 夬|快乐||happy
    比|bǐ|to compare|匕|比如||for example
    跟|gēn|with, to follow|足 艮|跟着||following
    请|qǐng|please, to ask|讠 青|请问||excuse me
    长|cháng|long||长城||Great Wall
    高|gāo|tall, high|口|高兴||happy
    至|zhì|to, until|土|至少||at least
    钱|qián|money|钅|有钱||rich
    万|wàn|ten thousand||一万||ten thousand
    像|xiàng|to resemble|亻 象|好像||to seem
    点|diǎn|dot, o'clock|占 灬|一点||a little
    听|tīng|to listen|口 斤|听说||to hear that
    起|qǐ|to rise|走 己|一起||together
    两|liǎng|two||两个||two of them
    自|zì|self||自己||oneself
    国|guó|country|囗 玉|中国||China
    带|dài|to bring, belt||带来||to bring
    走|zǒu|to walk|土|走路||to walk
    吃|chī|to eat|口 乞|吃饭||to eat a meal
    无|wú|without||无法||unable to
    话|huà|speech, words|讠 舌|电话||telephone
    区|qū|area|匚 乂|地区||region
    太|tài|too, extremely|大|太好了||great
    家|jiā|home, family|宀 豕|大家||everyone
    约|yuē|about, to arrange|纟 勺|大约||about
    者|zhě|one who|日|记者||reporter
    开|kāi|to open||开始||to begin
    站|zhàn|to stand, station|立 占|车站||station
    元|yuán|yuan, currency||元旦||New Year's Day
    写|xiě|to write||写字||to write
    因|yīn|cause|囗 大|因为||because
    成|chéng|to become|戈|成功||success
    分|fēn|to divide, minute|八 刀|分钟||minute
    死|sǐ|to die|匕|死了||dead
    买|mǎi|to buy||买菜||to buy groceries
    叫|jiào|to call, to be named|口|叫做||to be called
    图|tú|picture|囗 冬|地图||map
    曾|céng|once, in the past|日|曾经||once
    """

    static let ja = """
    一|ひと・イチ|one||一つ|ひとつ|one thing
    二|ふた・ニ|two||二つ|ふたつ|two things
    三|みっ・サン|three||三つ|みっつ|three things
    四|よん・シ|four||四つ|よっつ|four things
    五|いつ・ゴ|five||五つ|いつつ|five things
    六|むっ・ロク|six||六つ|むっつ|six things
    七|なな・シチ|seven||七つ|ななつ|seven things
    八|やっ・ハチ|eight||八つ|やっつ|eight things
    九|ここの・キュウ|nine||九つ|ここのつ|nine things
    十|とお・ジュウ|ten||十日|とおか|the tenth
    百|ヒャク|hundred|白|三百|さんびゃく|three hundred
    千|セン|thousand||千円|せんえん|a thousand yen
    万|マン|ten thousand||一万|いちまん|ten thousand
    日|ひ・ニチ|sun, day||日本|にほん|Japan
    本|ほん・もと|book, origin|木|本|ほん|book
    人|ひと・ジン|person||日本人|にほんじん|Japanese person
    年|とし・ネン|year||今年|ことし|this year
    月|つき・ゲツ|moon, month||今月|こんげつ|this month
    時|とき・ジ|time, hour|日 寺|時間|じかん|time
    間|あいだ・カン|between, interval|門 日|時間|じかん|time
    何|なに|what|亻 可|何|なに|what
    私|わたし・シ|I|禾 厶|私|わたし|I
    今|いま・コン|now||今日|きょう|today
    方|かた・ホウ|direction, way||夕方|ゆうがた|evening
    前|まえ・ゼン|before, front|刂|名前|なまえ|name
    後|あと・ゴ|after, behind|彳|午後|ごご|afternoon
    午|ゴ|noon||午後|ごご|afternoon
    気|き・ケ|spirit, energy||元気|げんき|well, healthy
    元|もと・ゲン|origin||元気|げんき|well, healthy
    話|はな(す)・ワ|to speak|言 舌|話す|はなす|to speak
    電|デン|electricity|雨|電話|でんわ|telephone
    語|ゴ|language|言 吾|日本語|にほんご|Japanese
    英|エイ|English, excellent|艹|英語|えいご|English
    読|よ(む)・ドク|to read|言 売|読む|よむ|to read
    言|い(う)・ゲン|to say|口|言う|いう|to say
    分|わ(かる)・フン|minute, to understand|八 刀|分かる|わかる|to understand
    家|いえ・カ|house, family|宀 豕|家族|かぞく|family
    円|エン|yen, circle||千円|せんえん|a thousand yen
    上|うえ・ジョウ|above||上手|じょうず|skillful
    下|した・カ|below||下手|へた|unskillful
    中|なか・チュウ|inside, middle|口|中国|ちゅうごく|China
    外|そと・ガイ|outside|夕 卜|外国|がいこく|foreign country
    国|くに・コク|country|囗 玉|外国|がいこく|foreign country
    見|み(る)・ケン|to see|目 儿|見る|みる|to see
    行|い(く)・コウ|to go|彳|行く|いく|to go
    来|く(る)・ライ|to come||来る|くる|to come
    食|た(べる)・ショク|to eat|人 良|食べる|たべる|to eat
    飲|の(む)・イン|to drink|食 欠|飲む|のむ|to drink
    聞|き(く)・ブン|to hear, to ask|門 耳|聞く|きく|to hear
    書|か(く)・ショ|to write|日|書く|かく|to write
    買|か(う)・バイ|to buy|貝|買う|かう|to buy
    入|はい(る)・ニュウ|to enter||入る|はいる|to enter
    出|で(る)・シュツ|to go out|山|出る|でる|to go out
    立|た(つ)・リツ|to stand||立つ|たつ|to stand
    休|やす(む)・キュウ|to rest|亻 木|休む|やすむ|to rest
    待|ま(つ)・タイ|to wait|彳 寺|待つ|まつ|to wait
    持|も(つ)・ジ|to hold|扌 寺|持つ|もつ|to hold
    思|おも(う)・シ|to think|田 心|思う|おもう|to think
    知|し(る)・チ|to know|矢 口|知る|しる|to know
    使|つか(う)・シ|to use|亻|使う|つかう|to use
    作|つく(る)・サク|to make|亻|作る|つくる|to make
    手|て・シュ|hand||手紙|てがみ|letter
    水|みず・スイ|water||水|みず|water
    火|ひ・カ|fire||火曜日|かようび|Tuesday
    木|き・モク|tree||木|き|tree
    金|かね・キン|money, gold||お金|おかね|money
    土|つち・ド|soil||土曜日|どようび|Saturday
    曜|ヨウ|day of the week|日|日曜日|にちようび|Sunday
    山|やま・サン|mountain||山|やま|mountain
    川|かわ|river||川|かわ|river
    田|た・デン|rice field||田んぼ|たんぼ|rice paddy
    車|くるま・シャ|car||電車|でんしゃ|train
    子|こ・シ|child||子供|こども|child
    女|おんな・ジョ|woman||女の子|おんなのこ|girl
    男|おとこ・ダン|man|田 力|男の子|おとこのこ|boy
    学|まな(ぶ)・ガク|to study|子|学校|がっこう|school
    校|コウ|school|木|学校|がっこう|school
    生|い(きる)・セイ|life, to live||学生|がくせい|student
    先|さき・セン|ahead||先生|せんせい|teacher
    名|な・メイ|name|夕 口|名前|なまえ|name
    友|とも・ユウ|friend||友達|ともだち|friend
    大|おお(きい)・ダイ|big||大学|だいがく|university
    小|ちい(さい)・ショウ|small||小さい|ちいさい|small
    高|たか(い)・コウ|tall, expensive|口|高い|たかい|expensive
    安|やす(い)・アン|cheap, calm|宀 女|安い|やすい|cheap
    新|あたら(しい)・シン|new|斤|新しい|あたらしい|new
    古|ふる(い)・コ|old|十 口|古い|ふるい|old
    長|なが(い)・チョウ|long||長い|ながい|long
    白|しろ・ハク|white||白い|しろい|white
    黒|くろ・コク|black|里 灬|黒い|くろい|black
    赤|あか・セキ|red|土|赤い|あかい|red
    青|あお・セイ|blue|月|青い|あおい|blue
    好|す(き)・コウ|to like|女 子|好き|すき|to like
    多|おお(い)・タ|many|夕|多い|おおい|many
    少|すこ(し)・ショウ|a little|小|少し|すこし|a little
    朝|あさ・チョウ|morning|日 月|朝|あさ|morning
    昼|ひる・チュウ|noon||昼|ひる|noon
    夜|よる・ヤ|night|夕|夜|よる|night
    夕|ゆう・セキ|evening||夕方|ゆうがた|evening
    週|シュウ|week|辶|今週|こんしゅう|this week
    毎|マイ|every|母|毎日|まいにち|every day
    駅|えき|station|馬|駅|えき|station
    店|みせ・テン|shop|广 占|店|みせ|shop
    道|みち・ドウ|road|辶 首|道|みち|road
    文|ブン・モン|writing||文字|もじ|letter, character
    字|ジ|character|宀 子|漢字|かんじ|kanji
    漢|カン|Han Chinese|氵|漢字|かんじ|kanji
    父|ちち・フ|father||お父さん|おとうさん|father
    母|はは・ボ|mother||お母さん|おかあさん|mother
    兄|あに・ケイ|older brother|口 儿|お兄さん|おにいさん|older brother
    姉|あね・シ|older sister|女 市|お姉さん|おねえさん|older sister
    弟|おとうと・ダイ|younger brother||弟|おとうと|younger brother
    妹|いもうと・マイ|younger sister|女 未|妹|いもうと|younger sister
    犬|いぬ・ケン|dog|大|犬|いぬ|dog
    猫|ねこ・ビョウ|cat|犭|猫|ねこ|cat
    魚|さかな・ギョ|fish|灬|魚|さかな|fish
    鳥|とり・チョウ|bird|灬|鳥|とり|bird
    花|はな・カ|flower|艹|花|はな|flower
    雨|あめ・ウ|rain||雨|あめ|rain
    雪|ゆき・セツ|snow|雨|雪|ゆき|snow
    天|テン|sky, heaven|大 一|天気|てんき|weather
    風|かぜ・フウ|wind||風|かぜ|wind
    空|そら・クウ|sky, empty|宀|空|そら|sky
    海|うみ・カイ|sea|氵 毎|海|うみ|sea
    目|め・モク|eye||目|め|eye
    耳|みみ・ジ|ear||耳|みみ|ear
    口|くち・コウ|mouth||口|くち|mouth
    足|あし・ソク|foot, leg|口|足|あし|foot
    心|こころ・シン|heart||心|こころ|heart
    体|からだ・タイ|body|亻 本|体|からだ|body
    力|ちから・リョク|power||力|ちから|power
    音|おと・オン|sound|立 日|音楽|おんがく|music
    楽|たの(しい)・ガク|fun, music|木|楽しい|たのしい|fun
    色|いろ・ショク|color||色|いろ|color
    仕|シ|to serve|亻 士|仕事|しごと|work
    事|こと・ジ|thing, matter||仕事|しごと|work
    会|あ(う)・カイ|to meet|人 云|会社|かいしゃ|company
    社|シャ|company, shrine|礻 土|会社|かいしゃ|company
    """
}
