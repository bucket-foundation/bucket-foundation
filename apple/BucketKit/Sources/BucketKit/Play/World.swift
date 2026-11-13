import Foundation

public enum World {
    public static let mapW = 720.0
    public static let mapH = 360.0

    public struct Transform: Sendable, Equatable {
        public let scale: (Double, Double)
        public let translate: (Double, Double)

        public init(scale: (Double, Double), translate: (Double, Double)) {
            self.scale = scale
            self.translate = translate
        }

        public static func == (a: Transform, b: Transform) -> Bool { a.scale == b.scale && a.translate == b.translate }
    }

    public enum Geometry: Sendable, Equatable {
        case polygon([[Int]])
        case multiPolygon([[[Int]]])
    }

    public struct Topology: Sendable, Equatable {
        public let transform: Transform
        public let arcs: [[[Int]]]
        public let objects: [String: [Geometry]]

        public init(transform: Transform, arcs: [[[Int]]], objects: [String: [Geometry]]) {
            self.transform = transform
            self.arcs = arcs
            self.objects = objects
        }
    }

    public static func project(lon: Double, lat: Double) -> (x: Double, y: Double) { ((lon + 180) / 360 * mapW, (90 - lat) / 180 * mapH) }

    public static func unproject(x: Double, y: Double) -> (lat: Double, lon: Double) { (90 - y / mapH * 180, x / mapW * 360 - 180) }

    public static func decodeArcs(_ topo: Topology) -> [[(Double, Double)]] {
        let (sx, sy) = topo.transform.scale
        let (tx, ty) = topo.transform.translate
        return topo.arcs.map { arc in
            var x = 0, y = 0
            return arc.map { d in
                x += d[0]
                y += d[1]
                return (Double(x) * sx + tx, Double(y) * sy + ty)
            }
        }
    }

    static func ring(_ arcs: [[(Double, Double)]], _ indices: [Int]) -> [(Double, Double)] {
        var out: [(Double, Double)] = []
        for i in indices {
            let a = i < 0 ? Array(arcs[~i].reversed()) : arcs[i]
            out += out.isEmpty ? a : Array(a.dropFirst())
        }
        return out
    }

    static func fixed1(_ v: Double) -> String { String(format: "%.1f", v) }

    public static func landPath(_ topo: Topology, name: String = "land") -> String {
        let arcs = decodeArcs(topo)
        var parts: [String] = []
        for g in topo.objects[name] ?? [] {
            let polygons: [[[Int]]] = switch g {
            case let .polygon(p): [p]
            case let .multiPolygon(m): m
            }
            for poly in polygons {
                for r in poly {
                    let pts = ring(arcs, r).map { project(lon: $0.0, lat: $0.1) }
                    if pts.count < 3 { continue }
                    var d = ""
                    var prev: (x: Double, y: Double)?
                    for p in pts {
                        let jump = prev.map { abs(p.x - $0.x) > mapW / 2 } ?? false
                        d += "\(prev == nil || jump ? "M" : "L")\(fixed1(p.x)) \(fixed1(p.y))"
                        prev = p
                    }
                    parts.append(d + "Z")
                }
            }
        }
        return parts.joined()
    }
}
