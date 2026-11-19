import Testing
@testable import Polingual

@MainActor
struct RootSheetsTests {
    @Test func aClearRootIsNotCovered() {
        for sheet in RootSheet.allCases { #expect(!RootSheets().covered(besides: sheet)) }
    }

    @Test func aSheetDoesNotCoverItself() {
        let sheets = RootSheets()
        sheets.set(.memberName, true)
        #expect(!sheets.covered(besides: .memberName))
        #expect(sheets.covered(besides: .knownLanguages))
    }

    @Test func everyOtherSheetCoversThePrompts() {
        for other in RootSheet.allCases where other != .knownLanguages {
            let sheets = RootSheets()
            sheets.set(other, true)
            #expect(sheets.covered(besides: .knownLanguages))
        }
        for other in RootSheet.allCases where other != .memberName {
            let sheets = RootSheets()
            sheets.set(other, true)
            #expect(sheets.covered(besides: .memberName))
        }
    }

    @Test func closingTheLastSheetClearsTheRoot() {
        let sheets = RootSheets()
        sheets.set(.ageRange, true)
        sheets.set(.gate, true)
        sheets.set(.ageRange, false)
        #expect(sheets.covered(besides: .memberName))
        sheets.set(.gate, false)
        sheets.set(.gate, false)
        #expect(!sheets.covered(besides: .memberName))
    }

    @Test func twoPromptsInOnePassGetOneClaim() {
        let sheets = RootSheets()
        #expect(sheets.claim(.memberName))
        #expect(!sheets.claim(.knownLanguages))
        #expect(sheets.open == [.memberName])
        sheets.set(.memberName, false)
        #expect(sheets.claim(.knownLanguages))
    }

    @Test func aSheetCanClaimAgainWhileItIsOpen() {
        let sheets = RootSheets()
        #expect(sheets.claim(.ageRange))
        #expect(sheets.claim(.ageRange))
        #expect(!sheets.claim(.inviteJoin))
    }

    @Test func aRegisteredSheetBlocksEveryClaim() {
        for held in RootSheet.allCases {
            let sheets = RootSheets()
            sheets.set(held, true)
            for other in RootSheet.allCases where other != held { #expect(!sheets.claim(other)) }
        }
    }

    @Test func aRefusedClaimSpendsNoRetry() {
        #expect(RootSheets.attempts(3, claimed: false) == 3)
        #expect(RootSheets.attempts(3, claimed: true) == 4)
    }

    @Test func aQueuedSheetOpensOnceTheRootClears() {
        let sheets = RootSheets()
        sheets.set(.knownLanguages, true)
        #expect(!sheets.claim(.ageRange))
        #expect(!sheets.claim(.inviteJoin))
        sheets.set(.knownLanguages, false)
        #expect(sheets.claim(.ageRange))
        #expect(!sheets.claim(.inviteJoin))
    }

    @Test func theNamePromptWaitsForAGameAndForOtherSheets() {
        #expect(MemberName.offer(due: true, playing: false, covered: false))
        #expect(!MemberName.offer(due: true, playing: true, covered: false))
        #expect(!MemberName.offer(due: true, playing: false, covered: true))
        #expect(!MemberName.offer(due: false, playing: false, covered: false))
    }
}
