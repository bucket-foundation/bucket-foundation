plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}
kotlin { jvmToolchain(21) }
dependencies {
    api(project(":core:model"))
    api(libs.ktor.core)
    api(libs.coroutines.core)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.ktor.mock)
    testImplementation(libs.coroutines.test)
}
