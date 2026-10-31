import BucketKit
import SwiftUI

struct FitPage<Content: View>: View {
    @Environment(\.dynamicTypeSize) private var type
    var center = false
    @ViewBuilder let content: Content
    @State private var natural = 0.0

    var body: some View {
        GeometryReader { box in
            let height = box.size.height
            let scale = type.isAccessibilitySize ? 1 : FitScale.scale(content: natural, available: height)
            ScrollView {
                content
                    .frame(width: box.size.width)
                    .fixedSize(horizontal: false, vertical: true)
                    .onGeometryChange(for: Double.self) { $0.size.height } action: { natural = $0 }
                    .scaleEffect(scale, anchor: center ? .center : .top)
                    .frame(width: box.size.width, height: max(height, natural * scale), alignment: center ? .center : .top)
                    .opacity(natural > 0 ? 1 : 0)
            }
            .scrollDisabled(!FitScale.overflows(content: natural, available: height, scale: scale))
            .scrollBounceBehavior(.basedOnSize)
            .scrollDismissesKeyboard(.interactively)
        }
    }
}
