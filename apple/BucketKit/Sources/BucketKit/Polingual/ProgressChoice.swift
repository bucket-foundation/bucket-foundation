import Foundation
import Observation

@MainActor
@Observable
public final class ProgressChoice {
    public static let shared = ProgressChoice()

    public struct Ask: Equatable, Sendable {
        public let device: Int
        public let account: Int
    }

    public private(set) var ask: Ask?
    public private(set) var inFlight = false
    @ObservationIgnored private var answer: CheckedContinuation<ProgressKeep?, Never>?
    @ObservationIgnored private var round = 0

    public init() {}

    @discardableResult
    public func signedIn(_ store: LangStore, account: String) -> Task<Void, Never> {
        let device = store.deviceCards(account: account)
        round += 1
        let mine = round
        inFlight = true
        return Task {
            let keep = await decide(store, device: device)
            guard round == mine, let keep else { return }
            await store.syncAfterSignIn(account: account, keep: keep)
            if round == mine { inFlight = false }
        }
    }

    public func resync(_ store: LangStore, account: String) async {
        guard !inFlight else { return }
        await store.syncAfterSignIn(account: account)
    }

    func decide(_ store: LangStore, device: Int) async -> ProgressKeep? {
        let mine = round
        guard device > 0, answer == nil else { return .both }
        guard let held = await store.accountCards(), held > 0 else { return round == mine ? .both : nil }
        guard round == mine else { return nil }
        return await withCheckedContinuation { c in
            answer = c
            ask = Ask(device: device, account: held)
        }
    }

    public func choose(_ keep: ProgressKeep) {
        ask = nil
        answer?.resume(returning: keep)
        answer = nil
    }

    public func cancel() {
        round += 1
        inFlight = false
        ask = nil
        answer?.resume(returning: nil)
        answer = nil
    }
}
