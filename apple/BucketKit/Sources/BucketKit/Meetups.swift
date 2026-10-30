import Foundation

public struct Meetup: Codable, Sendable, Equatable, Identifiable, Hashable {
    public enum Mode: String, Codable, Sendable { case inPerson = "in_person", online }
    public enum Status: String, Codable, Sendable { case open, cancelled, full, underReview = "under_review" }

    public let id: String
    public let hostName: String
    public let isHost: Bool
    public let title: String
    public let about: String
    public let langs: [String]
    public let startsAt: String
    public let durationMin: Int
    public let mode: Mode
    public let city: String
    public let area: String
    public let placeName: String?
    public let lat: Double?
    public let lon: Double?
    public let onlineUrl: String?
    public let capacity: Int?
    public let going: Int
    public let isGoing: Bool
    public let status: Status

    public var start: Date { parseInstant(startsAt) ?? .distantPast }
    public var end: Date { start.addingTimeInterval(Double(durationMin) * 60) }
    public var spotsLeft: Int? { capacity.map { max(0, $0 - going) } }
    public var whereText: String { mode == .online ? String(localized: "Online") : [area, city].filter { !$0.isEmpty }.joined(separator: ", ") }
}

public struct MeetupDraft: Codable, Sendable, Equatable {
    public var hostName: String
    public var title: String
    public var about: String
    public var langs: [String]
    public var startsAt: String
    public var durationMin: Int
    public var mode: Meetup.Mode
    public var city: String
    public var area: String
    public var placeName: String
    public var lat: Double?
    public var lon: Double?
    public var onlineUrl: String?
    public var capacity: Int?

    public init(hostName: String, title: String, about: String, langs: [String], start: Date, durationMin: Int, mode: Meetup.Mode, city: String, area: String, placeName: String, lat: Double?, lon: Double?, onlineUrl: String?, capacity: Int?) {
        self.hostName = hostName
        self.title = title
        self.about = about
        self.langs = langs
        startsAt = ISO8601DateFormatter().string(from: start)
        self.durationMin = durationMin
        self.mode = mode
        self.city = city
        self.area = area
        self.placeName = placeName
        self.lat = lat.map { ($0 * 100).rounded() / 100 }
        self.lon = lon.map { ($0 * 100).rounded() / 100 }
        self.onlineUrl = onlineUrl
        self.capacity = capacity
    }

    public func problem(now: Date = .now) -> String? {
        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty || t.count > 80 { return String(localized: "Give it a title up to 80 characters.") }
        if langs.isEmpty || langs.count > 6 { return String(localized: "Pick 1 to 6 languages.") }
        guard let s = parseInstant(startsAt), s > now.addingTimeInterval(30 * 60), s < now.addingTimeInterval(120 * 86400) else {
            return String(localized: "Pick a time from 30 minutes to 120 days from now.")
        }
        switch mode {
        case .inPerson:
            if city.trimmingCharacters(in: .whitespaces).isEmpty || placeName.trimmingCharacters(in: .whitespaces).isEmpty || lat == nil || lon == nil {
                return String(localized: "Add the city, the place and its pin.")
            }
        case .online:
            guard let u = onlineUrl.flatMap(URL.init(string:)), u.scheme == "https", u.host()?.contains(".") == true else {
                return String(localized: "Add a video link that starts with https://")
            }
        }
        return nil
    }
}

public enum MeetupError: Error, Equatable, Sendable {
    case signIn, rulesNeeded, notFound, closed, full, rsvpLimit, hostLimit, hostRate, badTime, contentRejected, reportLimit, unavailable, offline, other(String?)

    static func from(status: Int, code: String?) -> MeetupError {
        switch (status, code) {
        case (401, _): .signIn
        case (403, "terms_required"): .rulesNeeded
        case (404, _): .notFound
        case (409, "closed"): .closed
        case (409, "full"): .full
        case (409, "rsvp_limit"): .rsvpLimit
        case (409, "host_limit"): .hostLimit
        case (409, "host_rate"): .hostRate
        case (_, "bad_time"): .badTime
        case (422, _): .contentRejected
        case (429, _): .reportLimit
        case (503, _): .unavailable
        default: .other(code)
        }
    }

    public var message: String {
        switch self {
        case .signIn: String(localized: "Sign in to join meetups.")
        case .rulesNeeded: String(localized: "Accept the meetup rules first.")
        case .notFound: String(localized: "This meetup is no longer available.")
        case .closed: String(localized: "This meetup has ended or was cancelled.")
        case .full: String(localized: "This meetup is full.")
        case .rsvpLimit: String(localized: "You are going to 10 meetups already.")
        case .hostLimit: String(localized: "You can host 3 upcoming meetups at a time.")
        case .hostRate: String(localized: "You can create 3 meetups a day.")
        case .badTime: String(localized: "Pick a time from 30 minutes to 120 days from now.")
        case .contentRejected: String(localized: "Some words are not allowed. Leave out links and contact details.")
        case .reportLimit: String(localized: "You have sent many reports today. Email support@polingual.com.")
        case .unavailable: String(localized: "Meetups open soon.")
        case .offline: String(localized: "You're offline. Check your connection and try again.")
        case .other: String(localized: "Something went wrong. Try again.")
        }
    }
}

