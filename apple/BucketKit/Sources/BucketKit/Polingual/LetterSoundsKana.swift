extension LetterSounds {
    static let kanaMarkLetters = "っ=(pause) ばあ=baa じい=jii くう=kuu ねえ=nee えい=ei おう=ou おお=oo が=ga ぎ=gi ぐ=gu げ=ge ご=go ざ=za じ=ji ず=zu ぜ=ze ぞ=zo だ=da ぢ=dji づ=dzu で=de ど=do ば=ba び=bi ぶ=bu べ=be ぼ=bo ぱ=pa ぴ=pi ぷ=pu ぺ=pe ぽ=po きゃ=kya きゅ=kyu きょ=kyo しゃ=sha しゅ=shu しょ=sho ちゃ=cha ちゅ=chu ちょ=cho にゃ=nya にゅ=nyu ひゃ=hya ひょ=hyo みゃ=mya みょ=myo りゅ=ryu りょ=ryo ぎゃ=gya ぎゅ=gyu ぎょ=gyo じゃ=ja じゅ=ju じょ=jo びょ=byo ぴょ=pyo ッ=(pause) ー=(long) ガ=ga ギ=gi グ=gu ゲ=ge ゴ=go ザ=za ジ=ji ズ=zu ゼ=ze ゾ=zo ダ=da デ=de ド=do バ=ba ビ=bi ブ=bu ベ=be ボ=bo パ=pa ピ=pi プ=pu ペ=pe ポ=po シャ=sha シュ=shu ショ=sho チャ=cha チュ=chu チョ=cho ジャ=ja ジュ=ju ジョ=jo キャ=kya ニュ=nyu ファ=fa ティ=ti"

    static let kanaMarkSounds = """
    っ|ː|One silent beat. Stop for a beat, then release the next consonant hard.|きって|stamp
    ばあ|baː|Two beats of ah. Hold the vowel twice as long, never as two separate pushes.|おばあさん|grandmother
    じい|dʑiː|Two beats of ee. Hold the vowel twice as long.|おじいさん|grandfather
    くう|kɯː|Two beats of an unrounded oo. Hold the vowel twice as long.|くうき|air
    ねえ|neː|Two beats of e as in pet. Hold the vowel twice as long.|おねえさん|older sister
    えい|eː|Written えい, usually said as a long e with two beats.|えいが|movie
    おう|oː|Written おう, said as a long o with two beats.|おうさま|king
    おお|oː|A long o with two beats, in a few words such as this one.|おおきい|big
    が|ɡa|Two small marks turn か into a g as in go, then ah.|がくせい|student
    ぎ|ɡi|The two marks turn き into a g, then ee.|かぎ|key
    ぐ|ɡɯ|The two marks turn く into a g, then an unrounded oo.|かぐ|furniture
    げ|ɡe|The two marks turn け into a g, then e as in pet.|げんき|well
    ご|ɡo|The two marks turn こ into a g, then a short o.|ごはん|meal
    ざ|za|The two marks turn さ into a z, then ah.|ざっし|magazine
    じ|dʑi|The two marks turn し into a soft j, then ee.|じかん|time
    ず|zɯ|The two marks turn す into a z, then an unrounded oo.|みず|water
    ぜ|ze|The two marks turn せ into a z, then e as in pet.|かぜ|wind
    ぞ|zo|The two marks turn そ into a z, then a short o.|ぞう|elephant
    だ|da|The two marks turn た into a d, then ah.|だいがく|university
    ぢ|dʑi|Said the same as じ. Rare, it appears when ち is voiced inside a word.|はなぢ|nosebleed
    づ|zɯ|Said the same as ず. Rare, it appears when つ is voiced inside a word.|つづく|to continue
    で|de|The two marks turn て into a d, then e as in pet.|でんわ|telephone
    ど|do|The two marks turn と into a d, then a short o.|どこ|where
    ば|ba|The two marks turn は into a b, then ah.|ばら|rose
    び|bi|The two marks turn ひ into a b, then ee.|えび|shrimp
    ぶ|bɯ|The two marks turn ふ into a b, then an unrounded oo.|ぶた|pig
    べ|be|The two marks turn へ into a b, then e as in pet.|たべる|to eat
    ぼ|bo|The two marks turn ほ into a b, then a short o.|ぼうし|hat
    ぱ|pa|A small circle turns は into a p, then ah.|かんぱい|cheers
    ぴ|pi|A small circle turns ひ into a p, then ee.|えんぴつ|pencil
    ぷ|pɯ|A small circle turns ふ into a p, then an unrounded oo.|てんぷら|tempura
    ぺ|pe|A small circle turns へ into a p, then e as in pet.|ぺらぺら|fluent
    ぽ|po|A small circle turns ほ into a p, then a short o.|さんぽ|walk
    きゃ|kʲa|き plus a small や make one beat: a k with a y glide, then ah.|きゃく|guest
    きゅ|kʲɯ|き plus a small ゆ make one beat: a k with a y glide, then an unrounded oo.|きゅう|nine
    きょ|kʲo|き plus a small よ make one beat: a k with a y glide, then a short o.|きょう|today
    しゃ|ɕa|し plus a small や make one beat: a soft sh, then ah.|しゃしん|photo
    しゅ|ɕɯ|し plus a small ゆ make one beat: a soft sh, then an unrounded oo.|しゅくだい|homework
    しょ|ɕo|し plus a small よ make one beat: a soft sh, then a short o.|としょかん|library
    ちゃ|tɕa|ち plus a small や make one beat: a soft ch, then ah.|おちゃ|tea
    ちゅ|tɕɯ|ち plus a small ゆ make one beat: a soft ch, then an unrounded oo.|ちゅうい|caution
    ちょ|tɕo|ち plus a small よ make one beat: a soft ch, then a short o.|ちょっと|a little
    にゃ|ɲa|に plus a small や make one beat: the ny in canyon, then ah.|こんにゃく|konjac
    にゅ|ɲɯ|に plus a small ゆ make one beat: the ny in canyon, then an unrounded oo.|ぎゅうにゅう|milk
    ひゃ|ça|ひ plus a small や make one beat: the h in huge, then ah.|ひゃく|hundred
    ひょ|ço|ひ plus a small よ make one beat: the h in huge, then a short o.|ひょう|chart
    みゃ|mʲa|み plus a small や make one beat: an m with a y glide, then ah.|みゃく|pulse
    みょ|mʲo|み plus a small よ make one beat: an m with a y glide, then a short o.|みょうじ|surname
    りゅ|ɾʲɯ|り plus a small ゆ make one beat: a tapped r with a y glide, then an unrounded oo.|りゅう|dragon
    りょ|ɾʲo|り plus a small よ make one beat: a tapped r with a y glide, then a short o.|りょこう|travel
    ぎゃ|ɡʲa|ぎ plus a small や make one beat: a g with a y glide, then ah.|ぎゃく|reverse
    ぎゅ|ɡʲɯ|ぎ plus a small ゆ make one beat: a g with a y glide, then an unrounded oo.|ぎゅうにゅう|milk
    ぎょ|ɡʲo|ぎ plus a small よ make one beat: a g with a y glide, then a short o.|きんぎょ|goldfish
    じゃ|dʑa|じ plus a small や make one beat: a soft j, then ah.|じゃあ|well then
    じゅ|dʑɯ|じ plus a small ゆ make one beat: a soft j, then an unrounded oo.|じゅぎょう|class
    じょ|dʑo|じ plus a small よ make one beat: a soft j, then a short o.|じょせい|woman
    びょ|bʲo|び plus a small よ make one beat: a b with a y glide, then a short o.|びょういん|hospital
    ぴょ|pʲo|ぴ plus a small よ make one beat: a p with a y glide, then a short o.|はっぴょう|announcement
    ッ|ː|One silent beat in katakana. Stop for a beat, then release the next consonant hard.|ロボット|robot
    ー|ː|The long bar. Hold the vowel before it for one extra beat.|コーヒー|coffee
    ガ|ɡa|Two small marks turn カ into a g as in go, then ah.|ガス|gas
    ギ|ɡi|The two marks turn キ into a g, then ee.|ギター|guitar
    グ|ɡɯ|The two marks turn ク into a g, then an unrounded oo.|グラス|glass
    ゲ|ɡe|The two marks turn ケ into a g, then e as in pet.|ゲーム|game
    ゴ|ɡo|The two marks turn コ into a g, then a short o.|ゴルフ|golf
    ザ|za|The two marks turn サ into a z, then ah.|ピザ|pizza
    ジ|dʑi|The two marks turn シ into a soft j, then ee.|ラジオ|radio
    ズ|zɯ|The two marks turn ス into a z, then an unrounded oo.|チーズ|cheese
    ゼ|ze|The two marks turn セ into a z, then e as in pet.|ゼロ|zero
    ゾ|zo|The two marks turn ソ into a z, then a short o.|ゾーン|zone
    ダ|da|The two marks turn タ into a d, then ah.|サラダ|salad
    デ|de|The two marks turn テ into a d, then e as in pet.|デパート|department store
    ド|do|The two marks turn ト into a d, then a short o.|ドア|door
    バ|ba|The two marks turn ハ into a b, then ah.|バス|bus
    ビ|bi|The two marks turn ヒ into a b, then ee.|テレビ|TV
    ブ|bɯ|The two marks turn フ into a b, then an unrounded oo.|ブラシ|brush
    ベ|be|The two marks turn ヘ into a b, then e as in pet.|ベッド|bed
    ボ|bo|The two marks turn ホ into a b, then a short o.|ボール|ball
    パ|pa|A small circle turns ハ into a p, then ah.|パン|bread
    ピ|pi|A small circle turns ヒ into a p, then ee.|ピアノ|piano
    プ|pɯ|A small circle turns フ into a p, then an unrounded oo.|プール|pool
    ペ|pe|A small circle turns ヘ into a p, then e as in pet.|ペン|pen
    ポ|po|A small circle turns ホ into a p, then a short o.|ポスト|mailbox
    シャ|ɕa|シ plus a small ャ make one beat: a soft sh, then ah.|シャツ|shirt
    シュ|ɕɯ|シ plus a small ュ make one beat: a soft sh, then an unrounded oo.|シューズ|shoes
    ショ|ɕo|シ plus a small ョ make one beat: a soft sh, then a short o.|ショップ|shop
    チャ|tɕa|チ plus a small ャ make one beat: a soft ch, then ah.|チャンス|chance
    チュ|tɕɯ|チ plus a small ュ make one beat: a soft ch, then an unrounded oo.|チューブ|tube
    チョ|tɕo|チ plus a small ョ make one beat: a soft ch, then a short o.|チョコレート|chocolate
    ジャ|dʑa|ジ plus a small ャ make one beat: a soft j, then ah.|ジャム|jam
    ジュ|dʑɯ|ジ plus a small ュ make one beat: a soft j, then an unrounded oo.|ジュース|juice
    ジョ|dʑo|ジ plus a small ョ make one beat: a soft j, then a short o.|ジョギング|jogging
    キャ|kʲa|キ plus a small ャ make one beat: a k with a y glide, then ah.|キャベツ|cabbage
    ニュ|ɲɯ|ニ plus a small ュ make one beat: the ny in canyon, then an unrounded oo.|ニュース|news
    ファ|ɸa|フ plus a small ァ make one beat: air between both lips, then ah. Used for the f of loanwords.|ソファ|sofa
    ティ|ti|テ plus a small ィ make one beat: a t, then ee. Used for the ti of loanwords.|パーティー|party
    """
}
