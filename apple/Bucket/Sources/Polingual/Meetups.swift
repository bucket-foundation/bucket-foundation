import BucketKit
import MapKit
import SwiftUI
import UserNotifications

@MainActor
@Observable
final class MeetupStore {
    static let shared = MeetupStore()
    let api = BucketAPI()
    var meetups: [Meetup] = []
    var admin = false
    var loading = false
    var error: MeetupError?
    var rulesAccepted = UserDefaults.standard.integer(forKey: "meetups.rules") >= MeetupRules.version

    func load(token: String?, langs: [String], spot: Place.Spot?) async {
        loading = true
        defer { loading = false }
        do {
            let r = try await api.meetups(token: token, lat: spot?.lat, lon: spot?.lon, langs: langs)
            meetups = r.meetups
            admin = r.admin
            error = nil
        } catch {
            let e = error as? MeetupError ?? .other(nil)
            self.error = e == .notFound ? .unavailable : e
        }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-meetupFixture") {
            error = nil
            meetups = Self.fixture
        }
        #endif
    }

    #if DEBUG
    static var fixture: [Meetup] {
        let soon = ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .day, value: 2, to: .now) ?? .now)
        let later = ISO8601DateFormatter().string(from: Calendar.current.date(byAdding: .day, value: 6, to: .now) ?? .now)
        let raw = """
        [{"id":"a","hostName":"Ana","isHost":false,"title":"Spanish and French coffee","about":"Half Spanish, half French. All levels.","langs":["es","fr"],"startsAt":"\(soon)","durationMin":90,"mode":"in_person","city":"New York","area":"West Village","placeName":"Café Reggio, 119 MacDougal St","lat":40.73,"lon":-74.0,"onlineUrl":null,"capacity":12,"going":5,"isGoing":true,"status":"open"},
         {"id":"b","hostName":"Kenji","isHost":false,"title":"Italian conversation night","about":"","langs":["it"],"startsAt":"\(later)","durationMin":120,"mode":"in_person","city":"New York","area":"Union Square","placeName":null,"lat":null,"lon":null,"onlineUrl":null,"capacity":null,"going":9,"isGoing":false,"status":"open"},
         {"id":"c","hostName":"Léa","isHost":false,"title":"Romance languages on video","about":"","langs":["fr","es","it","pt"],"startsAt":"\(later)","durationMin":60,"mode":"online","city":"","area":"","placeName":null,"lat":null,"lon":null,"onlineUrl":null,"capacity":20,"going":14,"isGoing":false,"status":"open"}]
        """
        return (try? JSONDecoder().decode([Meetup].self, from: Data(raw.utf8))) ?? []
    }
    #endif

    func replace(_ m: Meetup) {
        if let i = meetups.firstIndex(where: { $0.id == m.id }) { meetups[i] = m } else { meetups.append(m) }
        meetups.sort { $0.start < $1.start }
        MeetupReminder.sync(m)
    }

    func remove(_ id: String) {
        meetups.removeAll { $0.id == id }
        MeetupReminder.clear(id)
    }

    func acceptRules(token: String) async throws {
        try await api.acceptMeetupRules(token: token)
        rulesAccepted = true
        UserDefaults.standard.set(MeetupRules.version, forKey: "meetups.rules")
    }
}

enum MeetupReminder {
    static func id(_ meetupId: String) -> String { "meetup.\(meetupId)" }

    static func sync(_ m: Meetup) {
        guard (m.isGoing || m.isHost) && m.status != .cancelled else {
            clear(m.id)
            return
        }
        let fire = m.start.addingTimeInterval(-2 * 3600)
        guard fire > .now else { return }
        let content = UNMutableNotificationContent()
        content.title = m.title
        content.body = String(localized: "Starts at \(m.start.formatted(date: .omitted, time: .shortened)). \(m.whereText)")
        content.sound = .default
        content.userInfo = ["meetup": m.id]
        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fire), repeats: false)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id(m.id), content: content, trigger: trigger))
    }

    static func clear(_ meetupId: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id(meetupId)])
    }
}

struct MeetList: View {
    let langs: [String]
    @Environment(Account.self) private var account
    @State private var store = MeetupStore.shared
    @State private var place = Place.shared
    @State private var hosting = false
    @State private var open: Meetup?
    @State private var reports = false

