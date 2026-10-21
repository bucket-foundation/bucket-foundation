// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "BucketKit",
    platforms: [.iOS(.v26), .macOS(.v26), .tvOS(.v26), .watchOS(.v26), .visionOS(.v26)],
    products: [.library(name: "BucketKit", targets: ["BucketKit"])],
    targets: [
        .target(name: "BucketKit", swiftSettings: [.swiftLanguageMode(.v6)]),
        .testTarget(name: "BucketKitTests", dependencies: ["BucketKit"], resources: [.copy("Fixtures")]),
    ]
)
