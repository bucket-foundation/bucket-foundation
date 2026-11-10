import Testing
@testable import BucketKit

@Suite struct ListenTurnTests {
    @Test func onlyTheLastUtteranceEndsTheTurn() {
        var t = ListenTurn<Int>()
        t.expect([1, 2])
        let done1 = t.finished(1)
        #expect(!done1)
        let done2 = t.finished(2)
        #expect(done2)
        #expect(t.ids.isEmpty)
    }

    @Test func staleCallbacksAreIgnored() {
        var t = ListenTurn<Int>()
        t.expect([1, 2])
        t.expect([3, 4])
        #expect(!t.owns(2))
        let done3 = t.finished(2)
        #expect(!done3)
        let done4 = t.finished(4)
        #expect(done4)
    }

    @Test func clearedTurnIgnoresCancelCallbacks() {
        var t = ListenTurn<Int>()
        t.expect([1, 2])
        t.clear()
        let done5 = t.finished(2)
        #expect(!done5)
        #expect(!t.leads(1))
    }

    @Test func leadIsTheFirstUtterance() {
        var t = ListenTurn<Int>()
        t.expect([7, 8])
        #expect(t.leads(7))
        #expect(!t.leads(8))
        #expect(t.owns(8))
    }
}
