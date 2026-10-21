import Foundation

public struct JSObject: Sendable, Equatable {
    public private(set) var keys: [String] = []
    private var store: [String: JSValue] = [:]

    public init() {}

    public init(_ pairs: [(String, JSValue)]) {
        for (k, v) in pairs { self[k] = v }
    }

    public subscript(key: String) -> JSValue? {
        get { store[key] }
        set {
            if let newValue {
                if store.updateValue(newValue, forKey: key) == nil { insertKey(key) }
            } else if store.removeValue(forKey: key) != nil {
                keys.removeAll { $0 == key }
            }
        }
    }

    public var entries: [(key: String, value: JSValue)] { keys.map { ($0, store[$0]!) } }
    public var values: [JSValue] { keys.map { store[$0]! } }
    public var isEmpty: Bool { keys.isEmpty }
    public var count: Int { keys.count }

    static func arrayIndex(_ key: String) -> UInt32? {
        guard let n = UInt32(key), n != UInt32.max, String(n) == key else { return nil }
        return n
    }

    private mutating func insertKey(_ key: String) {
        guard let n = Self.arrayIndex(key) else {
            keys.append(key)
            return
        }
        var lo = 0
        var hi = keys.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if let m = Self.arrayIndex(keys[mid]), m < n { lo = mid + 1 } else { hi = mid }
        }
        keys.insert(key, at: lo)
    }
}

public indirect enum JSValue: Sendable, Equatable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSValue])
    case object(JSObject)

    public subscript(key: String) -> JSValue? {
        if case .object(let o) = self { return o[key] }
        return nil
    }

    public var object: JSObject? { if case .object(let o) = self { return o }; return nil }
    public var array: [JSValue]? { if case .array(let a) = self { return a }; return nil }
    public var string: String? { if case .string(let s) = self { return s }; return nil }
    public var number: Double? { if case .number(let n) = self { return n }; return nil }
    public var bool: Bool? { if case .bool(let b) = self { return b }; return nil }

    public var truthy: Bool {
        switch self {
        case .null: false
        case .bool(let b): b
        case .number(let n): n != 0 && !n.isNaN
        case .string(let s): !s.isEmpty
        case .array, .object: true
        }
    }

    public var nonEmptyString: String? {
        if case .string(let s) = self, !s.isEmpty { return s }
        return nil
    }

    public var stringArray: [String]? { array?.compactMap(\.string) }
}

public enum JSONError: Error, Equatable {
    case unexpected(Int)
}

public enum JSON {
    public static func parse(_ data: Data) throws -> JSValue {
        var p = Parser(bytes: [UInt8](data))
        p.skip()
        let v = try p.value()
        p.skip()
        guard p.i == p.bytes.count else { throw JSONError.unexpected(p.i) }
        return v
    }

    public static func parse(_ text: String) throws -> JSValue { try parse(Data(text.utf8)) }

    public static func stringify(_ v: JSValue) -> String {
        var out = ""
        write(v, &out)
        return out
    }

    public static func data(_ v: JSValue) -> Data { Data(stringify(v).utf8) }

    static func write(_ v: JSValue, _ out: inout String) {
        switch v {
        case .null: out += "null"
        case .bool(let b): out += b ? "true" : "false"
        case .number(let n): out += number(n)
        case .string(let s): quote(s, &out)
        case .array(let a):
            out += "["
            for (i, x) in a.enumerated() {
                if i > 0 { out += "," }
                write(x, &out)
            }
            out += "]"
        case .object(let o):
            out += "{"
            for (i, e) in o.entries.enumerated() {
                if i > 0 { out += "," }
                quote(e.key, &out)
                out += ":"
                write(e.value, &out)
            }
            out += "}"
        }
    }

    public static func number(_ n: Double) -> String {
        guard n.isFinite else { return "null" }
        if n == n.rounded(), abs(n) < 1e21 { return String(format: "%.0f", n) }
        return "\(n)"
    }

    static func quote(_ s: String, _ out: inout String) {
        out += "\""
        for u in s.unicodeScalars {
            switch u {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            case _ where u.value < 0x20: out += String(format: "\\u%04x", u.value)
            default: out.unicodeScalars.append(u)
            }
        }
        out += "\""
    }

