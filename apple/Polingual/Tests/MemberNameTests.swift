import Testing
@testable import Polingual

struct MemberNameTests {
    @Test func asksASignedInMemberWhoNeverSavedAName() {
        #expect(MemberName.ask(signedIn: true, loaded: true, inGroup: true, stored: "", asked: false))
        #expect(MemberName.ask(signedIn: true, loaded: true, inGroup: true, stored: "   ", asked: false))
    }

    @Test func staysQuietOtherwise() {
        #expect(!MemberName.ask(signedIn: false, loaded: true, inGroup: true, stored: "", asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: false, inGroup: true, stored: "", asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: true, inGroup: false, stored: "", asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: true, inGroup: true, stored: "Gia", asked: false))
        #expect(!MemberName.ask(signedIn: true, loaded: true, inGroup: true, stored: "", asked: true))
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