    var body: some View {
        let near = store.meetups.filter { $0.mode == .inPerson }
        let online = store.meetups.filter { $0.mode == .online }
        Section {
            VStack(alignment: .leading, spacing: 10) {
                Text("Polyglot meetups").font(.system(size: 22, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                Text("Meet people who speak your languages, near you or on video.").font(.subheadline).foregroundStyle(Palette.muted)
                HStack(spacing: 10) {
                    Button { hosting = true } label: { Label("Host a meetup", systemImage: "plus.circle.fill") }
                        .buttonStyle(D8Primary(compact: true))
                    if store.admin {
                        Button { reports = true } label: { Label("Reports", systemImage: "flag.fill") }
                            .buttonStyle(D8Option(align: .center, compact: true))
                    }
                }
                #if os(iOS)
                if !place.allowed && place.status != .denied && place.status != .restricted {
                    Button { place.ask() } label: { Label("Find meetups near me", systemImage: "location.fill") }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(D8.lapis)
                }
                #endif
            }
            .padding(.vertical, 6)
        }
        .listRowBackground(Palette.card)
        .task(id: "\(place.spot?.lat ?? 0),\(place.spot?.lon ?? 0),\(account.session?.userId ?? "")") { await reload() }
        .onAppear { place.refresh() }
        .sheet(isPresented: $hosting) { HostMeetup(langs: langs) }
        .sheet(item: $open) { m in NavigationStack { MeetupDetail(meetup: m) } }
        .sheet(isPresented: $reports) { NavigationStack { MeetupReports() } }
        if let e = store.error {
            Section {
                Text(e.message).foregroundStyle(Palette.muted)
                if e != .unavailable { Button("Retry") { Task { await reload() } } }
            }
            .listRowBackground(Palette.card)
        } else if store.loading && store.meetups.isEmpty {
            Section { ProgressView().frame(maxWidth: .infinity) }.listRowBackground(Color.clear)
        } else {
            Section {
                if near.isEmpty {
                    Text(place.spot == nil ? String(localized: "Share your location to see meetups near you.") : String(localized: "No meetups near you yet. Host the first one."))
                        .foregroundStyle(Palette.muted)
                }
                ForEach(near) { m in row(m) }
            } header: {
                Eyebrow(text: String(localized: "Near you"))
            }
            .listRowBackground(Palette.card)
            Section {
                if online.isEmpty { Text("No online meetups in your languages yet.").foregroundStyle(Palette.muted) }
                ForEach(online) { m in row(m) }
            } header: {
                Eyebrow(text: String(localized: "Online"))
            } footer: {
                Text("Meet in public places. Report anything unsafe, or email support@polingual.com.")
            }
            .listRowBackground(Palette.card)
        }
    }

    func row(_ m: Meetup) -> some View {
        Button { open = m } label: { MeetupRow(meetup: m) }.buttonStyle(.plain)
    }

    func reload() async {
        await store.load(token: await account.freshToken(), langs: langs, spot: place.spot)
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-openMeetup"), open == nil { open = store.meetups.first }
        if args.contains("-hostMeetup") { hosting = true }
        #endif
    }
}

struct MeetupRow: View {
    let meetup: Meetup

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 0) {
                Text(meetup.start.formatted(.dateTime.month(.abbreviated))).font(.caption2.weight(.heavy)).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 2).background(D8.vermilion)
                Text(meetup.start.formatted(.dateTime.day())).font(.system(size: 20, weight: .heavy, design: .rounded)).foregroundStyle(D8.ink)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(width: 46, height: 50)
            .background(.white, in: .rect(cornerRadius: 10))
            .clipShape(.rect(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text(meetup.title).font(.headline).foregroundStyle(Palette.ink).lineLimit(2)
                Text("\(meetup.start.formatted(date: .omitted, time: .shortened)) · \(meetup.whereText)").font(.footnote).foregroundStyle(Palette.muted).lineLimit(1)
                HStack(spacing: 4) {
                    ForEach(meetup.langs.prefix(5), id: \.self) { FlagTile(lang: $0, size: 16) }
                    Text(meetup.going == 1 ? String(localized: "1 going") : String(localized: "\(meetup.going) going")).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
                    if meetup.isGoing { Label("You're going", systemImage: "checkmark.circle.fill").font(.caption.weight(.bold)).foregroundStyle(D8.malachite) }
                    if meetup.isHost { Text("Hosting").font(.caption.weight(.bold)).foregroundStyle(D8.lapis) }
                    if meetup.status == .underReview { Text("Under review").font(.caption.weight(.bold)).foregroundStyle(D8.vermilion) }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
        .contentShape(.rect)
    }
}

struct MeetupDetail: View {
    @State var meetup: Meetup
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var store = MeetupStore.shared
    @State private var busy = false
    @State private var message: String?
    @State private var rules = false
    @State private var signingIn = false
    @State private var reporting = false
    @State private var confirmBlock = false
    @State private var confirmCancel = false
    @AppStorage("groups.displayName") private var displayName = ""

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 6) { ForEach(meetup.langs, id: \.self) { FlagTile(lang: $0, size: 24) } }
                    Text(meetup.title).font(.system(size: 24, weight: .heavy, design: .rounded)).foregroundStyle(Palette.ink)
                    Label(meetup.start.formatted(.dateTime.weekday(.wide).month().day().hour().minute()), systemImage: "calendar")
                    Label(String(localized: "\(meetup.durationMin) min · hosted by \(meetup.hostName)"), systemImage: "person.fill")
                    Label(meetup.whereText, systemImage: meetup.mode == .online ? "video.fill" : "mappin.and.ellipse")
                    Label(meetup.capacity == nil ? String(localized: "\(meetup.going) going") : String(localized: "\(meetup.going) going · \(meetup.spotsLeft ?? 0) spots left"), systemImage: "person.3.fill")
                }
                .font(.subheadline)
                .foregroundStyle(Palette.ink)
                .padding(.vertical, 4)
                if meetup.status == .cancelled {
                    Text("This meetup was cancelled.").font(.headline).foregroundStyle(D8.vermilion)
                } else if meetup.status == .underReview {
                    Text("Under review. Only you can see it until it is checked.").font(.subheadline.weight(.semibold)).foregroundStyle(D8.vermilion)
                }
            }
            .listRowBackground(Palette.card)
            if !meetup.about.isEmpty {
                Section { Text(meetup.about).foregroundStyle(Palette.ink) }.listRowBackground(Palette.card)
            }
            if meetup.mode == .inPerson {
                Section {
                    if let lat = meetup.lat, let lon = meetup.lon, let place = meetup.placeName {
                        let c = CLLocationCoordinate2D(latitude: lat, longitude: lon)
                        Map(initialPosition: .region(MKCoordinateRegion(center: c, latitudinalMeters: 1500, longitudinalMeters: 1500))) {
                            Marker(place, coordinate: c).tint(D8.vermilion)
                        }
                        .frame(height: 180)
                        .clipShape(.rect(cornerRadius: 12))
                        Text(place).font(.headline).foregroundStyle(Palette.ink)
                        Button { openURL(Self.maps(place, c)) } label: { Label("Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill") }
                    } else {
                        Text("The exact place shows once you're going.").foregroundStyle(Palette.muted)
                    }
                } footer: {
                    Text("Meet in a public place, tell a friend where you'll be, and leave if anything feels wrong.")
                }
                .listRowBackground(Palette.card)
            } else if let link = meetup.onlineUrl.flatMap(URL.init(string:)) {
                Section {
                    Link(destination: link) { Label("Join the video call", systemImage: "video.fill") }
                }
                .listRowBackground(Palette.card)
            }
            if let message {
                Section { Text(message).foregroundStyle(D8.vermilion) }.listRowBackground(Palette.card)
            }
            if meetup.status != .cancelled {
                Section {
                    if meetup.isHost {
                        Button("Cancel this meetup", role: .destructive) { confirmCancel = true }
                    } else if meetup.isGoing {
                        Button("I can't make it") { Task { await rsvp(false) } }.disabled(busy)
                    } else if meetup.status == .open {
                        if displayName.trimmingCharacters(in: .whitespaces).isEmpty {
                            TextField("Your first name", text: $displayName)
                        }
                        Button { Task { await go() } } label: { Label("I'm going", systemImage: "hand.wave.fill").frame(maxWidth: .infinity) }
                            .buttonStyle(D8Primary())
                            .disabled(busy)
                    } else if meetup.status == .full {
                        Text("This meetup is full.").foregroundStyle(Palette.muted)
                    }
                }
                .listRowBackground(Palette.card)
            }
            if !meetup.isHost {
                Section {
                    Button("Report this meetup", systemImage: "flag") { reporting = true }
                    Button("Block \(meetup.hostName)", systemImage: "hand.raised", role: .destructive) { confirmBlock = true }
                }
                .listRowBackground(Palette.card)
            }
        }
        .paper()
        .navigationTitle("Meetup")
        .inlineTitle()
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        .sheet(isPresented: $rules) { MeetupRulesSheet { Task { await go() } } }
        .sheet(isPresented: $signingIn) { SignInSheet() }
        .sheet(isPresented: $reporting) { ReportMeetup(meetup: meetup) }
        .confirmationDialog("Block \(meetup.hostName)?", isPresented: $confirmBlock, titleVisibility: .visible) {
            Button("Block", role: .destructive) { Task { await block() } }
        } message: {
            Text("You won't see their meetups, and they can't join yours.")
        }
        .confirmationDialog("Cancel this meetup?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Cancel meetup", role: .destructive) { Task { await cancel() } }
        } message: {
            Text("Everyone going gets a notification.")
        }
        .task {
            if let fresh = try? await store.api.meetup(token: await account.freshToken(), id: meetup.id) { meetup = fresh }
        }
    }

    static func maps(_ name: String, _ c: CLLocationCoordinate2D) -> URL {
        var u = URLComponents(string: "https://maps.apple.com/")!
        u.queryItems = [URLQueryItem(name: "q", value: name), URLQueryItem(name: "ll", value: "\(c.latitude),\(c.longitude)")]
        return u.url!
    }

    func token() async -> String? {
        guard let t = await account.freshToken() else {
            signingIn = true
            return nil
        }
        return t
    }

    func go() async {
        guard let t = await token() else { return }
        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else {
            message = String(localized: "Add your first name so the host knows who is coming.")
            return
        }
        if !store.rulesAccepted {
            rules = true
            return
        }
        await rsvp(true, token: t)
        if meetup.isGoing {
            _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
            haptic(true)
        }
    }

    func rsvp(_ going: Bool, token: String? = nil) async {
        var t = token
        if t == nil { t = await self.token() }
        guard let t else { return }
        busy = true
        defer { busy = false }
        do {
            meetup = try await store.api.rsvp(token: t, id: meetup.id, going: going, name: String(displayName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(40)))
            store.replace(meetup)
            message = nil
        } catch let e as MeetupError {
            if e == .rulesNeeded {
                store.rulesAccepted = false
                rules = true
            } else {
                message = e.message
            }
        } catch {
            message = MeetupError.other(nil).message
        }
    }

    func cancel() async {
        guard let t = await token() else { return }
        do {
            meetup = try await store.api.cancelMeetup(token: t, id: meetup.id)
            store.remove(meetup.id)
        } catch {
            message = (error as? MeetupError)?.message ?? MeetupError.other(nil).message
        }
    }

    func block() async {
        guard let t = await token() else { return }
        do {
            try await store.api.blockHost(token: t, meetupId: meetup.id)
            store.meetups.removeAll { $0.hostName == meetup.hostName && !$0.isHost }
            store.remove(meetup.id)
            dismiss()
        } catch {
            message = (error as? MeetupError)?.message ?? MeetupError.other(nil).message
        }
    }
}

