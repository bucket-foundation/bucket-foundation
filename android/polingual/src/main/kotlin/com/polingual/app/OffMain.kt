package com.polingual.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

suspend fun <T> offMain(block: () -> T): T = withContext(Dispatchers.Default) { block() }
