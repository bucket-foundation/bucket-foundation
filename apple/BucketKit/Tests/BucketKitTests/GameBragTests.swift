import Testing
@testable import BucketKit

@Suite struct GameBragTests {
    @Test func resultRowShowsNoAnswers() {
        let text = GameBrag.text(title: "Daily Set", day: "11/2", score: "5 of 6", results: [true, true, false, true, true, true], link: "bucket.foundation")
        #expect(text == "Daily Set 11/2\n5 of 6\n🟩🟩🟥🟩🟩🟩\nbucket.foundation")
    }

    @Test func gridMarksOnlyTheShape() {
        #expect(GameBrag.grid([[true, false], [false, true]]) == "🟩⬛️\n⬛️🟩")
    }
}
