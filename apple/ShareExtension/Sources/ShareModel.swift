import BucketKit
import Foundation
import Intents
import Observation
import UIKit
import UniformTypeIdentifiers

enum ShareBrand {
    #if BUCKET
    static let name = "Bucket"
    static let appGroup = "group.foundation.bucket.app"
    #else
    static let name = "Polingual"
    static let appGroup = "group.com.polingual.app"
    #endif
    static let keychainGroup = "QQ6D6A2LLS.foundation.bucket.shared"
}

enum SharedContent: Equatable {
    case url(URL)
    case text(String)
    case image(Data)
}

@MainActor
@Observable
final class ShareModel {
    enum Phase: Equatable { case loading, signedOut, noGroups, ready, sending, sent }

    var phase: Phase = .loading
    var targets: [ShareTarget]
    var selected: ShareTarget?
    var content: SharedContent?
    var note = ""
    var failure: String?

    @ObservationIgnored let context: NSExtensionContext?
    @ObservationIgnored let account: Account
    @ObservationIgnored let groups: GroupStore
    @ObservationIgnored let wanted: String?

    init(context: NSExtensionContext?) {
        self.context = context
        let api = BucketAPI()
        let account = Account(api: api, store: KeychainSessionStore(accessGroup: ShareBrand.keychainGroup), lock: FileRefreshLock(appGroup: ShareBrand.appGroup))
        self.account = account
        groups = GroupStore(api: api, token: { await account.freshToken() })
        groups.donor = IntentShareDonor(appGroup: ShareBrand.appGroup)
        groups.imageScreen = SensitiveImageScreen()
        targets = ShareTargetCache(suite: ShareBrand.appGroup).load()
        wanted = (context?.intent as? INSendMessageIntent)?.conversationIdentifier
        pick()
        if account.stage == .signedIn, !targets.isEmpty { phase = .ready }
    }

    var canSend: Bool { phase == .ready && selected != nil && content != nil }

    func start() async {
        content = await Self.extract(context?.inputItems as? [NSExtensionItem] ?? [])
        guard account.stage == .signedIn else {
            phase = .signedOut
            return
        }
        await groups.load()
        if groups.loaded {
            targets = groups.shareTargets
            pick()
        }
        if account.stage != .signedIn {
            phase = .signedOut
        } else if targets.isEmpty {
            phase = groups.loaded || groups.loadError == nil ? .noGroups : .ready
            if !groups.loaded { failure = String(localized: "Could not reach \(ShareBrand.name). Check your connection.") }
        } else {
            phase = .ready
        }
    }

    func pick() {
        if let s = selected, let fresh = ShareTargets.find(s.conversationId, in: targets) {
            selected = fresh
        } else if let wanted {
            selected = ShareTargets.find(wanted, in: targets)
        } else if selected != nil {
            selected = nil
        }
    }

    func payload() -> SharePayload? {
        let extra = note.trimmingCharacters(in: .whitespacesAndNewlines)
        switch content {
        case .url(let u): return .url(u, note: extra.isEmpty ? nil : extra)
        case .text(let t): return .text(extra.isEmpty ? t : "\(t)\n\n\(extra)")
        case .image(let d): return ShareImage.jpeg(d).map { .image($0, note: extra.isEmpty ? nil : extra) }
        case nil: return nil
        }
    }

    func send() async {
        guard let target = selected else { return }
        guard let payload = payload() else {
            failure = String(localized: "This item cannot be shared.")
            return
        }
        phase = .sending
        failure = nil
        do {
            try await groups.share(payload, to: target)
            phase = .sent
            try? await Task.sleep(for: .milliseconds(700))
            done()
        } catch {
            phase = .ready
            failure = Self.message(error)
        }
    }

    static func message(_ e: BucketError) -> String {
        switch e {
        case .shareLimit: String(localized: "You shared a lot just now. Try again in an hour.")
        case .textNotAllowed: String(localized: "That text is not allowed. Try other words.")
        case .imageTooLarge: String(localized: "That image is too large to share.")
        case .imageNotAllowed: String(localized: "This image may be sensitive, so it was not sent.")
        case .revoked: String(localized: "Sign in to \(ShareBrand.name) again, then share.")
        case .groupNotFound: String(localized: "You can no longer share with them.")
        default: String(localized: "That did not send. Try again.")
        }
    }

    func done() {
        context?.completeRequest(returningItems: nil)
    }

    func cancel() {
        context?.cancelRequest(withError: NSError(domain: NSCocoaErrorDomain, code: NSUserCancelledError))
    }

    static func extract(_ items: [NSExtensionItem]) async -> SharedContent? {
        let providers = items.flatMap { $0.attachments ?? [] }
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            guard let url = await loadURL(p) else { continue }
            if url.isFileURL {
                if let data = try? Data(contentsOf: url), UIImage(data: data) != nil { return .image(data) }
                continue
            }
            if url.scheme == "http" || url.scheme == "https" { return .url(url) }
        }
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            if let data = await loadImage(p) { return .image(data) }
        }
        for p in providers where p.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let text = await loadText(p), !text.isEmpty {
                if let u = URL(string: text), u.scheme == "http" || u.scheme == "https" { return .url(u) }
                return .text(text)
            }
        }
        if let text = items.compactMap({ $0.attributedContentText?.string }).first(where: { !$0.isEmpty }) { return .text(text) }
        return nil
    }

    static func loadURL(_ p: NSItemProvider) async -> URL? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                cont.resume(returning: item as? URL ?? (item as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) })
            }
        }
    }

    static func loadImage(_ p: NSItemProvider) async -> Data? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { item, _ in
                switch item {
                case let data as Data: cont.resume(returning: data)
                case let url as URL: cont.resume(returning: try? Data(contentsOf: url))
                case let image as UIImage: cont.resume(returning: image.jpegData(compressionQuality: 0.9))
                default: cont.resume(returning: nil)
                }
            }
        }
    }

    static func loadText(_ p: NSItemProvider) async -> String? {
        await withCheckedContinuation { cont in
            p.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                let s = item as? String ?? (item as? Data).flatMap { String(data: $0, encoding: .utf8) }
                cont.resume(returning: s?.trimmingCharacters(in: .whitespacesAndNewlines))
            }
        }
    }
}
