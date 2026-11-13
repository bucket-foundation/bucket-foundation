package com.polingual.app

import android.content.Context
import foundation.bucket.core.auth.Account
import foundation.bucket.core.auth.GuestPass
import foundation.bucket.core.auth.LobbyStore
import foundation.bucket.core.auth.Stage
import foundation.bucket.core.data.AppState
import foundation.bucket.core.data.AppStore
import foundation.bucket.core.data.CorpusRepo
import foundation.bucket.core.data.KeystoreVault
import foundation.bucket.core.data.PrefsKeyValue
import foundation.bucket.core.data.SystemsSync
import foundation.bucket.core.model.LangSystem
import foundation.bucket.core.net.BucketApi
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import java.util.UUID

class Graph(val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val http = HttpClient(OkHttp) {
        install(HttpTimeout) { requestTimeoutMillis = 20_000; connectTimeoutMillis = 10_000 }
    }
    val api = BucketApi(http, BuildConfig.BUCKET_BASE, app = "polingual")
    val store = AppStore(context)
    val corpus = CorpusRepo(context)
    val account = Account(api, KeystoreVault(context))
    val kv = PrefsKeyValue(context)
    val state: StateFlow<AppState?> = store.state.stateIn(scope, SharingStarted.Eagerly, null)
    val guest = GuestPass(api, kv, nickname = { state.value?.nickname.orEmpty() })
    val lobbies = LobbyStore(api, userToken = { account.token() }, guest = guest)
    val voice = Voice(context)
    val radioApi = foundation.bucket.core.net.RadioApi(http) { host -> if (host != null) kv.set("content.radioServer", host); kv.get("content.radioServer") }
    val radio = Radio(context)
    val billing = Billing(context, this)

    private val syncLock = kotlinx.coroutines.sync.Mutex()

    init {
        scope.launch { billing.refresh() }
        scope.launch {
            account.restore()
            if (account.stage.value == Stage.SignedIn) syncSystems()
            var last = account.stage.value
            account.stage.collect { stage ->
                if (stage == Stage.SignedIn && last != Stage.SignedIn) {
                    store.update { it.copy(savePrompt = false) }
                    lobbies.mergeGuest()
                    syncSystems()
                }
                last = stage
            }
        }
        account.beforeSignOut = { force ->
            if (!force && !syncSystems()) throw foundation.bucket.core.model.BucketError.Server(0, "Your language sets did not reach the server. Connect and try again, or your changes on this device will be lost.")
            store.clearLocal()
        }
    }

    suspend fun createSystem(root: String, targets: List<String>): LangSystem {
        val now = System.currentTimeMillis().toDouble()
        val existing = store.current().systems.firstOrNull { it.root == root && it.targets.toSet() == targets.toSet() }
        val system = existing ?: LangSystem(UUID.randomUUID().toString().lowercase(), foundation.bucket.core.model.Lang.systemName(root, targets), root, targets, now, now)
        store.update { s -> s.copy(systems = if (existing == null) s.systems + system else s.systems, activeSystem = system.id) }
        scope.launch { syncSystems() }
        return system
    }

    suspend fun removeSystem(id: String) {
        store.update { s -> s.copy(systems = s.systems.filterNot { it.id == id }, removedSystems = s.removedSystems + (id to System.currentTimeMillis().toDouble()), activeSystem = if (s.activeSystem == id) null else s.activeSystem) }
        scope.launch { syncSystems() }
    }

    suspend fun syncSystems(): Boolean = syncLock.withLock {
        val t = account.token() ?: return@withLock false
        val branches = api.progressPull(t) ?: return@withLock false
        val remote = (branches[SystemsSync.BRANCH] as? JsonObject)?.get("data")
        val cur = store.current()
        val merged = SystemsSync.merge(remote, cur.systems, cur.removedSystems)
        val systems = SystemsSync.systems(merged)
        store.update { it.copy(systems = systems, activeSystem = it.activeSystem?.takeIf { id -> systems.any { s -> s.id == id } } ?: systems.firstOrNull()?.id) }
        if (merged != remote) api.progressPush(t, SystemsSync.BRANCH, merged) else true
    }
}
