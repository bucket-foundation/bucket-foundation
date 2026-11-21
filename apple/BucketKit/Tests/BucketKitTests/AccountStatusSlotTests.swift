import Testing
@testable import BucketKit

@Test func signedOutErrorsShowBesideTheSignInButtons() {
    #expect(AccountStatusSlot.slot(stage: .signedOut, emailing: false) == .signInSection)
    #expect(AccountStatusSlot.slot(stage: .codeSent("a@b.co"), emailing: false) == .signInSection)
}

@Test func emailSheetOwnsErrorsWhileOpen() {
    #expect(AccountStatusSlot.slot(stage: .signedOut, emailing: true) == .signInSheet)
    #expect(AccountStatusSlot.slot(stage: .codeSent("a@b.co"), emailing: true) == .signInSheet)
}

@Test func signedInErrorsShowOnThePage() {
    #expect(AccountStatusSlot.slot(stage: .signedIn, emailing: false) == .page)
    #expect(AccountStatusSlot.slot(stage: .signedIn, emailing: true) == .page)
}
