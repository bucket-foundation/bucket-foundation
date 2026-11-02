extension LetterSounds {
    static let toneSounds = """
    mā|ma˥|First tone: high and level. Hold one steady high pitch, as if singing a note.|mā|妈 mom
    má|ma˧˥|Second tone: rises from the middle to high, like asking What?|má|麻 hemp
    mǎ|ma˨˩˦|Third tone: dips low, then rises a little. In running speech it often stays low.|mǎ|马 horse
    mà|ma˥˩|Fourth tone: falls sharply from high to low, like a firm No!|mà|骂 to scold
    ma|ma|Neutral tone: short and light, with no pitch of its own.|hǎo ma|好吗 okay?
    """

    static let toneLetters: [Letter] = [
        Letter(ch: "mā", sound: "high and level"),
        Letter(ch: "má", sound: "rising"),
        Letter(ch: "mǎ", sound: "dipping"),
        Letter(ch: "mà", sound: "falling"),
        Letter(ch: "ma", sound: "light"),
    ]

    static let pinyinLetters = "b=b p=p m=m f=f d=d t=t n=n l=l g=g k=k h=h j=jy q=chy x=shy zh=jr ch=chr sh=shr r=zhr z=dz c=ts s=s y=y w=w a=ah o=aw e=uh i=ee u=oo ü=yoo qu=chyoo ai=eye ei=ay ao=ow ou=oh an=ahn en=un ang=ahng eng=ung ong=oong er=ar ia=yah ie=yeh iao=yow iu=yoh ian=yen in=een iang=yahng ing=eeng ua=wah uo=waw uai=why ui=way uan=wahn un=wun uang=wahng zhi=jr-buzz si=s-buzz"

    static let pinyinSounds = """
    b|p|Unaspirated p with no puff of air, like the p in spin; English ears hear it as b.|bā|八 eight
    p|pʰ|Aspirated p with a strong puff of air, as in pin.|pà|怕 to fear
    m|m|An m as in man.|māo|猫 cat
    f|f|An f as in fan.|fēi|飞 to fly
    d|t|Unaspirated t with no puff of air, like the t in stop; English ears hear it as d.|dà|大 big
    t|tʰ|Aspirated t with a strong puff of air, as in top.|tā|他 he
    n|n|An n as in no.|nǐ|你 you
    l|l|An l as in leaf.|lái|来 to come
    g|k|Unaspirated k with no puff of air, like the k in skin; English ears hear it as g.|gē|哥 older brother
    k|kʰ|Aspirated k with a strong puff of air, as in kite.|kàn|看 to look
    h|x|A rough h made at the back of the mouth, softer than the ch in Scottish loch.|hǎo|好 good
    j|tɕ|Tongue tip down behind the lower teeth, front of the tongue on the palate, like a voiceless j in jeep.|jiā|家 home|Not the j in jam. Keep the tongue tip down and the lips spread.
    q|tɕʰ|Same tongue position as pinyin j with a strong puff of air, like the ch in cheese.|qī|七 seven|Never a k. Pinyin q is a ch made with the tongue tip down.
    x|ɕ|Tongue tip down behind the lower teeth, front of the tongue near the palate; a thin sound between s and sh.|xiǎo|小 small|Never ks or z. Spread the lips and hiss with the tongue tip down.
    zh|ʈʂ|Retroflex and unaspirated: curl the tongue tip up toward the roof of the mouth and say a stiff, voiceless j.|zhōng|中 middle|Never the s in measure. It starts with a stop, like a j with no voice.
    ch|ʈʂʰ|Retroflex with a strong puff of air: curl the tongue tip up and say ch.|chī|吃 to eat
    sh|ʂ|Retroflex: curl the tongue tip up toward the roof of the mouth and say sh.|shí|十 ten
    r|ʐ|Retroflex and voiced: curl the tongue as for sh and add voice, between the s in measure and an English r.|rén|人 person|Not the English r. Keep the curled tongue close to the roof of the mouth.
    z|ts|Unaspirated ts with no puff of air, like the ds in kids said voiceless.|zài|在 at|Never the z in zoo.
    c|tsʰ|The ts in cats with a strong puff of air.|cài|菜 vegetable|Never k or s. Pinyin c is always ts.
    s|s|An s as in sun.|sān|三 three
    y|j|A y as in yes.|yě|也 also
    w|w|A w as in wet.|wǒ|我 I
    a|a|An ah as in father.|dà|大 big
    o|o|A rounded o; after b, p, m and f it sounds like wo.|bō|波 wave
    e|ɤ|English has no match: say oh, then spread the lips flat, close to the u in duh.|gē|哥 older brother|Not the e in bed.
    i|i|An ee as in see.|nǐ|你 you
    u|u|An oo as in food.|wǔ|五 five
    ü|y|English has no match: say ee and round the lips tight as for oo.|lǜ|绿 green
    qu|tɕʰy|After j, q, x and y the letter u stands for ü: say ee with tightly rounded lips.|qù|去 to go|This u is ü without its dots. Never oo.
    ai|ai|The ai in aisle.|ài|爱 love
    ei|ei|The ay in say.|fēi|飞 to fly
    ao|au|The ow in cow.|hǎo|好 good|Written ao, said ow.
    ou|ou|The o in go.|gǒu|狗 dog|Written ou, said oh.
    an|an|An ah followed by n.|sān|三 three
    en|ən|A short uh followed by n, like the un in under.|mén|门 door
    ang|aŋ|An ah followed by ng.|máng|忙 busy
    eng|əŋ|A short uh followed by ng, like the ung in lung.|lěng|冷 cold
    ong|ʊŋ|A rounded oo followed by ng, like the oo in book before ng.|zhōng|中 middle|Not the ong in song. Round the lips for oo.
    er|ɑɻ|An ah with the tongue curling back, close to the ar in American car.|èr|二 two
    ia|ia|The ya in yard.|jiā|家 home
    ie|ie|The ye in yes.|xiè|谢 to thank
    iao|iau|A y glide, then the ow in cow.|xiǎo|小 small
    iu|iou|A y glide, then the o in go: spelled in full it is iou.|jiǔ|九 nine|Written iu, said yo. Never ee-oo.
    ian|iɛn|The word yen.|tiān|天 sky|Written ian, said yen. The a sounds like the e in bed.
    in|in|An ee followed by n.|xīn|新 new
    iang|iaŋ|A y glide, then ah followed by ng.|liǎng|两 two
    ing|iŋ|The ing in sing.|tīng|听 to listen
    ua|ua|The wa in wand.|huā|花 flower
    uo|uo|The wa in war, with rounded lips.|guó|国 country
    uai|uai|The word why.|kuài|快 fast
    ui|uei|A w glide, then the ay in say: spelled in full it is uei.|duì|对 correct|Written ui, said way. Never oo-ee.
    uan|uan|A w glide, then ah followed by n.|duǎn|短 short
    un|uən|A w glide, a short uh, then n: spelled in full it is uen.|chūn|春 spring|Written un, said wun.
    uang|uaŋ|A w glide, then ah followed by ng.|huáng|黄 yellow
    zhi|ʈʂɻ̩|After zh, ch, sh and r the i is a buzz: hold the curled tongue still and let the voice ring.|zhī|知 to know|This i is never ee.
    si|sɹ̩|After z, c and s the i is a buzz: hold the tongue behind the teeth and let the voice ring.|sì|四 four|This i is never ee.
    """
}
