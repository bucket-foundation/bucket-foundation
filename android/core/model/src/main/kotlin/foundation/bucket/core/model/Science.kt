package foundation.bucket.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DeckIndex(val version: String = "", val decks: List<DeckEntry>)

@Serializable
data class DeckEntry(val id: String, val file: String, val pill: String, val sub: String? = null, val kind: String? = null) {
    val title: String get() = pill.substringAfter(" · ", pill)
    val mark: String get() = if (" · " in pill) pill.substringBefore(" · ") else ""
    val isLanguage: Boolean get() = kind == "language"
}

@Serializable
data class DeckMeta(val branch: String = "", val title: String = "", val version: String? = null, val note: String? = null)

@Serializable
data class QuizItem(val level: String = "", val prompt: String, val answer: String, val eq: String? = null)

@Serializable
data class Atom(
    val id: String,
    val title: String,
    val type: String? = null,
    val requires: List<String> = emptyList(),
    val equation: String? = null,
    val summary: String = "",
    val depths: Map<String, String> = emptyMap(),
    val quiz: List<QuizItem> = emptyList(),
    val lesson: String? = null,
    val note: String? = null,
    val gloss: String? = null,
) {
    val orderedDepths: List<Pair<String, String>> get() = listOf("eli5", "core", "deep").mapNotNull { k -> depths[k]?.let { k to it } }
}

@Serializable
data class Deck(val meta: DeckMeta = DeckMeta(), val atoms: List<Atom> = emptyList())

@Serializable
data class CanonHit(
    @SerialName("claim_id") val claimId: Int,
    val branch: String = "",
    val concept: String = "",
    val title: String = "",
    val url: String? = null,
    val excerpt: String = "",
    @SerialName("evidence_count") val evidenceCount: Int? = null,
)

@Serializable
data class CanonSearch(val query: String = "", val results: List<CanonHit> = emptyList())
