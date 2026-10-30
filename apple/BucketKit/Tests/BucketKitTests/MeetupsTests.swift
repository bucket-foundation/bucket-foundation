import Foundation
import Testing
@testable import BucketKit

let meetupJSON = #"{"id":"m1","hostName":"Ana","isHost":false,"title":"Spanish coffee","about":"","langs":["es","fr"],"startsAt":"2026-11-08T18:00:00.000Z","durationMin":90,"mode":"in_person","city":"New York","area":"West Village","placeName":null,"lat":null,"lon":null,"onlineUrl":null,"capacity":12,"going":3,"isGoing":false,"status":"open"}"#

@Test func meetupListDecodesAndSendsARoundedPoint() async throws {
    let api = BucketAPI(transport: StubTransport { r in
        let q = URLComponents(url: r.url!, resolvingAgainstBaseURL: false)?.queryItems ?? []
        #expect(r.url?.path == "/api/meetups")
        #expect(q.first { $0.name == "lat" }?.value == "40.73")
        #expect(q.first { $0.name == "langs" }?.value == "es,fr")
        return (200, Data(#"{"meetups":[\#(meetupJSON)],"admin":false}"#.utf8))
    })
    let r = try await api.meetups(token: nil, lat: 40.7312, lon: -74.0049, langs: ["es", "fr"])
    #expect(r.meetups.count == 1)
    #expect(r.meetups[0].mode == .inPerson)
    #expect(r.meetups[0].spotsLeft == 9)
    #expect(r.meetups[0].whereText == "West Village, New York")
    #expect(r.meetups[0].start == Date(timeIntervalSince1970: 1_794_160_800))
}

@Test func meetupErrorsMapToMessages() async throws {
    let api = BucketAPI(transport: StubTransport { _ in (409, Data(#"{"error":"full"}"#.utf8)) })
    await #expect(throws: MeetupError.full) { _ = try await api.rsvp(token: "t", id: "m1", going: true, name: "Bo") }
    #expect(MeetupError.from(status: 403, code: "terms_required") == .rulesNeeded)
    #expect(MeetupError.from(status: 422, code: "content_rejected") == .contentRejected)
    #expect(MeetupError.from(status: 503, code: nil) == .unavailable)
}

@Test func draftsRoundThePinAndExplainProblems() {
    let now = Date(timeIntervalSince1970: 1_793_000_000)
    var d = MeetupDraft(hostName: "Ana", title: "Coffee", about: "", langs: ["es"], start: now.addingTimeInterval(86400), durationMin: 90, mode: .inPerson, city: "NYC", area: "", placeName: "Café", lat: 40.7312, lon: -74.0049, onlineUrl: nil, capacity: nil)
    #expect(d.lat == 40.73)
    #expect(d.problem(now: now) == nil)
    d.langs = []
    #expect(d.problem(now: now) != nil)
    d.langs = ["es"]
    d.mode = .online
    d.onlineUrl = "http://zoom.us"
    #expect(d.problem(now: now) != nil)
    d.onlineUrl = "https://meet.jit.si/polyglots"
    #expect(d.problem(now: now) == nil)
}
