extension LetterSounds {
    static let devanagariSounds = """
    अ|ə|A short relaxed uh, like the a in about.|अब|now
    आ|aː|A long open ah, as in father.|आम|mango
    इ|ɪ|A short i, as in sit.|इमली|tamarind
    ई|iː|A long ee, as in see.|ईख|sugarcane
    उ|ʊ|A short u, as in put.|उधर|over there
    ऊ|uː|A long oo, as in food.|ऊन|wool
    ऋ|ɾɪ|Hindi says it ri, with one quick tap of the tongue for the r.|ऋषि|sage
    ए|eː|A long pure e, like the ay in say with no glide at the end.|एक|one
    ऐ|ɛː|Hindi says it as a long open e, like the a in cat held longer.|ऐसा|like this
    ओ|oː|A long pure o, like the o in go with no glide at the end.|ओस|dew
    औ|ɔː|Hindi says it as a long open o, like the aw in law.|औरत|woman
    क|k|Unaspirated k with no puff of air, like the k in skin.|कमल|lotus
    ख|kʰ|Aspirated k with a strong puff of air, like the k in kite.|खाना|food
    ग|ɡ|A plain g, as in go.|गाय|cow
    घ|ɡʱ|A breathy g: say g and let a voiced h ride on it, as in doghouse said fast.|घर|house
    ङ|ŋ|The ng in sing; it stands before k and g.|गङ्गा|Ganges
    च|tʃ|Unaspirated ch with no puff of air.|चाय|tea
    छ|tʃʰ|Aspirated ch with a strong puff of air.|छत|roof
    ज|dʒ|A j as in jam.|जल|water
    झ|dʒʱ|A breathy j: say j and let a voiced h ride on it.|झील|lake
    ञ|ɲ|The ny in canyon; it stands before ch and j.|पञ्जाब|Punjab
    ट|ʈ|Retroflex t: curl the tongue tip back to touch the roof of the mouth, with no puff of air.|टमाटर|tomato
    ठ|ʈʰ|Retroflex t with a strong puff of air: curl the tongue tip back to the roof of the mouth.|ठंडा|cold
    ड|ɖ|Retroflex d: curl the tongue tip back to touch the roof of the mouth.|डर|fear
    ढ|ɖʱ|Retroflex d with a breathy h: curl the tongue tip back to the roof of the mouth.|ढोल|drum
    ण|ɳ|Retroflex n: curl the tongue tip back to the roof of the mouth and say n.|कारण|reason
    त|t̪|Dental t: press the tongue tip on the back of the upper teeth, with no puff of air.|तारा|star
    थ|t̪ʰ|Dental t with a strong puff of air, tongue on the upper teeth; the English th in thin is wrong here.|थाली|plate
    द|d̪|Dental d: press the tongue tip on the back of the upper teeth.|दाल|lentils
    ध|d̪ʱ|Dental d with a breathy h, tongue on the upper teeth.|धूप|sunshine
    न|n|An n as in no.|नमक|salt
    प|p|Unaspirated p with no puff of air, like the p in spin.|पानी|water
    फ|pʰ|Aspirated p with a strong puff of air, like the p in pin; in loanwords many Hindi speakers say f.|फल|fruit
    ब|b|A b as in bat.|बादल|cloud
    भ|bʱ|A breathy b: say b and let a voiced h ride on it, as in clubhouse said fast.|भालू|bear
    म|m|An m as in man.|माँ|mother
    य|j|A y as in yes.|यात्रा|journey
    र|ɾ|A tapped r: one quick flick of the tongue tip, like the tt in American butter.|रात|night
    ल|l|A clear l, as in leaf.|लाल|red
    व|ʋ|Between v and w: bring the lower lip near the upper teeth without friction.|वन|forest
    श|ʃ|An sh as in ship.|शहर|city
    ष|ʂ|Retroflex sh: curl the tongue tip back toward the roof of the mouth; most Hindi speakers say it like श.|भाषा|language
    स|s|An s as in sun.|सात|seven
    ह|ɦ|A voiced breathy h, as in ahead.|हाथ|hand
    ◌ा|aː|The long ah sign, written after the consonant.|काम|work
    ◌ि|ɪ|The short i sign, written before the consonant and said after it.|दिन|day
    ◌ी|iː|The long ee sign, written after the consonant.|नदी|river
    ◌ु|ʊ|The short u sign, as in put, written under the consonant.|गुलाब|rose
    ◌ू|uː|The long oo sign, written under the consonant.|फूल|flower
    ◌ृ|ɾɪ|This sign under a consonant adds ri in Hindi.|कृपया|please
    ◌े|eː|The long e sign, like ay in say with no glide, written above the consonant.|देश|country
    ◌ै|ɛː|Hindi says this sign as a long open e, like the a in cat.|पैसा|money
    ◌ो|oː|The long o sign, like o in go with no glide.|मोर|peacock
    ◌ौ|ɔː|Hindi says this sign as a long open o, like the aw in law.|मौसम|weather
    """

