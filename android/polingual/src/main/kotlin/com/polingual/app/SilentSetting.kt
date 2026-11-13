package com.polingual.app

import foundation.bucket.core.auth.KeyValue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class SilentSetting(private val kv: KeyValue) {
    private val state = MutableStateFlow(kv.get(KEY) == "1")
    val on: StateFlow<Boolean> = state

    fun set(value: Boolean) {
        state.value = value
        kv.set(KEY, if (value) "1" else null)
    }

    companion object {
        const val KEY = "polingual.silent"
    }
}
