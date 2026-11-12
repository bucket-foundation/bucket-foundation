#if DEBUG
import BucketKit
import Foundation

enum LibraryFixture {
    static let index: LibraryIndex? = decode(#"{"version":1,"books":[{"id":"fox-and-grapes","title":{"en":"The Fox and the Grapes","es":"La zorra y las uvas","ar":"الثعلب والعنب"},"author":"Aesop","year":1867,"kind":"fable","license":"Public domain (original published 1867, author died 1900)","source":"https://www.gutenberg.org/ebooks/21","translation":"machine","sentences":3,"langs":["en","es","ar"]},{"id":"north-wind-and-sun","title":{"en":"The North Wind and the Sun","es":"El viento del norte y el sol","ar":"ريح الشمال والشمس"},"author":"Aesop","year":1867,"kind":"fable","license":"Public domain (original published 1867, author died 1900)","source":"https://www.gutenberg.org/ebooks/21","translation":"machine","sentences":3,"langs":["en","es","ar"]}]}"#)
    static let books: [String: String] = [
        "fox-and-grapes": #"{"id":"fox-and-grapes","title":{"en":"The Fox and the Grapes","es":"La zorra y las uvas","ar":"الثعلب والعنب"},"author":"Aesop","license":"Public domain (original published 1867, author died 1900)","source":"https://www.gutenberg.org/ebooks/21","translation":"machine","sentences":[{"en":"A famished fox saw some clusters of ripe black grapes hanging from a trellised vine.","es":"Una zorra hambrienta vio unos racimos de uvas negras maduras colgando de una parra.","ar":"رأى ثعلب جائع عناقيد من العنب الأسود الناضج تتدلى من كرمة."},{"en":"She resorted to all her tricks to get at them, but wearied herself in vain, for she could not reach them.","es":"Usó todos sus trucos para alcanzarlas, pero se cansó en vano, porque no podía llegar a ellas.","ar":"لجأ إلى كل حيله ليصل إليها، لكنه أتعب نفسه عبثا، لأنه لم يستطع بلوغها."},{"en":"At last she turned away, saying: \"The grapes are sour, and not ripe as I thought.\"","es":"Al fin se alejó diciendo: \"Las uvas están agrias, no maduras como pensaba.\"","ar":"وأخيرا ابتعد قائلا: \"العنب حامض، وليس ناضجا كما ظننت.\""}]}"#,
        "north-wind-and-sun": #"{"id":"north-wind-and-sun","title":{"en":"The North Wind and the Sun","es":"El viento del norte y el sol","ar":"ريح الشمال والشمس"},"author":"Aesop","license":"Public domain (original published 1867, author died 1900)","source":"https://www.gutenberg.org/ebooks/21","translation":"machine","sentences":[{"en":"The North Wind and the Sun disputed as to which was the most powerful.","es":"El viento del norte y el sol discutían sobre cuál era el más poderoso.","ar":"تنازع ريح الشمال والشمس على أيهما الأقوى."},{"en":"They agreed that he should be declared the victor who could first strip a wayfaring man of his clothes.","es":"Acordaron que sería declarado vencedor quien primero lograra quitarle la ropa a un caminante.","ar":"اتفقا على أن يعلن فائزا من يستطيع أولا أن ينزع ثياب رجل مسافر."},{"en":"Persuasion is better than force.","es":"La persuasión es mejor que la fuerza.","ar":"الإقناع خير من القوة."}]}"#,
    ]

    static func book(_ id: String) -> LibraryBook? { books[id].flatMap(decode) }

    static func decode<T: Decodable>(_ json: String) -> T? { try? JSONDecoder().decode(T.self, from: Data(json.utf8)) }
}
#endif
