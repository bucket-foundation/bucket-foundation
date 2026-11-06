import Foundation
import Testing
@testable import BucketKit

enum Footprint {
    static func read() -> (now: UInt64, peak: UInt64) {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let kr = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count) }
        }
        guard kr == KERN_SUCCESS else { return (0, 0) }
        return (info.phys_footprint, UInt64(max(0, info.ledger_phys_footprint_peak)))
    }
}

@Test(.enabled(if: ProcessInfo.processInfo.environment["LEXICON_BENCH"] != nil))
func lexiconLoadBench() throws {
    let dir = TranslateEval.apple.appending(path: "Shared/Corpus/lexicon")
    let shelf = LexiconShelf(capacity: 4, load: LexiconShelf.directory(dir))
    var lines: [String] = []
    let start = Footprint.read()
    for lang in ["es", "ru", "ja", "ar", "zh", "fi"] {
        let t0 = Date()
        let lex = try #require(shelf.lexicon(lang))
        let ms = Date().timeIntervalSince(t0) * 1000
        _ = lex.lookup("a")
        let f = Footprint.read()
        lines.append(String(format: "%@ entries=%d load_ms=%.1f footprint_mb=%.1f peak_mb=%.1f", lang, lex.count, ms, Double(f.now) / 1_048_576, Double(f.peak) / 1_048_576))
    }
    let end = Footprint.read()
    lines.append(String(format: "start_mb=%.1f end_mb=%.1f peak_mb=%.1f", Double(start.now) / 1_048_576, Double(end.now) / 1_048_576, Double(end.peak) / 1_048_576))
    print("LEXICON_BENCH\n" + lines.joined(separator: "\n"))
}
