// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "BucketKit",
    platforms: [.iOS(.v26), .macOS(.v26), .tvOS(.v26), .watchOS(.v26), .visionOS(.v26)],
    products: [.library(name: "BucketKit", targets: ["BucketKit"])],
    targets: [
        .target(name: "BucketKit", resources: [.copy("PL/Resources/Art"), .copy("PL/Resources/Fonts")], swiftSettings: [.swiftLanguageMode(.v6)]),
        .testTarget(name: "BucketKitTests", dependencies: ["BucketKit"], resources: [.copy("Fixtures")]),
    ]
)