struct MeetupRulesSheet: View {
    let accepted: () -> Void
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label("Meet in public places: cafés, libraries, parks.", systemImage: "building.2")
                    Label("Be kind. No harassment, hate or unwanted contact.", systemImage: "heart")
                    Label("No selling, dating or promotion.", systemImage: "nosign")
                    Label("Report anything unsafe in the app. You can also email support@polingual.com.", systemImage: "flag")
                    Label("Hosts and guests can be removed for breaking these rules.", systemImage: "person.crop.circle.badge.xmark")
                } header: {
                    Eyebrow(text: String(localized: "Meetup rules"))
                }
                .listRowBackground(Palette.card)
                if let error { Text(error).foregroundStyle(D8.vermilion).listRowBackground(Palette.card) }
                Section {
                    Button("I agree") {
                        Task {
                            guard let t = await account.freshToken() else { return }
                            do {
                                try await MeetupStore.shared.acceptRules(token: t)
                                dismiss()
                                accepted()
                            } catch {
                                self.error = (error as? MeetupError)?.message ?? MeetupError.other(nil).message
                            }
                        }
                    }
                    .buttonStyle(D8Primary())
                }
                .listRowBackground(Color.clear)
            }
            .paper()
            .navigationTitle("Before you meet")
            .inlineTitle()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Not now") { dismiss() } } }
        }
    }
}

