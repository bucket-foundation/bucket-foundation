import Foundation
import Testing
@testable import BucketKit

struct DailySeedTests {
    static let speedGoldens: [([String], String, String)] = [
        (["es", "fr"], "2026-11-12", "es:earth,fr:word,es:rain,fr:silver,es:snake,fr:mouse,es:long,fr:stone,es:nose,fr:nine,es:egg,fr:star,es:man,fr:arm,es:sun,fr:ball,es:boat,fr:five,es:potato,fr:knee,es:shirt,fr:light,es:cow,fr:sugar board=rain,word,earth,snake,silver/snake,silver,word,earth,rain"),
        (["es", "fr"], "2026-11-13", "es:year,fr:word,es:nine,fr:star,es:high,fr:morning,es:old,fr:wine,es:honey,fr:color,es:five,fr:green,es:short,fr:good,es:easy,fr:clock,es:money,fr:music,es:bed,fr:hat,es:day,fr:rice,es:full,fr:bag board=nine,word,year,star,high/word,year,nine,star,high"),
        (["de", "it", "pt"], "2026-11-12", "de:snake,it:half,pt:boat,de:grass,it:daughter,pt:ear,de:forest,it:heart,pt:high,de:week,it:key,pt:neck,de:short,it:meat,pt:pink,de:heavy,it:two,pt:eye,de:knee,it:new,pt:nine,de:empty,it:sheep,pt:paper,de:yesterday,it:tree,pt:warm,de:clothes,it:good,pt:son,de:bear,it:today,pt:grass,de:car,it:poor,pt:mountain board=boat,half,snake,daughter,grass/daughter,grass,half,snake,boat"),
        (["de", "it", "pt"], "2026-11-13", "de:daughter,it:heart,pt:low,de:school,it:evening,pt:daughter,de:eye,it:pink,pt:slow,de:knee,it:table,pt:cat,de:bad,it:light,pt:church,de:cat,it:bridge,pt:month,de:nine,it:father,pt:bird,de:morning,it:happy,pt:full,de:heavy,it:beer,pt:father,de:sad,it:weak,pt:baby,de:snow,it:bad,pt:long,de:two,it:slow,pt:mountain board=low,heart,daughter,school,evening/heart,daughter,low,school,evening"),
    ]

    static let voiceGoldens: [([String], String, String)] = [
        (["es", "fr"], "2026-11-12", "es:meat:fr/es/en/cs;fr:book:es/id/it/fr;es:clothes:fr/cs/sv/es;fr:meat:vi/es/fr/pl;es:table:es/sv/fr/nl;fr:year:fr/id/es/tr;es:four:nl/sv/fr/es;fr:clean:es/it/fr/cs;es:bridge:tr/es/fr/fi;fr:week:fr/en/es/vi"),
        (["es", "fr"], "2026-11-13", "es:clock:fr/fi/es/tr;fr:earth:it/fr/es/pt;es:mouth:tr/de/es/fr;fr:soup:es/vi/fr/fi;es:hair:es/pt/fr/it;fr:wife:nl/fr/pl/es;es:hour:es/nl/pl/fr;fr:salt:es/sv/fr/pt;es:wood:es/sv/fr/pl;fr:cloud:fr/vi/en/es"),
        (["de", "it", "pt"], "2026-11-12", "de:water:es/pt/it/de;it:spider:pt/it/id/de;pt:tree:fi/de/it/pt;de:knee:de/it/pt/cs;it:full:de/it/es/pt;pt:hundred:pl/pt/de/it;de:hair:pt/it/tr/de;it:people:fi/it/de/pt;pt:bad:pt/tr/de/it;de:six:it/pt/de/nl"),
        (["de", "it", "pt"], "2026-11-13", "de:name:it/de/pt/id;it:forest:de/id/pt/it;pt:year:de/it/en/pt;de:sister:it/de/tr/pt;it:knife:en/pt/it/de;pt:chair:fi/pt/it/de;de:bear:pt/de/it/pl;it:car:sv/de/pt/it;pt:nine:fi/de/pt/vi;de:salt:pt/de/tr/it"),
    ]

