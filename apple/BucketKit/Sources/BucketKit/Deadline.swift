import Foundation

public enum Deadline {
    @MainActor
    @discardableResult
    public static func run(_ seconds: Double, _ work: @escaping @MainActor () async -> Void) async -> Bool {
        let (stream, done) = AsyncStream<Bool>.makeStream()
        Task { @MainActor in
            await work()
            done.yield(true)
        }
        let timer = Task {
            try? await Task.sleep(for: .seconds(seconds))
            done.yield(false)
        }
        var it = stream.makeAsyncIterator()
        let finished = await it.next() ?? false
        timer.cancel()
        done.finish()
        return finished
    }
}