struct ReportMeetup: View {
    let meetup: Meetup
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var reason: ReportReason = .unsafe
    @State private var note = ""
    @State private var sent = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Reason", selection: $reason) {
                        Text("Unsafe").tag(ReportReason.unsafe)
                        Text("Offensive").tag(ReportReason.offensive)
                        Text("Spam or selling").tag(ReportReason.spam)
                        Text("Something else").tag(ReportReason.other)
                    }
                    TextField("What happened? Optional", text: $note, axis: .vertical).lineLimit(3...6)
                } footer: {
                    Text("Reports are private. The host isn't told who reported. For an emergency, call local services.")
                }
                .listRowBackground(Palette.card)
                if sent { Text("Thanks. We'll review it.").foregroundStyle(D8.malachite).listRowBackground(Palette.card) }
                if let error { Text(error).foregroundStyle(D8.vermilion).listRowBackground(Palette.card) }
            }
            .paper()
            .navigationTitle("Report")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") {
                        Task {
                            guard let t = await account.freshToken() else { return }
                            do {
                                try await MeetupStore.shared.api.reportMeetup(token: t, id: meetup.id, reason: reason, note: note)
                                sent = true
                                try? await Task.sleep(for: .seconds(1))
                                dismiss()
                            } catch {
                                self.error = (error as? MeetupError)?.message ?? MeetupError.other(nil).message
                            }
                        }
                    }
                    .disabled(sent)
                }
            }
        }
    }
}

