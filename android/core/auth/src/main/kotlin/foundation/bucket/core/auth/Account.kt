package foundation.bucket.core.auth

import foundation.bucket.core.model.BucketError
import foundation.bucket.core.model.Session
import foundation.bucket.core.net.BucketApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

interface SessionVault {
    suspend fun load(): Session?
    suspend fun save(session: Session?)
}

class MemoryVault(private var value: Session? = null) : SessionVault {
    override suspend fun load() = value
    override suspend fun save(session: Session?) { value = session }
}

enum class Stage { Loading, SignedOut, CodeSent, SignedIn }

class Account(
    private val api: BucketApi,
    private val vault: SessionVault,
    private val nowSeconds: () -> Long = { System.currentTimeMillis() / 1000 },
) {
    private val lock = Mutex()
    private var session: Session? = null
    private val _stage = MutableStateFlow(Stage.Loading)
    val stage: StateFlow<Stage> = _stage
    var email: String = ""
        private set
    val userId: String? get() = session?.userId
    var beforeSignOut: (suspend () -> Unit)? = null

    suspend fun restore() {
        session = vault.load()
        _stage.value = if (session != null) Stage.SignedIn else Stage.SignedOut
    }

    suspend fun requestCode(address: String) {
        val trimmed = address.trim()
        api.requestCode(trimmed)
        email = trimmed
        _stage.value = Stage.CodeSent
    }

    suspend fun verify(code: String) {
        val s = api.verify(email, code.trim())
        lock.withLock {
            session = s
            vault.save(s)
        }
        _stage.value = Stage.SignedIn
    }

    fun editEmail() {
        if (_stage.value == Stage.CodeSent) _stage.value = Stage.SignedOut
    }

    suspend fun token(): String? = lock.withLock {
        val s = session ?: return@withLock null
        if (s.expiresAt - nowSeconds() > REFRESH_EARLY_SECONDS) return@withLock s.accessToken
        try {
            val fresh = api.refresh(s)
            session = fresh
            vault.save(fresh)
            fresh.accessToken
        } catch (e: BucketError.Revoked) {
            session = null
            vault.save(null)
            _stage.value = Stage.SignedOut
            null
        } catch (e: BucketError) {
            s.accessToken
        }
    }

    suspend fun signOut() {
        beforeSignOut?.invoke()
        lock.withLock {
            session = null
            vault.save(null)
        }
        _stage.value = Stage.SignedOut
    }

    suspend fun deleteAccount() {
        val t = token() ?: throw BucketError.Revoked
        api.deleteAccount(t)
        lock.withLock {
            session = null
            vault.save(null)
        }
        _stage.value = Stage.SignedOut
    }

    companion object {
        const val REFRESH_EARLY_SECONDS = 60L
    }
}