public enum ReportReason: String, CaseIterable, Sendable { case unsafe, offensive, spam, other }

struct MeetupsReply: Decodable { let meetups: [Meetup]; let admin: Bool? }
struct MeetupReply: Decodable { let meetup: Meetup }
struct TermsReply: Decodable { let accepted: Bool; let version: Int }
public struct MeetupReport: Decodable, Sendable, Identifiable {
    public let meetupId: String
    public let reason: String
    public let note: String
    public let createdAt: String
    public var id: String { meetupId + createdAt }
}
struct AdminReply: Decodable { let reports: [MeetupReport]; let meetups: [Meetup] }

public enum MeetupRules {
    public static let version = 1
}

extension BucketAPI {
    public func meetups(token: String?, lat: Double?, lon: Double?, langs: [String]) async throws -> (meetups: [Meetup], admin: Bool) {
        var q = ["langs": langs.joined(separator: ",")]
        if let lat, let lon {
            q["lat"] = String(format: "%.2f", lat)
            q["lon"] = String(format: "%.2f", lon)
        }
        let r: MeetupsReply = try await meetupCall("api/meetups", query: q, token: token)
        return (r.meetups, r.admin ?? false)
    }

    public func meetup(token: String?, id: String) async throws -> Meetup {
        let r: MeetupReply = try await meetupCall("api/meetups/\(id)", token: token)
        return r.meetup
    }

    public func createMeetup(token: String, _ draft: MeetupDraft) async throws -> Meetup {
        let r: MeetupReply = try await meetupCall("api/meetups", token: token, body: try JSONEncoder().encode(draft))
        return r.meetup
    }

    public func rsvp(token: String, id: String, going: Bool, name: String) async throws -> Meetup {
        let r: MeetupReply = try await meetupCall("api/meetups/\(id)/rsvp", token: token, body: try JSONEncoder().encode(RsvpBody(going: going, name: name)))
        return r.meetup
    }

    public func cancelMeetup(token: String, id: String) async throws -> Meetup {
        let r: MeetupReply = try await meetupCall("api/meetups/\(id)/cancel", token: token, body: Data("{}".utf8))
        return r.meetup
    }

    public func reportMeetup(token: String, id: String, reason: ReportReason, note: String) async throws {
        let _: Ignored = try await meetupCall("api/meetups/\(id)/report", token: token, body: try JSONEncoder().encode(["reason": reason.rawValue, "note": note]))
    }

    public func blockHost(token: String, meetupId: String) async throws {
        let _: Ignored = try await meetupCall("api/meetups/block", token: token, body: try JSONEncoder().encode(["meetupId": meetupId]))
    }

    public func meetupRulesAccepted(token: String) async throws -> Bool {
        let r: TermsReply = try await meetupCall("api/meetups/terms", token: token)
        return r.accepted && r.version <= MeetupRules.version
    }

    public func acceptMeetupRules(token: String) async throws {
        let _: Ignored = try await meetupCall("api/meetups/terms", token: token, body: try JSONEncoder().encode(["version": MeetupRules.version]))
    }

    public func meetupReports(token: String) async throws -> (reports: [MeetupReport], meetups: [Meetup]) {
        let r: AdminReply = try await meetupCall("api/meetups/admin", token: token)
        return (r.reports, r.meetups)
    }

    public func reviewMeetup(token: String, id: String, takeDown: Bool) async throws {
        let _: Ignored = try await meetupCall("api/meetups/admin", token: token, body: try JSONEncoder().encode(["meetupId": id, "action": takeDown ? "takedown" : "dismiss"]))
    }

    func meetupCall<T: Decodable>(_ path: String, query: [String: String] = [:], token: String?, body: Data? = nil) async throws -> T {
        var c = URLComponents(url: base.appending(path: path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { c.queryItems = query.keys.sorted().map { URLQueryItem(name: $0, value: query[$0]) } }
        var r = URLRequest(url: c.url!)
        r.cachePolicy = .reloadIgnoringLocalCacheData
        if let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        if let body {
            r.httpMethod = "POST"
            r.setValue("application/json", forHTTPHeaderField: "content-type")
            r.httpBody = body
        }
        let data: Data
        let http: HTTPURLResponse
        do {
            (data, http) = try await transport.send(r)
        } catch {
            if error is CancellationError || (error as? URLError)?.code == .cancelled || Task.isCancelled { throw CancellationError() }
            throw MeetupError.offline
        }
        guard (200..<300).contains(http.statusCode) else {
            let code = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
            throw MeetupError.from(status: http.statusCode, code: code)
        }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw MeetupError.other("decoding") }
    }
}

struct RsvpBody: Encodable {
    let going: Bool
    let name: String
}