struct HostMeetup: View {
    let langs: [String]
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var store = MeetupStore.shared
    @State private var place = Place.shared
    @AppStorage("groups.displayName") private var displayName = ""
    @State private var title = ""
    @State private var about = ""
    @State private var picked: Set<String> = []
    @State private var start = Calendar.current.date(byAdding: .day, value: 3, to: .now).map { Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: $0) ?? $0 } ?? .now
    @State private var minutes = 90
    @State private var mode: Meetup.Mode = .inPerson
    @State private var city = ""
    @State private var area = ""
    @State private var placeName = ""
    @State private var link = ""
    @State private var limit = false
    @State private var capacity = 12
    @State private var publicPlace = false
    @State private var busy = false
    @State private var message: String?
    @State private var rules = false
    @State private var signingIn = false

    var draft: MeetupDraft {
        MeetupDraft(hostName: displayName.trimmingCharacters(in: .whitespacesAndNewlines), title: title.trimmingCharacters(in: .whitespacesAndNewlines), about: about.trimmingCharacters(in: .whitespacesAndNewlines),
                    langs: langs.filter(picked.contains), start: start, durationMin: minutes, mode: mode, city: city.trimmingCharacters(in: .whitespaces), area: area.trimmingCharacters(in: .whitespaces),
                    placeName: placeName.trimmingCharacters(in: .whitespaces), lat: mode == .inPerson ? place.spot?.lat : nil, lon: mode == .inPerson ? place.spot?.lon : nil,
                    onlineUrl: mode == .online ? link.trimmingCharacters(in: .whitespaces) : nil, capacity: limit ? capacity : nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title, like Spanish and French coffee", text: $title)
                    TextField("Your first name", text: $displayName)
                    TextField("What to expect. Optional", text: $about, axis: .vertical).lineLimit(2...5)
                }
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(langs, id: \.self) { l in
                                Chip(title: langName(l), langs: [l], on: picked.contains(l)) {
                                    if picked.contains(l) { picked.remove(l) } else if picked.count < 6 { picked.insert(l) }
                                }
                            }
                        }
                    }
                } header: {
                    Text("Languages spoken")
                }
                Section {
                    DatePicker("Starts", selection: $start, in: Date.now.addingTimeInterval(3600)...Date.now.addingTimeInterval(119 * 86400))
                    Stepper("Length: \(minutes) min", value: $minutes, in: 30...240, step: 15)
                    Toggle("Limit spots", isOn: $limit)
                    if limit { Stepper("Spots: \(capacity)", value: $capacity, in: 2...200) }
                }
                Section {
                    Picker("Where", selection: $mode) {
                        Text("In person").tag(Meetup.Mode.inPerson)
                        Text("Online").tag(Meetup.Mode.online)
                    }
                    .pickerStyle(.segmented)
                    if mode == .inPerson {
                        TextField("City", text: $city)
                        TextField("Neighborhood. Shown to everyone", text: $area)
                        TextField("Place and address. Shown to people going", text: $placeName)
                        if place.spot == nil {
                            Button { place.ask() } label: { Label("Pin it at my location", systemImage: "location.fill") }
                        } else {
                            Label("Pinned near your location", systemImage: "mappin.circle.fill").foregroundStyle(D8.malachite)
                        }
                        Toggle("It's a public place", isOn: $publicPlace)
                    } else {
                        TextField("Video link, https://", text: $link)
                            .textContentType(.URL)
                            #if os(iOS)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            #endif
                    }
                } footer: {
                    if mode == .inPerson { Text("Host in a café, library or park. Your exact place shows only to people who are going.") }
                }
                if let message { Text(message).foregroundStyle(D8.vermilion) }
            }
            .scrollContentBackground(.hidden)
            .paper()
            .navigationTitle("Host a meetup")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Post") { Task { await post() } }.disabled(busy)
                }
            }
            .sheet(isPresented: $rules) { MeetupRulesSheet { Task { await post() } } }
            .sheet(isPresented: $signingIn) { SignInSheet() }
            .onAppear {
                if picked.isEmpty { picked = Set(langs.prefix(2)) }
                place.refresh()
            }
        }
    }

    func post() async {
        let d = draft
        if d.hostName.isEmpty {
            message = String(localized: "Add your first name.")
            return
        }
        if let p = d.problem() {
            message = p
            return
        }
        if mode == .inPerson && !publicPlace {
            message = String(localized: "Meetups happen in public places. Confirm the place is public.")
            return
        }
        guard let t = await account.freshToken() else {
            signingIn = true
            return
        }
        if !store.rulesAccepted {
            rules = true
            return
        }
        busy = true
        defer { busy = false }
        do {
            let m = try await store.api.createMeetup(token: t, d)
            store.replace(m)
            _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
            haptic(true)
            dismiss()
        } catch let e as MeetupError {
            if e == .rulesNeeded {
                store.rulesAccepted = false
                rules = true
            } else {
                message = e.message
            }
        } catch {
            message = MeetupError.other(nil).message
        }
    }
}

