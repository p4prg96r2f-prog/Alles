// swift-tools-version: 5.9
import PackageDescription

// WerkeKern ist der plattformunabhängige Rechenkern der WERK.E App.
// Er enthält keinerlei Oberflächen- oder Apple-spezifischen Code und lässt sich
// deshalb auf jedem System bauen und testen – auch außerhalb von Xcode.
let package = Package(
    name: "WerkeKern",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "WerkeKern", targets: ["WerkeKern"])
    ],
    targets: [
        .target(
            name: "WerkeKern",
            resources: [.process("Ressourcen")]
        ),
        .testTarget(
            name: "WerkeKernTests",
            dependencies: ["WerkeKern"]
        )
    ]
)
