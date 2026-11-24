import Testing
@testable import BucketKit

@Test func oneTimeCodeReadsBareDigits() {
    #expect(OneTimeCode.extract(from: "482913") == "482913")
    #expect(OneTimeCode.extract(from: " 482913\n") == "482913")
}

@Test func oneTimeCodeReadsCodeInsideEmailText() {
    #expect(OneTimeCode.extract(from: "Your Bucket code is 482913. It expires in 1 hour.") == "482913")
    #expect(OneTimeCode.extract(from: "Code: 48291375") == "48291375")
}

@Test func oneTimeCodeJoinsSpacedGroups() {
    #expect(OneTimeCode.extract(from: "482 913") == "482913")
    #expect(OneTimeCode.extract(from: "482-913") == "482913")
    #expect(OneTimeCode.extract(from: "Your code is 482 913.") == "482913")
    #expect(OneTimeCode.extract(from: "Code: 4829-1375, valid 1 hour") == "48291375")
}

@Test func oneTimeCodeRejectsTextWithoutACode() {
    #expect(OneTimeCode.extract(from: "") == nil)
    #expect(OneTimeCode.extract(from: "hello") == nil)
    #expect(OneTimeCode.extract(from: "12345") == nil)
    #expect(OneTimeCode.extract(from: "Call 555 0101 at 9") == nil)
    #expect(OneTimeCode.extract(from: "٤٨٢٩١٣") == nil)
}
