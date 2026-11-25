package com.polingual.app

import kotlin.test.Test
import kotlin.test.assertEquals

class PickerRecentsTest {
    @Test
    fun aPickMovesToTheFrontWithoutDuplicatesAndKeepsSix() {
        val kv = mutableMapOf<String, String?>()
        val get = { k: String -> kv[k] }
        val set = { k: String, v: String? -> kv[k] = v }
        listOf("es", "fr", "de", "it", "pt", "ja", "ko").forEach { PickerRecents.push(it, get, set) }
        assertEquals(listOf("ko", "ja", "pt", "it", "de", "fr"), PickerRecents.read(get))
        PickerRecents.push("de", get, set)
        assertEquals(listOf("de", "ko", "ja", "pt", "it", "fr"), PickerRecents.read(get))
    }

    @Test
    fun recentLanguagesLeaveTheYoursList() {
        assertEquals(listOf("ja") to listOf("en", "es"), PickerRecents.groups(listOf("ja"), listOf("en", "es")))
        assertEquals(listOf("es") to listOf("en"), PickerRecents.groups(listOf("es"), listOf("en", "es")))
        assertEquals(emptyList<String>() to listOf("en"), PickerRecents.groups(emptyList(), listOf("en")))
    }

    @Test
    fun emptyStorageReadsEmpty() {
        assertEquals(emptyList(), PickerRecents.read { null })
        assertEquals(emptyList(), PickerRecents.read { "" })
    }
}
