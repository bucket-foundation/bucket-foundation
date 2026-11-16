package foundation.bucket.app

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import foundation.bucket.core.auth.Account
import foundation.bucket.core.data.KeystoreVault
import foundation.bucket.core.model.Deck
import foundation.bucket.core.model.DeckEntry
import foundation.bucket.core.net.BucketApi
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import java.io.File

val Context.bucketStore: DataStore<Preferences> by preferencesDataStore("bucket")

class Graph(private val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val http = HttpClient(OkHttp) { install(HttpTimeout) { requestTimeoutMillis = 20_000 } }
    val api = BucketApi(http, BuildConfig.BUCKET_BASE, app = "bucket")
    val account = Account(api, KeystoreVault(context, alias = "bucket.session"))
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val key = stringPreferencesKey("science")
    private val cacheDir = File(context.cacheDir, "decks").apply { mkdirs() }
    private val lock = Mutex()
    private var decks: Map<String, Deck> = emptyMap()

    val science: StateFlow<ScienceState> = context.bucketStore.data
        .map { p -> decode(p[key]) ?: ScienceState() }
        .stateIn(scope, SharingStarted.Eagerly, ScienceState())

    init {
        scope.launch { account.restore() }
        account.beforeSignOut = { }
    }

    private fun decode(raw: String?): ScienceState? = raw?.let { runCatching { json.decodeFromString(ScienceState.serializer(), it) }.getOrNull() }

    suspend fun updateScience(change: (ScienceState) -> ScienceState) {
        context.bucketStore.edit { p ->
            val raw = p[key]
            val cur = decode(raw) ?: ScienceState().also { if (raw != null) p[stringPreferencesKey("science.corrupt")] = raw }
            p[key] = json.encodeToString(ScienceState.serializer(), change(cur))
        }
    }

    suspend fun deleteAccount() {
        account.deleteAccount()
        context.bucketStore.edit { it.remove(key) }
        cacheDir.listFiles()?.forEach { it.delete() }
        indexMemo = null
    }

    private var indexMemo: List<DeckEntry>? = null

    suspend fun index(): List<DeckEntry> = indexMemo ?: cached("index.json", { api.deckIndex() }, foundation.bucket.core.model.DeckIndex.serializer()).decks.filter { !it.isLanguage }.also { indexMemo = it }

    suspend fun deck(entry: DeckEntry): Deck {
        lock.withLock { decks[entry.id] }?.let { return it }
        val d = cached(DeckFiles.name(entry.id), { api.deck(entry) }, Deck.serializer())
        lock.withLock { decks = decks + (entry.id to d) }
        return d
    }

    suspend fun allDecks(): Map<String, Deck> = kotlinx.coroutines.coroutineScope {
        val entries = index()
        val loaded = entries.map { e -> async { e.id to runCatching { deck(e) }.getOrNull() } }.awaitAll().mapNotNull { (id, d) -> d?.let { id to it } }.toMap()
        if (loaded.isEmpty() && entries.isNotEmpty()) throw foundation.bucket.core.model.BucketError.Offline
        loaded
    }

    private suspend fun <T> cached(name: String, fetch: suspend () -> T, serializer: kotlinx.serialization.KSerializer<T>): T {
        val file = File(cacheDir, name)
        return try {
            fetch().also { runCatching { file.writeText(json.encodeToString(serializer, it)) } }
        } catch (e: foundation.bucket.core.model.BucketError) {
            val saved = if (file.exists()) runCatching { json.decodeFromString(serializer, file.readText()) }.onFailure { file.delete() }.getOrNull() else null
            saved ?: throw e
        }
    }

    suspend fun current(): ScienceState = science.first()
}

class BucketApplication : android.app.Application() {
    lateinit var graph: Graph
        private set

    override fun onCreate() {
        super.onCreate()
        graph = Graph(this)
    }
}

object DeckFiles {
    fun name(id: String): String = "deck-" + id.filter { it.isLetterOrDigit() || it == '-' || it == '_' }.take(80) + "-" + Integer.toHexString(id.hashCode()) + ".json"
}