    struct Parser {
        let bytes: [UInt8]
        var i = 0

        mutating func skip() {
            while i < bytes.count, [0x20, 0x0A, 0x0D, 0x09].contains(bytes[i]) { i += 1 }
        }

        mutating func value() throws -> JSValue {
            guard i < bytes.count else { throw JSONError.unexpected(i) }
            switch bytes[i] {
            case UInt8(ascii: "{"): return try object()
            case UInt8(ascii: "["): return try array()
            case UInt8(ascii: "\""): return .string(try string())
            case UInt8(ascii: "t"): try literal("true"); return .bool(true)
            case UInt8(ascii: "f"): try literal("false"); return .bool(false)
            case UInt8(ascii: "n"): try literal("null"); return .null
            default: return .number(try number())
            }
        }

        mutating func literal(_ word: String) throws {
            let w = Array(word.utf8)
            guard i + w.count <= bytes.count, Array(bytes[i..<i + w.count]) == w else { throw JSONError.unexpected(i) }
            i += w.count
        }

        mutating func object() throws -> JSValue {
            i += 1
            var o = JSObject()
            skip()
            if i < bytes.count, bytes[i] == UInt8(ascii: "}") { i += 1; return .object(o) }
            while true {
                skip()
                guard i < bytes.count, bytes[i] == UInt8(ascii: "\"") else { throw JSONError.unexpected(i) }
                let k = try string()
                skip()
                guard i < bytes.count, bytes[i] == UInt8(ascii: ":") else { throw JSONError.unexpected(i) }
                i += 1
                skip()
                o[k] = try value()
                skip()
                guard i < bytes.count else { throw JSONError.unexpected(i) }
                if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
                if bytes[i] == UInt8(ascii: "}") { i += 1; return .object(o) }
                throw JSONError.unexpected(i)
            }
        }

        mutating func array() throws -> JSValue {
            i += 1
            var a: [JSValue] = []
            skip()
            if i < bytes.count, bytes[i] == UInt8(ascii: "]") { i += 1; return .array(a) }
            while true {
                skip()
                a.append(try value())
                skip()
                guard i < bytes.count else { throw JSONError.unexpected(i) }
                if bytes[i] == UInt8(ascii: ",") { i += 1; continue }
                if bytes[i] == UInt8(ascii: "]") { i += 1; return .array(a) }
                throw JSONError.unexpected(i)
            }
        }

        mutating func hex4() throws -> UInt16 {
            guard i + 4 <= bytes.count, let v = UInt16(String(decoding: bytes[i..<i + 4], as: UTF8.self), radix: 16) else { throw JSONError.unexpected(i) }
            i += 4
            return v
        }

        mutating func string() throws -> String {
            i += 1
            var units: [UInt16] = []
            var run = i
            func flush(_ end: Int) { units.append(contentsOf: String(decoding: bytes[run..<end], as: UTF8.self).utf16) }
            while i < bytes.count {
                let b = bytes[i]
                if b == UInt8(ascii: "\"") {
                    flush(i)
                    i += 1
                    return String(decoding: units, as: UTF16.self)
                }
                if b == UInt8(ascii: "\\") {
                    flush(i)
                    i += 1
                    guard i < bytes.count else { break }
                    let e = bytes[i]
                    i += 1
                    switch e {
                    case UInt8(ascii: "n"): units.append(0x0A)
                    case UInt8(ascii: "t"): units.append(0x09)
                    case UInt8(ascii: "r"): units.append(0x0D)
                    case UInt8(ascii: "b"): units.append(0x08)
                    case UInt8(ascii: "f"): units.append(0x0C)
                    case UInt8(ascii: "u"): units.append(try hex4())
                    default: units.append(UInt16(e))
                    }
                    run = i
                    continue
                }
                i += 1
            }
            throw JSONError.unexpected(i)
        }

        mutating func number() throws -> Double {
            let start = i
            while i < bytes.count, "+-0123456789.eE".utf8.contains(bytes[i]) { i += 1 }
            guard let d = Double(String(decoding: bytes[start..<i], as: UTF8.self)) else { throw JSONError.unexpected(start) }
            return d
        }
    }
}
