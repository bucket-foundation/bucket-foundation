package foundation.bucket.core.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import foundation.bucket.core.auth.KeyValue
import foundation.bucket.core.auth.SessionVault
import foundation.bucket.core.model.Session
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class KeystoreVault(private val context: Context, private val alias: String = "polingual.session") : SessionVault {
    private val key = stringPreferencesKey("session")

    private fun secret(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        return gen.generateKey()
    }

    override suspend fun load(): Session? {
        val stored = context.dataStore.data.first()[key] ?: return null
        return runCatching {
            val raw = Base64.decode(stored, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secret(), GCMParameterSpec(128, raw, 0, 12))
            Json.decodeFromString(Session.serializer(), String(cipher.doFinal(raw, 12, raw.size - 12)))
        }.onFailure { android.util.Log.w("KeystoreVault", "stored session unreadable, signing out", it) }.getOrNull()
    }

    override suspend fun save(session: Session?) = try {
        write(session)
    } catch (e: Exception) {
        if (e is kotlinx.coroutines.CancellationException) throw e
        throw foundation.bucket.core.model.BucketError.Server(0, "This device could not store your session. Try again.")
    }

    private suspend fun write(session: Session?) {
        context.dataStore.edit { prefs ->
            if (session == null) prefs.remove(key) else {
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, secret())
                val body = cipher.doFinal(Json.encodeToString(Session.serializer(), session).toByteArray())
                prefs[key] = Base64.encodeToString(cipher.iv + body, Base64.NO_WRAP)
            }
        }
    }
}

class PrefsKeyValue(context: Context) : KeyValue {
    private val prefs = context.getSharedPreferences("polingual", Context.MODE_PRIVATE)
    override fun get(key: String): String? = prefs.getString(key, null)
    override fun set(key: String, value: String?) { prefs.edit().apply { if (value == null) remove(key) else putString(key, value) }.apply() }
}
