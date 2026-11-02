public enum Confusables {
    static let tables: [String: String] = [
        "ru": "б в г;п н и;ш щ ж;е ё э;ь ъ ы;ч ц у;у ю;и ы;л м;т ш;с з;р я",
        "el": "ν υ;ρ π;ξ ζ;χ κ;θ φ ψ;β δ;γ ν;ε σ;ο ω α",
        "grc": "ν υ;ρ π;ξ ζ;χ κ;θ φ ψ;β δ;γ ν;ε η;ο ω",
        "ar": "ب ت ث ن ي;ج ح خ;د ذ ر ز;س ش ص ض;ط ظ;ع غ;ف ق;ك ل;ه و;ت ط;س ص;د ض;ك ق;ح ه;ا ع",
        "fa": "ب پ ت ث;ج چ ح خ;د ذ ر ز ژ;س ش;ص ض;ط ظ;ع غ;ف ق;ک گ;و ه;ی ن",
        "he": "ב כ;ד ר;ה ח ת;ו ז;מ ס;ע צ;ג נ;ט ס;י ו;ק ח",
        "hi": "क ख;ग घ;च छ;ज झ;ट ठ;ड ढ;त थ;द ध;प फ;ब भ;ट त;ठ थ;ड द;ढ ध;न ण;श ष स;घ ध;ब व;भ म;ग र;◌ि ◌ी;◌ु ◌ू;◌े ◌ै;◌ो ◌ौ;अ आ;इ ई;उ ऊ;ए ऐ;ओ औ",
        "sa": "क ख;ग घ;च छ;ज झ;ट ठ;ड ढ;त थ;द ध;प फ;ब भ;ट त;ड द;न ण;श ष स;ऋ ॠ ऌ;◌ि ◌ी;◌ु ◌ू;◌े ◌ै;◌ो ◌ौ;अ आ;इ ई;उ ऊ;ए ऐ;ओ औ",
        "ta": "ல ள ழ;ர ற;ன ண ந;ப ம ய;க ங;த ந;அ ஆ;இ ஈ;உ ஊ;எ ஏ;ஒ ஓ;◌ி ◌ீ;◌ு ◌ூ;◌ெ ◌ே;◌ொ ◌ோ",
        "th": "ก ภ ถ;ข ฃ ช ซ;ค ด ต ศ;บ ป ษ;พ ฟ ผ ฝ;ม น;ว ร;ท ห;อ ฮ;ก ข;ป ผ;ต ถ;◌ิ ◌ี ◌ึ ◌ื;◌ุ ◌ู;เ◌ แ◌ โ◌;ใ◌ ไ◌;◌ะ ◌า",
        "ko": "ㅏ ㅑ ㅓ ㅕ;ㅗ ㅛ ㅜ ㅠ;ㅡ ㅣ;ㄱ ㅋ;ㄷ ㅌ;ㅂ ㅍ;ㅈ ㅊ ㅅ;ㄴ ㄹ;ㅁ ㅇ ㅎ",
        "ja": "あ お め ぬ;い り こ;う ら つ;さ き ち;は ほ け;ね れ わ;る ろ;た な;ま も;シ ツ ン ソ;ク ケ タ ヌ ス;ナ メ;コ ユ ロ;ウ ワ フ;ア マ;ハ ル;か が;き ぎ;く ぐ;け げ;こ ご;さ ざ;し じ;す ず;せ ぜ;そ ぞ;た だ;て で;と ど;は ば ぱ;ひ び ぴ;ふ ぶ ぷ;へ べ ぺ;ほ ぼ ぽ;カ ガ;キ ギ;ク グ;ケ ゲ;コ ゴ;サ ザ;シ ジ;ス ズ;セ ゼ;ソ ゾ;タ ダ;テ デ;ト ド;ハ バ パ;ヒ ビ ピ;フ ブ プ;ヘ ベ ペ;ホ ボ ポ;ば ばあ;じ じい;く くう;ね ねえ;つ っ;ツ ッ;きゃ きゅ きょ;しゃ しゅ しょ;ちゃ ちゅ ちょ;にゃ にゅ;ひゃ ひょ;みゃ みょ;りゅ りょ;ぎゃ ぎゅ ぎょ;じゃ じゅ じょ;シャ シュ ショ;チャ チュ チョ;ジャ ジュ ジョ;えい おう おお;日 目 白 月;人 入 大 犬;本 木 体 休;女 安 好;待 持 時;読 語 話 言;先 生;男 田;雨 雪 電;買 見;夕 多 名 外;学 字;父 文;母 毎 海",
        "zh": "ㄅ ㄆ;ㄉ ㄊ;ㄍ ㄎ;ㄐ ㄑ ㄒ;ㄓ ㄔ ㄕ ㄖ;ㄗ ㄘ ㄙ;ㄢ ㄤ;ㄣ ㄥ;ㄞ ㄟ;ㄠ ㄡ;x sh s;q ch c;j zh z;b p;d t;g k;r l;iu ui ou;ü u i;e o a;an ang;en eng;in ing;ian iang an;ao ou;ai ei;zhi si;qu u;mā má mǎ mà ma;日 月 白;人 大 太;已 自;上 下;土 在 地;他 她 它;的 地 得;吗 吧;很 跟;说 话 请;我 找;那 这;买 卖",
        "es": "ll y;rr r;j g h;ñ n;á a;é e;í i;ó o;ú u;ü u;qu gu;z ce",
        "fr": "é è ê;ou u û;on an in;eau ô au;ç c;à â;ai é;oi ou;eu ou;œ eu;gn n;ill l;r h",
        "it": "gli gn;ch ci;gi ci;sc ci;ce ch;ge gh;à a;è é;ò o;ù u;qu ch",
        "pt": "ã õ ão;nh lh;á â ã;é ê;ó ô;ch x s;rr r;em ã",
        "de": "ä ö ü;ei ie eu äu;sch ch;z s ß;w v;st sp;u ü;o ö",
        "nl": "ij ui eu ou oe;g sch;ie ee;oo eu;ei ij ui;w v",
        "sv": "å ä ö;sj tj k;sk sj;y ö;g j;hj lj",
        "fi": "ä ö y;aa ii ää uu;kk tt;nk k",
        "pl": "ś ź ż sz rz;ć cz;ą ę ó;ł w ń;dż dź dz;ci cz;si sz;zi ż;ni ń",
        "tr": "ç c;ş s;ı ö ü;ğ g;j c",
        "cs": "č š ž ř;ě ů;ň ť ď;c č;ou ů",
        "vi": "ă â ơ ư ô ê;đ d;nh ng ngh;gi d r;tr ch;th t;x s",
        "id": "c j;ng ny;sy s;kh k",
        "en": "c k q;i e;u o a;v w;j y",
    ]

    static let neighbours: [String: [String: Set<String>]] = tables.mapValues { raw in
        var out: [String: Set<String>] = [:]
        for group in raw.split(separator: ";") {
            let members = group.split(separator: " ").map(String.init)
            for m in members { out[m, default: []].formUnion(members.filter { $0 != m }) }
        }
        return out
    }

    public static func near(_ lang: String, _ ch: String) -> Set<String> { neighbours[lang]?[ch] ?? [] }
}