    static let sanskritSounds = devanagariSounds + "\n" + """
    ऋ|r̩|A syllabic r: hold a tapped r as the vowel itself; modern readers often say ri.|ऋषि|sage
    ◌ृ|r̩|This sign makes the r itself the vowel of the syllable.|वृक्ष|tree
    ऐ|ai|In Sanskrit a diphthong ai, as in aisle.|ऐक्य|unity
    औ|au|In Sanskrit a diphthong au, as in now.|औषध|medicine
    ◌ै|ai|In Sanskrit this sign is the diphthong ai, as in aisle.|वैद्य|physician
    ◌ौ|au|In Sanskrit this sign is the diphthong au, as in now.|गौ|cow
    ष|ʂ|Retroflex sh: curl the tongue tip back to the roof of the mouth and say sh.|भाषा|language
    ॠ|r̩ː|The long syllabic r: hold the r as a vowel for two beats.|ॠकार|letter ṝ
    ऌ|l̩|A syllabic l: the l itself is the vowel, like the le in bottle.|ऌकार|letter ḷ
    """

    static let asia: [String: String] = [
        "hi": devanagariSounds,
        "sa": sanskritSounds,
        "ta": """
        அ|a|A short a, like the u in cup.|அம்மா|mother
        ஆ|aː|A long ah, as in father.|ஆறு|six
        இ|i|A short i, as in sit.|இலை|leaf
        ஈ|iː|A long ee, as in see.|ஈரம்|wetness
        உ|u|A short u, as in put; at the end of a word the lips stay unrounded.|உப்பு|salt
        ஊ|uː|A long oo, as in food.|ஊர்|town
        எ|e|A short e, as in pet.|எலி|rat
        ஏ|eː|A long e, like the ay in say with no glide.|ஏணி|ladder
        ஐ|aj|The ai in aisle.|ஐந்து|five
        ஒ|o|A short o, lips rounded.|ஒன்று|one
        ஓ|oː|A long o, like the o in go with no glide.|ஓடு|run
        ஔ|aw|The ow in cow.|ஔவை|Avvaiyar poet
        க|k|Unaspirated k with no puff of air at the start of a word; between vowels it softens to a breathy h or g.|கண்|eye
        ங|ŋ|The ng in sing; it stands before க.|சங்கு|conch
        ச|tʃ|Doubled or after a consonant it is ch with no puff of air; at the start of a word and between vowels most speakers say s.|பச்சை|green
        ஞ|ɲ|The ny in canyon.|ஞாயிறு|Sunday
        ட|ʈ|Retroflex t: curl the tongue tip back to the roof of the mouth, no puff of air; between vowels it becomes a retroflex d.|பட்டம்|kite
        ண|ɳ|Retroflex n: curl the tongue tip back to the roof of the mouth and say n.|மண்|soil
        த|t̪|Dental t: tongue tip on the back of the upper teeth, no puff of air; between vowels it softens toward the th in this.|தண்ணீர்|water
        ந|n̪|Dental n: tongue tip on the back of the upper teeth.|நான்|I
        ப|p|Unaspirated p with no puff of air; between vowels it becomes b.|பால்|milk
        ம|m|An m as in man.|மரம்|tree
        ய|j|A y as in yes.|யானை|elephant
        ர|ɾ|A tapped r: one quick flick of the tongue, like the tt in American butter.|இரவு|night
        ல|l|A clear l with the tongue tip on the gum ridge.|பல்|tooth
        வ|ʋ|Between v and w: bring the lower lip near the upper teeth without friction.|வீடு|house
        ழ|ɻ|English has no match: curl the tongue tip far back and glide toward the roof of the mouth without touching it.|தமிழ்|Tamil
        ள|ɭ|Retroflex l: curl the tongue tip back and touch the roof of the mouth while saying l.|பள்ளி|school
        ற|r|A trilled or firm tapped r on the gum ridge; doubled ற்ற is said ttr.|கறி|curry
        ன|n|An n with the tongue tip on the gum ridge, as in English no.|மீன்|fish
        ◌ா|aː|The long ah sign, written after the consonant.|பால்|milk
        ◌ி|i|The short i sign, attached to the top right of the consonant.|கிளி|parrot
        ◌ீ|iː|The long ee sign, a loop on the top right of the consonant.|வீடு|house
        ◌ு|u|The short u sign, which changes the shape of the consonant.|புலி|tiger
        ◌ூ|uː|The long oo sign, which changes the shape of the consonant.|பூ|flower
        ◌ெ|e|The short e sign, written before the consonant.|பெண்|woman
        ◌ே|eː|The long e sign, written before the consonant.|தேன்|honey
        ◌ை|aj|The ai sign, written before the consonant and said like aisle.|மழை|rain
        ◌ொ|o|The short o sign, with one part before and one after the consonant.|கொடி|flag
        ◌ோ|oː|The long o sign, with one part before and one after the consonant.|கோழி|hen
        ◌ௌ|aw|The au sign, said like ow in cow, with one part before and one after the consonant.|பௌர்ணமி|full moon
        """,
        "th": """
        ก|k|Unaspirated k with no puff of air, like the k in skin.|ไก่|chicken
        ข|kʰ|Aspirated k with a puff of air, as in kite.|ไข่|egg
        ฃ|kʰ|An obsolete letter, said like ข, an aspirated k.|ฃวด|bottle
        ค|kʰ|Aspirated k with a puff of air, as in kite.|ควาย|buffalo
        ฅ|kʰ|An obsolete letter, said like ค, an aspirated k.|ฅน|person
        ฆ|kʰ|Aspirated k with a puff of air; found in Pali and Sanskrit words.|ระฆัง|bell
        ง|ŋ|The ng in sing; Thai also starts syllables with it, so hum ng and open into the vowel.|งู|snake
        จ|tɕ|Unaspirated ch with no puff of air, close to an unvoiced j.|จาน|plate
        ฉ|tɕʰ|Aspirated ch with a puff of air, as in church.|ฉิ่ง|cymbals
        ช|tɕʰ|Aspirated ch with a puff of air, as in church.|ช้าง|elephant
        ซ|s|An s as in sun.|โซ่|chain
        ฌ|tɕʰ|Aspirated ch with a puff of air; rare, found in Pali and Sanskrit words.|เฌอ|tree
        ญ|j|A y as in yes at the start of a syllable; an n at the end.|หญิง|woman
        ฎ|d|A d as in dog; rare.|ชฎา|crown
        ฏ|t|Unaspirated t with no puff of air, like the t in stop.|ปฏิทิน|calendar
        ฐ|tʰ|Aspirated t with a puff of air, as in top.|ฐาน|base
        ฑ|tʰ|Aspirated t with a puff of air in most words; a few words such as บัณฑิต say d.|มณฑล|province
        ฒ|tʰ|Aspirated t with a puff of air, as in top.|ผู้เฒ่า|elder
        ณ|n|An n as in no.|คุณ|you
        ด|d|A d as in dog.|เด็ก|child
        ต|t|Unaspirated t with no puff of air, like the t in stop.|เต่า|turtle
        ถ|tʰ|Aspirated t with a puff of air, as in top.|ถุง|bag
        ท|tʰ|Aspirated t with a puff of air, as in top; the English th sound is wrong here.|ทหาร|soldier
        ธ|tʰ|Aspirated t with a puff of air, as in top.|ธง|flag
        น|n|An n as in no.|หนู|mouse
        บ|b|A b as in bat.|ใบไม้|leaf
        ป|p|Unaspirated p with no puff of air, like the p in spin.|ปลา|fish
        ผ|pʰ|Aspirated p with a puff of air, as in pin; never an f.|ผึ้ง|bee
        ฝ|f|An f as in fan.|ฝา|lid
        พ|pʰ|Aspirated p with a puff of air, as in pin; never an f.|พาน|tray
        ฟ|f|An f as in fan.|ฟัน|tooth
        ภ|pʰ|Aspirated p with a puff of air, as in pin; never an f.|สำเภา|junk ship
        ม|m|An m as in man.|ม้า|horse
        ย|j|A y as in yes.|ยักษ์|giant
        ร|r|A tapped or trilled r; in casual speech many speakers say l.|เรือ|boat
        ล|l|An l as in leaf.|ลิง|monkey
        ว|w|A w as in wet.|แหวน|ring
        ศ|s|An s as in sun.|ศาลา|pavilion
        ษ|s|An s as in sun.|ฤๅษี|hermit
        ส|s|An s as in sun.|เสือ|tiger
        ห|h|An h as in hat.|หีบ|chest
        ฬ|l|An l as in leaf.|จุฬา|star kite
        อ|ʔ|A glottal stop, the catch in uh-oh; it also serves as a silent carrier for vowels.|อ่าง|basin
        ฮ|h|An h as in hat.|นกฮูก|owl
        ◌ะ|a|A short a, cut off sharp, like the u in cup.|จะ|will
        ◌า|aː|A long ah, as in father.|ตา|eye
        ◌ิ|i|A short i, like ee cut short.|ปิด|close
        ◌ี|iː|A long ee, as in see.|ดี|good
        ◌ึ|ɯ|English has no match: say ee with spread lips, then pull the tongue back; short.|ขึ้น|go up
        ◌ื|ɯː|The long form of the same sound: lips spread, tongue pulled back.|มือ|hand
        ◌ุ|u|A short oo, as in put.|ลุง|uncle
        ◌ู|uː|A long oo, as in food.|หมู|pig
        เ◌|eː|A long e like ay in say with no glide, written before the consonant.|เวลา|time
        แ◌|ɛː|A long open e, like the a in cat, written before the consonant.|แมว|cat
        โ◌|oː|A long o like the o in go with no glide, written before the consonant.|โรงเรียน|school
        ใ◌|aj|The ai in aisle, written before the consonant.|ใจ|heart
        ไ◌|aj|The ai in aisle, written before the consonant.|ไฟ|fire
        ◌ำ|am|A short a closed with m, like the um in drum.|ทำ|do
        """,
        "ja": """
        あ|a|A short ah, as in father.|あめ|rain
        い|i|A short ee, as in see.|いぬ|dog
        う|ɯ|An oo with relaxed, unrounded lips.|うみ|sea
        え|e|An e as in pet.|えき|station
        お|o|A short o with rounded lips.|おちゃ|tea
        か|ka|A k with a light puff of air, then ah.|かさ|umbrella
        き|ki|A k with a light puff of air, then ee.|きのこ|mushroom
        く|kɯ|A k, then an oo with unrounded lips.|くつ|shoes
        け|ke|A k, then e as in pet.|けむり|smoke
        こ|ko|A k, then a short o.|ねこ|cat
        さ|sa|An s, then ah.|さかな|fish
        し|ɕi|A soft sh with the tongue flatter than English sh, then ee.|しお|salt
        す|sɯ|An s, then an unrounded oo, often whispered.|すし|sushi
        せ|se|An s, then e as in pet.|せなか|back
        そ|so|An s, then a short o.|そら|sky
        た|ta|A t, then ah.|たまご|egg
        ち|tɕi|A soft ch, then ee.|ちず|map
        つ|tsɯ|The ts in cats, then an unrounded oo.|つき|moon
        て|te|A t, then e as in pet.|てがみ|letter
        と|to|A t, then a short o.|とり|bird
        な|na|An n, then ah.|なつ|summer
        に|ɲi|An n with the tongue pressed on the palate, then ee.|にく|meat
        ぬ|nɯ|An n, then an unrounded oo.|ぬの|cloth
        ね|ne|An n, then e as in pet.|ふね|boat
        の|no|An n, then a short o.|のり|seaweed
        は|ha|An h, then ah; as the topic particle it is said wa.|はな|flower
        ひ|çi|An h with the tongue close to the hard palate, like the h in huge, then ee.|ひと|person
        ふ|ɸɯ|Blow air between both lips with no teeth, between f and h, then an unrounded oo.|ふゆ|winter
        へ|he|An h, then e as in pet; as the direction particle it is said e.|へや|room
        ほ|ho|An h, then a short o.|ほし|star
        ま|ma|An m, then ah.|まど|window
        み|mi|An m, then ee.|みみ|ear
        む|mɯ|An m, then an unrounded oo.|むし|insect
        め|me|An m, then e as in pet.|めがね|glasses
        も|mo|An m, then a short o.|もも|peach
        や|ja|A y as in yes, then ah.|やま|mountain
        ゆ|jɯ|A y, then an unrounded oo.|ゆき|snow
        よ|jo|A y, then a short o.|よる|night
        ら|ɾa|One quick tap of the tongue tip, like the tt in American butter, then ah.|とら|tiger
        り|ɾi|One quick tap of the tongue tip, then ee.|りんご|apple
        る|ɾɯ|One quick tap of the tongue tip, then an unrounded oo.|くるま|car
        れ|ɾe|One quick tap of the tongue tip, then e as in pet.|れきし|history
        ろ|ɾo|One quick tap of the tongue tip, then a short o.|いろ|color
        わ|wa|A w with relaxed lips, then ah.|わたし|I
        を|o|Said o; it is used only as the object particle.|ほんをよむ|read a book
        ん|ɴ|A syllable-final n held for a full beat; it becomes m before b and p, and ng before k and g.|ほん|book
        ア|a|A short ah, as in father.|アイス|ice cream
        イ|i|A short ee, as in see.|インク|ink
        ウ|ɯ|An oo with relaxed, unrounded lips.|ウール|wool
        エ|e|An e as in pet.|エアコン|air conditioner
        オ|o|A short o with rounded lips.|オレンジ|orange
        カ|ka|A k with a light puff of air, then ah.|カメラ|camera
        キ|ki|A k with a light puff of air, then ee.|キッチン|kitchen
        ク|kɯ|A k, then an oo with unrounded lips.|クラス|class
        ケ|ke|A k, then e as in pet.|ケーキ|cake
        コ|ko|A k, then a short o.|コーヒー|coffee
        サ|sa|An s, then ah.|サラダ|salad
        シ|ɕi|A soft sh with the tongue flatter than English sh, then ee.|タクシー|taxi
        ス|sɯ|An s, then an unrounded oo, often whispered.|スープ|soup
        セ|se|An s, then e as in pet.|セーター|sweater
        ソ|so|An s, then a short o.|ソファ|sofa
        タ|ta|A t, then ah.|タオル|towel
        チ|tɕi|A soft ch, then ee.|チーズ|cheese
        ツ|tsɯ|The ts in cats, then an unrounded oo.|ツアー|tour
        テ|te|A t, then e as in pet.|テレビ|TV
        ト|to|A t, then a short o.|トマト|tomato
        ナ|na|An n, then ah.|バナナ|banana
        ニ|ɲi|An n with the tongue pressed on the palate, then ee.|テニス|tennis
        ヌ|nɯ|An n, then an unrounded oo.|カヌー|canoe
        ネ|ne|An n, then e as in pet.|ネクタイ|necktie
        ノ|no|An n, then a short o.|ノート|notebook
        ハ|ha|An h, then ah.|ハム|ham
        ヒ|çi|An h with the tongue close to the hard palate, like the h in huge, then ee.|コーヒー|coffee
        フ|ɸɯ|Blow air between both lips with no teeth, between f and h, then an unrounded oo.|ナイフ|knife
        ヘ|he|An h, then e as in pet.|ヘリコプター|helicopter
        ホ|ho|An h, then a short o.|ホテル|hotel
        マ|ma|An m, then ah.|マスク|mask
        ミ|mi|An m, then ee.|ミルク|milk
        ム|mɯ|An m, then an unrounded oo.|ゲーム|game
        メ|me|An m, then e as in pet.|メロン|melon
        モ|mo|An m, then a short o.|メモ|memo
        ヤ|ja|A y as in yes, then ah.|タイヤ|tire
        ユ|jɯ|A y, then an unrounded oo.|ユーロ|euro
        ヨ|jo|A y, then a short o.|ヨーグルト|yogurt
        ラ|ɾa|One quick tap of the tongue tip, like the tt in American butter, then ah.|ラジオ|radio
        リ|ɾi|One quick tap of the tongue tip, then ee.|リボン|ribbon
        ル|ɾɯ|One quick tap of the tongue tip, then an unrounded oo.|ビル|building
        レ|ɾe|One quick tap of the tongue tip, then e as in pet.|レモン|lemon
        ロ|ɾo|One quick tap of the tongue tip, then a short o.|ロボット|robot
        ワ|wa|A w with relaxed lips, then ah.|ワイン|wine
        ヲ|o|Said o; rare in katakana outside the object particle and stylized spellings.|ヲタク|otaku
        ン|ɴ|A syllable-final n held for a full beat; it becomes m before b and p, and ng before k and g.|パン|bread
        """,
        "zh": """
        ㄅ|p|Unaspirated p with no puff of air, like the p in spin; English ears hear it as b.|ㄅㄚ|八 eight
        ㄆ|pʰ|Aspirated p with a strong puff of air, as in pin.|ㄆㄚˋ|怕 fear
        ㄇ|m|An m as in man.|ㄇㄚ|媽 mom
        ㄈ|f|An f as in fan.|ㄈㄢˋ|飯 rice
        ㄉ|t|Unaspirated t with no puff of air, like the t in stop; English ears hear it as d.|ㄉㄚˋ|大 big
        ㄊ|tʰ|Aspirated t with a strong puff of air, as in top.|ㄊㄚ|他 he
        ㄋ|n|An n as in no.|ㄋㄧˇ|你 you
        ㄌ|l|An l as in leaf.|ㄌㄞˊ|來 come
        ㄍ|k|Unaspirated k with no puff of air, like the k in skin; English ears hear it as g.|ㄍㄜ|哥 brother
        ㄎ|kʰ|Aspirated k with a strong puff of air, as in kite.|ㄎㄢˋ|看 look
        ㄏ|x|A rough h made at the back of the mouth, softer than the ch in Scottish loch.|ㄏㄠˇ|好 good
        ㄐ|tɕ|Unaspirated: tongue tip down behind the lower teeth, front of the tongue on the palate, like a voiceless j in jeep.|ㄐㄧㄚ|家 home
        ㄑ|tɕʰ|Same tongue position as ㄐ with a strong puff of air, like the ch in cheese.|ㄑㄧ|七 seven
        ㄒ|ɕ|Tongue tip down behind the lower teeth, front of the tongue near the palate; a thin sound between s and sh.|ㄒㄧㄠˇ|小 small
        ㄓ|ʈʂ|Retroflex and unaspirated: curl the tongue tip up toward the roof of the mouth and say a stiff, voiceless j.|ㄓㄨㄥ|中 middle
        ㄔ|ʈʂʰ|Retroflex with a strong puff of air: curl the tongue tip up and say ch.|ㄔ|吃 eat
        ㄕ|ʂ|Retroflex: curl the tongue tip up toward the roof of the mouth and say sh.|ㄕˊ|十 ten
        ㄖ|ʐ|Retroflex and voiced: curl the tongue as for ㄕ and add voice, between the s in measure and an English r.|ㄖㄣˊ|人 person
        ㄗ|ts|Unaspirated ts with no puff of air, like the ds in kids said voiceless.|ㄗㄞˋ|在 at
        ㄘ|tsʰ|The ts in cats with a strong puff of air.|ㄘㄞˋ|菜 vegetable
        ㄙ|s|An s as in sun.|ㄙㄢ|三 three
        ㄧ|i|An ee as in see; before another vowel it is a y glide.|ㄧ|一 one
        ㄨ|u|An oo as in food; before another vowel it is a w glide.|ㄨˇ|五 five
        ㄩ|y|English has no match: say ee and round the lips tight as for oo.|ㄩˊ|魚 fish
        ㄚ|a|An ah as in father.|ㄉㄚˋ|大 big
        ㄛ|o|A rounded o; after ㄅ ㄆ ㄇ ㄈ it sounds like wo.|ㄨㄛˇ|我 I
        ㄜ|ɤ|English has no match: say oh, then spread the lips flat, close to the u in duh.|ㄍㄜ|哥 brother
        ㄝ|e|An e as in yes; it follows ㄧ and ㄩ.|ㄒㄧㄝˋ|謝 thank
        ㄞ|ai|The ai in aisle.|ㄞˋ|愛 love
        ㄟ|ei|The ay in say.|ㄈㄟ|飛 fly
        ㄠ|au|The ow in cow.|ㄏㄠˇ|好 good
        ㄡ|ou|The o in go.|ㄍㄡˇ|狗 dog
        ㄢ|an|An ah followed by n.|ㄙㄢ|三 three
        ㄣ|ən|A short uh followed by n, like the un in under.|ㄇㄣˊ|門 door
        ㄤ|aŋ|An ah followed by ng.|ㄇㄤˊ|忙 busy
        ㄥ|əŋ|A short uh followed by ng, like the ung in lung.|ㄌㄥˇ|冷 cold
        ㄦ|ɚ|An r-colored vowel, like the er in American her.|ㄦˊ|兒 son
        """,
        "ko": """
        ㄱ|k|Plain k with a light puff of air, between g and k; voiced to g between vowels.|ㄱㅏ|가 go
        ㄴ|n|An n as in no.|ㄴㅏ|나 I
        ㄷ|t|Plain t with a light puff of air, between d and t; voiced to d between vowels.|ㄷㅏ|다 all
        ㄹ|ɾ|A tapped r between vowels, like the tt in American butter; an l at the end of a syllable.|ㅁㅓㄹㅣ|머리 head
        ㅁ|m|An m as in man.|ㅁㅜㄹ|물 water
        ㅂ|p|Plain p with a light puff of air, between b and p; voiced to b between vowels.|ㅂㅏㅂ|밥 rice
        ㅅ|s|An s with a breathy release; before ㅣ it becomes sh.|ㅅㅏㄴ|산 mountain
        ㅇ|ŋ|Silent at the start of a syllable; at the end it is the ng in sing.|ㄱㅏㅇ|강 river
        ㅈ|tɕ|Plain ch with a light puff of air, between j and ch; voiced to j between vowels.|ㅈㅣㅂ|집 house
        ㅊ|tɕʰ|Aspirated ch with a strong puff of air.|ㅊㅏ|차 tea
        ㅋ|kʰ|Aspirated k with a strong puff of air.|ㅋㅗ|코 nose
        ㅌ|tʰ|Aspirated t with a strong puff of air.|ㅌㅏ|타 ride
        ㅍ|pʰ|Aspirated p with a strong puff of air.|ㅍㅏ|파 green onion
        ㅎ|h|An h as in hat; between vowels it fades or drops.|ㅎㅐ|해 sun
        ㅏ|a|An ah as in father.|ㅇㅏㅇㅣ|아이 child
        ㅑ|ja|A y glide, then ah.|ㅇㅑㄱ|약 medicine
        ㅓ|ʌ|An open aw with relaxed, unrounded lips, like the u in cup said further back.|ㅇㅓㅁㅁㅏ|엄마 mom
        ㅕ|jʌ|A y glide, then the open ㅓ sound.|ㅇㅕㄹ|열 ten
        ㅗ|o|A tight rounded o, like the o in go with no glide.|ㅇㅗ|오 five
        ㅛ|jo|A y glide, then a tight rounded o.|ㅇㅛㄹㅣ|요리 cooking
        ㅜ|u|An oo with rounded lips, as in food.|ㅇㅜㅇㅠ|우유 milk
        ㅠ|ju|A y glide, then oo, as in you.|ㅇㅠㄹㅣ|유리 glass
        ㅡ|ɯ|English has no match: say oo with the lips spread flat.|ㄱㅡ|그 that
        ㅣ|i|An ee as in see.|ㅇㅣ|이 two
        """,
    ]
}
