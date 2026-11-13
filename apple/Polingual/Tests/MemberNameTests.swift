import Testing
@testable import Polingual

struct MemberNameTests {
    @Test func asksASignedInMemberWhoNeverChoseAName() {
        #expect(MemberName.ask(signedIn: true, loaded: true, unchosen: true, asked: false))
    }

    @Test func staysQuietOtherwise() {
        #expect(!MemberName.ask(signedIn: false, loaded: true, unchosen: true, asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: false, unchosen: true, asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: true, unchosen: false, asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: true, unchosen: true, asked: true))
    }

    @Test func prefillsTheSavedNameThenTheGroupName() {
        #expect(MemberName.prefill(stored: "Gia", current: "gia.rossi") == "Gia")
        #expect(MemberName.prefill(stored: "", current: "Tester 4") == "Tester 4")
        #expect(MemberName.prefill(stored: "", current: nil) == "")
    }

    @Test func cleanCollapsesSpacesAndCapsTheLength() {
        #expect(MemberName.clean("  Nonna   Lucia ") == "Nonna Lucia")
        #expect(MemberName.clean(String(repeating: "a", count: 50)).count == 40)
    }
}
