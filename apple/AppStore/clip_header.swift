import SwiftUI
import AppKit

struct Header: View {
    let tiles: [(String, Color)] = [("nuit", Color(red: 0.0, green: 0.14, blue: 0.58)), ("noche", Color(red: 0.78, green: 0.06, blue: 0.18)), ("notte", Color(red: 0.0, green: 0.55, blue: 0.27)), ("Nacht", Color(red: 0.1, green: 0.1, blue: 0.1))]
    var body: some View {
        VStack(alignment: .leading, spacing: 40) {
            Text("BUCKET").font(.system(size: 54, weight: .bold, design: .monospaced)).tracking(10).foregroundStyle(Color(red: 0.54, green: 0.43, blue: 0.18))
            Text("One word,\nevery language").font(.system(size: 150, weight: .heavy, design: .rounded)).foregroundStyle(Color(red: 0.14, green: 0.12, blue: 0.13)).lineSpacing(-10)
            HStack(spacing: 30) {
                ForEach(tiles, id: \.0) { t in
                    Text(t.0).font(.system(size: 70, weight: .heavy, design: .rounded)).foregroundStyle(.white)
                        .padding(.horizontal, 44).padding(.vertical, 26)
                        .background(t.1, in: .rect(cornerRadius: 36))
                }
            }
        }
        .padding(110)
        .frame(width: 1800, height: 1200, alignment: .leading)
        .background(Color(red: 0.965, green: 0.933, blue: 0.863))
    }
}

let path = CommandLine.arguments[1]
MainActor.assumeIsolated {
    let r = ImageRenderer(content: Header())
    r.scale = 1
    let img = r.cgImage!
    let rep = NSBitmapImageRep(cgImage: img)
    try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
}
