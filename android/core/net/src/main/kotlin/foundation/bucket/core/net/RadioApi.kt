package foundation.bucket.core.net

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Lang
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.statement.bodyAsText
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class RadioStation(
    val stationuuid: String,
    val name: String,
    @SerialName("url_resolved") val urlResolved: String = "",
    val country: String = "",
    val countrycode: String = "",
    val tags: String = "",
    val favicon: String = "",
    val votes: Int = 0,
) {
    val stream: String? get() = urlResolved.takeIf { it.startsWith("https://") && it.length > 8 }
}

@Serializable
private data class RadioServer(val name: String)

class RadioApi(private val client: HttpClient, private val remember: (String?) -> String? = { null }) {
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    suspend fun hosts(): List<String> {
        val out = mutableListOf<String>()
        remember(null)?.let(out::add)
        runCatching {
            json.decodeFromString<List<RadioServer>>(client.get("https://all.api.radio-browser.info/json/servers") { header("user-agent", AGENT) }.bodyAsText())
        }.getOrNull()?.map { it.name }?.filter { it.endsWith(".api.radio-browser.info") }?.sorted()?.let(out::addAll)
        out += FALLBACK
        return out.distinct()
    }

    suspend fun stations(lang: String, limit: Int = 25): List<RadioStation> {
        val name = radioName(lang) ?: return emptyList()
        var last: Exception = BucketError.Unavailable
        for (host in hosts()) {
            try {
                val response = client.get("https://$host/json/stations/search") {
                    header("user-agent", AGENT)
                    parameter("language", name); parameter("hidebroken", "true"); parameter("is_https", "true")
                    parameter("order", "clickcount"); parameter("reverse", "true"); parameter("limit", (limit * 2).toString())
                }
                if (response.status.value !in 200..299) throw BucketError.Server(response.status.value, null)
                val all = json.decodeFromString<List<RadioStation>>(response.bodyAsText()).map { it.copy(name = it.name.trim()) }
                remember(host)
                return filter(all, limit)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                last = e
            }
        }
        throw if (last is BucketError) last else BucketError.Offline
    }

    companion object {
        const val AGENT = "Polingual/1.0 (https://www.bucket.foundation)"
        const val MIN_VOTES = 10
        val FALLBACK = listOf("de1.api.radio-browser.info", "fi1.api.radio-browser.info", "de2.api.radio-browser.info", "nl1.api.radio-browser.info")
        private val names = mapOf("zh" to "chinese", "grc" to "", "ang" to "", "sa" to "sanskrit", "fa" to "persian", "el" to "greek")

        fun radioName(lang: String): String? = if (lang in names) names.getValue(lang).ifEmpty { null } else Lang.info[lang]?.name?.lowercase()

        fun filter(all: List<RadioStation>, limit: Int): List<RadioStation> {
            val seen = mutableSetOf<String>()
            return all.filter { it.stream != null && it.votes >= MIN_VOTES && it.name.isNotEmpty() && seen.add(it.name.lowercase()) }.take(limit)
        }
    }
}
