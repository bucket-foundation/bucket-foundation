import BucketKit
import SwiftUI

struct CanonView: View {
    @Environment(Library.self) private var library
    @State private var query = Launch.value("-canonQuery") ?? ""
    @State private var hits: [CanonHit] = []
    @State private var error: String?
    @State private var searching = false

    var body: some View {
        NavigationStack {
            List {
                if let error {
                    Text(error).foregroundStyle(.red).listRowBackground(Palette.card)
                }
                ForEach(hits) { hit in
                    CanonRow(hit: hit).listRowBackground(Palette.card)
                }
            }
            .overlay {
                if searching {
                    ProgressView()
                } else if hits.isEmpty && error == nil {
                    ContentUnavailableView(
                        query.isEmpty ? "Search the canon" : "No results",
                        systemImage: "text.magnifyingglass",
                        description: Text(query.isEmpty ? "Foundations across seven branches: mathematics to mind." : "Try another word.")
                    )
                }
            }
            .paper()
            .navigationTitle("Canon")
            .searchable(text: $query, prompt: "entropy, symmetry, memory")
            .onSubmit(of: .search) { Task { await search() } }
            .task { if !query.isEmpty && hits.isEmpty { await search() } }
        }
    }

    func search() async {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        searching = true
        error = nil
        defer { searching = false }
        do {
            hits = try await library.api.canonSearch(q).results
        } catch {
            hits = []
            self.error = error.localizedDescription
        }
    }
}

struct CanonRow: View {
    let hit: CanonHit

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Eyebrow(text: hit.branch.replacingOccurrences(of: "-", with: " "))
                Spacer()
                if let n = hit.evidenceCount { Text("\(n) sources").font(.caption).foregroundStyle(Palette.muted) }
            }
            Text(hit.concept.capitalized).font(.serif(.headline)).foregroundStyle(Palette.ink)
            Text(hit.excerpt).font(.footnote).foregroundStyle(Palette.muted).lineLimit(4)
            if let url = hit.url {
                Link(destination: url) { Label("Open on bucket.foundation", systemImage: "arrow.up.right.square") }
                    .font(.footnote)
            }
        }
        .padding(.vertical, 6)
    }
}