struct MeetupReports: View {
    @Environment(Account.self) private var account
    @Environment(\.dismiss) private var dismiss
    @State private var reports: [MeetupReport] = []
    @State private var meetups: [Meetup] = []

    var body: some View {
        List {
            if reports.isEmpty { Text("No open reports.").foregroundStyle(Palette.muted).listRowBackground(Palette.card) }
            ForEach(meetups) { m in
                Section {
                    MeetupRow(meetup: m)
                    ForEach(reports.filter { $0.meetupId == m.id }) { r in
                        Text("\(r.reason): \(r.note)").font(.footnote).foregroundStyle(Palette.muted)
                    }
                    HStack {
                        Button("Take down", role: .destructive) { Task { await review(m.id, takeDown: true) } }
                        Spacer()
                        Button("Dismiss") { Task { await review(m.id, takeDown: false) } }
                    }
                    .buttonStyle(.borderless)
                }
                .listRowBackground(Palette.card)
            }
        }
        .paper()
        .navigationTitle("Reports")
        .inlineTitle()
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        .task { await load() }
    }

    func load() async {
        guard let t = await account.freshToken(), let r = try? await MeetupStore.shared.api.meetupReports(token: t) else { return }
        reports = r.reports
        meetups = r.meetups
    }

    func review(_ id: String, takeDown: Bool) async {
        guard let t = await account.freshToken() else { return }
        try? await MeetupStore.shared.api.reviewMeetup(token: t, id: id, takeDown: takeDown)
        if takeDown { MeetupStore.shared.remove(id) }
        await load()
    }
}
