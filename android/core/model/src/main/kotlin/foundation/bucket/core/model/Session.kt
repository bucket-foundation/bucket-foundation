package foundation.bucket.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Session(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_at") val expiresAt: Long,
    @SerialName("user_id") val userId: String? = null,
)

@Serializable
data class GuestTicket(val token: String, val userId: String, val expiresAt: String)

@Serializable
data class Profile(
    val handle: String? = null,
    val displayName: String? = null,
    val isPublic: Boolean? = null,
    val url: String? = null,
)

enum class AgeBand(val wire: String, val label: String) {
    Adult("18plus", "18 or older"),
    Teen("13to17", "13 to 17"),
    Child("under13", "Under 13"),
}
