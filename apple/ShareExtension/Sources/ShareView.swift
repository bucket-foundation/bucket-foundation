import BucketKit
import SwiftUI
import UIKit

@objc(ShareViewController)
final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        let model = ShareModel(context: extensionContext)
        let host = UIHostingController(rootView: ShareView(model: model))
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
        Task { await model.start() }
    }
}

struct ShareView: View {
    @Bindable var model: ShareModel

    var body: some View {
        NavigationStack {
            Group {
                switch model.phase {
                case .loading: ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                case .signedOut: prompt(symbol: "person.crop.circle.badge.questionmark", title: String(localized: "Sign in to share"), body: String(localized: "Open \(ShareBrand.name), sign in from Account, then share again to send this to your family and friends."))
                case .noGroups: prompt(symbol: "person.2.badge.plus", title: String(localized: "Create a group first"), body: String(localized: "Open \(ShareBrand.name) and start a family or friends group. Then share here to send links, photos and notes to them."))
                case .ready, .sending, .sent: form
                }
            }
            .navigationTitle(String(localized: "Share to \(ShareBrand.name)"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(model.phase == .signedOut || model.phase == .noGroups ? String(localized: "Done") : String(localized: "Cancel")) { model.cancel() }
                }
                if model.phase == .ready || model.phase == .sending || model.phase == .sent {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(model.phase == .sent ? String(localized: "Sent") : String(localized: "Send")) { Task { await model.send() } }
                            .disabled(!model.canSend)
                    }
                }
            }
        }
    }

    func prompt(symbol: String, title: String, body: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: symbol).font(.system(size: 44)).foregroundStyle(.secondary)
            Text(title).font(.title3.weight(.semibold))
            Text(body).multilineTextAlignment(.center).foregroundStyle(.secondary)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    var form: some View {
        List {
            Section {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 14) {
                        ForEach(model.targets) { t in
                            TargetBubble(target: t, selected: model.selected == t) { model.selected = t }
                        }
                    }
                    .padding(.vertical, 6)
                }
                .listRowInsets(EdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12))
            } header: {
                Text("Send to")
            }
            Section {
                preview
                TextField(String(localized: "Add a note"), text: $model.note, axis: .vertical)
                    .lineLimit(1...4)
            } footer: {
                Text("Everyone you send to can report or block what you share.")
            }
            if let failure = model.failure {
                Section { Text(failure).foregroundStyle(.red) }
            }
        }
        .disabled(model.phase != .ready)
        .overlay {
            if model.phase == .sent {
                Label("Sent", systemImage: "checkmark.circle.fill")
                    .font(.title2.weight(.semibold))
                    .padding(20)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    @ViewBuilder
    var preview: some View {
        switch model.content {
        case .url(let u):
            Label(u.host() ?? u.absoluteString, systemImage: "link").lineLimit(1)
        case .text(let t):
            Text(t).lineLimit(4)
        case .image(let d):
            if let image = UIImage(data: d) {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 160).clipShape(RoundedRectangle(cornerRadius: 8))
            }
        case nil:
            Text("Nothing to share from here.").foregroundStyle(.secondary)
        }
    }
}

struct TargetBubble: View {
    let target: ShareTarget
    let selected: Bool
    let tap: () -> Void

    var body: some View {
        Button(action: tap) {
            VStack(spacing: 6) {
                ZStack(alignment: .bottomTrailing) {
                    if let data = ShareAvatar.png(initials: target.initials, seed: target.conversationId), let image = UIImage(data: data) {
                        Image(uiImage: image).resizable().frame(width: 56, height: 56)
                    }
                    if target.isGroup {
                        Image(systemName: target.kind == .family ? "house.fill" : "person.2.fill")
                            .font(.system(size: 11, weight: .bold))
                            .padding(4)
                            .background(Circle().fill(.background))
                    }
                }
                .overlay(Circle().stroke(selected ? Color.accentColor : .clear, lineWidth: 3).padding(-3))
                Text(target.name).font(.caption).lineLimit(2).multilineTextAlignment(.center).frame(width: 72)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(target.name)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