    static let letterGoldens: [([String], String, String)] = [
        (["ja", "ru"], "2026-11-12", "ja さ:さ/ヨ/ね/む;ほ:ほ/オ/ヤ/ワ;ヌ:せ/ナ/メ/ヌ;れ:ま/れ/ワ/シ;ミ:シ/い/ほ/ミ;ろ:ろ/ソ/り/う;み:マ/ウ/み/セ;カ:イ/カ/つ/と"),
        (["ja", "ru"], "2026-11-13", "ru с:х/ф/ъ/с;ф:ф/ч/г/л;у:у/г/е/ф;д:ц/ф/д/ё;ё:ё/с/ъ/е;п:э/п/ъ/а;з:з/и/в/э;к:э/р/ё/к"),
        (["es"], "2026-11-13", "fa ه:م/ی/ه/ب;خ:خ/ع/ب/ی;س:ع/ر/د/س;ح:ط/ظ/ض/ح;و:ن/ث/و/ص;ی:ی/ظ/ذ/ب;ژ:ژ/د/ا/س;ث:م/ذ/پ/ث"),
        ([], "2026-11-14", "th ฃ:ว/ฃ/ฝ/ฮ;ษ:ม/ษ/ฐ/ฬ;ภ:ฎ/ย/น/ภ;ซ:ฑ/ค/ภ/ซ;ฟ:ม/ว/ฟ/ย;ง:ม/ว/ง/ฏ;พ:ด/ก/พ/ต;ส:ป/ผ/ข/ส"),
    ]

    @Test func speedMatchDealsTheWebDeckAndBoard() {
        for (targets, day, want) in Self.speedGoldens {
            let deck = GameDeck(PlayFixtures.corpus, root: "en", targets: targets)
            let words = DailySeed.speedDeck(deck, day: day).map { "\($0.lang):\($0.itemId)" }.joined(separator: ",")
            let board = DailySeed.speedBoard(deck, day: day)
            let ids = { (xs: [GameWord?]) in xs.map { $0?.itemId ?? "" }.joined(separator: ",") }
            #expect("\(words) board=\(ids(board.meanings))/\(ids(board.forms))" == want)
        }
    }

    @Test func whichVoiceDealsTheWebPrompts() {
        for (targets, day, want) in Self.voiceGoldens {
            let deck = GameDeck(PlayFixtures.corpus, root: "en", targets: targets)
            let got = DailySeed.voice(deck, corpus: PlayFixtures.corpus, day: day).map { "\($0.word.lang):\($0.word.itemId):\($0.choices.joined(separator: "/"))" }.joined(separator: ";")
            #expect(got == want)
        }
    }

    @Test func letterSprintDealsTheWebLetters() {
        for (targets, day, want) in Self.letterGoldens {
            let lang = DailySeed.letterLang(day: day, targets: targets)
            let got = lang + " " + DailySeed.letters(day: day, targets: targets).map { "\($0.ch):\($0.choices.joined(separator: "/"))" }.joined(separator: ";")
            #expect(got == want)
        }
    }

    @Test func daySeedsAreStableAndDayScoped() {
        let deck = GameDeck(PlayFixtures.corpus, root: "en", targets: ["fr", "es"])
        #expect(DailySeed.speedDeck(deck, day: "2026-11-12") == DailySeed.speedDeck(GameDeck(PlayFixtures.corpus, root: "en", targets: ["fr", "es"]), day: "2026-11-12"))
        #expect(DailySeed.speedDeck(deck, day: "2026-11-12") != DailySeed.speedDeck(deck, day: "2026-11-13"))
        #expect(DailySeed.letters(day: "2026-11-13", targets: []).allSatisfy { $0.choices.count == 4 && $0.choices.contains($0.ch) })
    }
}
