package foundation.bucket.core.model

import kotlinx.serialization.Serializable

@Serializable
data class LangSystem(
    val id: String,
    val name: String,
    val root: String,
    val targets: List<String>,
    val createdAt: Double,
    val updatedAt: Double? = null,
    val placement: Map<String, Double> = emptyMap(),
)

enum class SystemError(val message: String) {
    NoTargets("Pick at least one language to learn."),
    TooMany("Pick at most ${Lang.MAX_TARGETS} languages."),
    UnknownLanguage("That language is not available yet."),
    RootInTargets("Your own language cannot also be a target."),
}

fun validateSystem(root: String, targets: List<String>): SystemError? = when {
    targets.isEmpty() -> SystemError.NoTargets
    targets.size > Lang.MAX_TARGETS -> SystemError.TooMany
    (targets + root).any { it !in Lang.info } -> SystemError.UnknownLanguage
    root in targets -> SystemError.RootInTargets
    else -> null
}
