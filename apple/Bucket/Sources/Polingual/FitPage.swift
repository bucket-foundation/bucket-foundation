import BucketKit
import SwiftUI

struct FitPage<Content: View>: View {
    @Environment(\.dynamicTypeSize) private var type
    var center = false
    @ViewBuilder let content: Content
    @State private var natural = 0.0

    var body: some View {
        if type.isAccessibilitySize {
            ScrollView { content }
                .scrollBounceBehavior(.basedOnSize)
                .scrollDismissesKeyboard(.interactively)
        } else {
            GeometryReader { box in
                content
                    .frame(width: box.size.width)
                    .fixedSize(horizontal: false, vertical: true)
                    .onGeometryChange(for: Double.self) { $0.size.height } action: { natural = $0 }
                    .scaleEffect(FitScale.scale(content: natural, available: box.size.height), anchor: center ? .center : .top)
                    .frame(width: box.size.width, height: box.size.height, alignment: center ? .center : .top)
            }
        }
    }
}
