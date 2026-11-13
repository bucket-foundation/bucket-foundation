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
        .map { p -> p[key]?.let { runCatching { json.decodeFromString(ScienceState.serializer(), it) }.getOrNull() } ?: ScienceState() }
        .stateIn(scope, SharingStarted.Eagerly, ScienceState())

    init {
        scope.launch { account.restore() }
        account.beforeSignOut = { context.bucketStore.edit { it.remove(key) } }
    }

    suspend fun saveScience(state: ScienceState) { context.bucketStore.edit { it[key] = json.encodeToString(ScienceState.serializer(), state) } }

    suspend fun index(): List<DeckEntry> = cached("index.json", { api.deckIndex() }, foundation.bucket.core.model.DeckIndex.serializer()).decks.filter { !it.isLanguage }

    suspend fun deck(entry: DeckEntry): Deck = lock.withLock {
        decks[entry.id] ?: cached("${entry.id}.json", { api.deck(entry) }, Deck.serializer()).also { decks = decks + (entry.id to it) }
    }

    suspend fun allDecks(): Map<String, Deck> = index().associate { it.id to deck(it) }

    private suspend fun <T> cached(name: String, fetch: suspend () -> T, serializer: kotlinx.serialization.KSerializer<T>): T {
        val file = File(cacheDir, name)
        return try {
            fetch().also { runCatching { file.writeText(json.encodeToString(serializer, it)) } }
        } catch (e: foundation.bucket.core.model.BucketError) {
            if (file.exists()) json.decodeFromString(serializer, file.readText()) else throw e
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
