package foundation.bucket.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import foundation.bucket.core.engine.StudyState
import foundation.bucket.core.model.LangSystem
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val Context.dataStore: DataStore<Preferences> by preferencesDataStore("polingual")

@Serializable
data class AppState(
    val onboarded: Boolean = false,
    val systems: List<LangSystem> = emptyList(),
    val activeSystem: String? = null,
    val study: Map<String, StudyState> = emptyMap(),
    val nickname: String = "",
    val recents: List<String> = emptyList(),
    val translateFrom: String? = null,
    val translateTo: String? = null,
    val played: Map<String, String> = emptyMap(),
    val removedSystems: Map<String, Double> = emptyMap(),
    val savePrompt: Boolean = false,
    val adsConsent: Boolean = false,
) {
    val system: LangSystem? get() = systems.firstOrNull { it.id == activeSystem } ?: systems.firstOrNull()
}

class AppStore(private val context: Context) {
    private val key = stringPreferencesKey("app")
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    val state: Flow<AppState> = context.dataStore.data.map { p -> p[key]?.let { runCatching { json.decodeFromString(AppState.serializer(), it) }.getOrNull() } ?: AppState() }

    suspend fun current(): AppState = state.first()

    suspend fun update(change: (AppState) -> AppState) {
        context.dataStore.edit { p ->
            val cur = p[key]?.let { runCatching { json.decodeFromString(AppState.serializer(), it) }.getOrNull() } ?: AppState()
            p[key] = json.encodeToString(AppState.serializer(), change(cur))
        }
    }

    suspend fun clearLocal() = update { AppState(onboarded = it.onboarded, nickname = it.nickname) }
}
